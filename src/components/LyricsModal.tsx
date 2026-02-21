import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, FlatList, Dimensions, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProgress } from 'react-native-track-player';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../hooks/useLocalMusic';
import { useTheme } from '../hooks/ThemeContext';
import { usePlayerContext } from '../hooks/PlayerContext';
import { MusicImage } from './MusicImage';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LyricsModalProps {
    visible: boolean;
    onClose: () => void;
    song: Song | null;
}

interface LyricLine {
    time: number; // milliseconds
    text: string;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
    visible,
    onClose,
    song
}) => {
    const { theme } = useTheme();
    const { isPlaying } = usePlayerContext();
    const { position: positionSeconds } = useProgress(200);
    const position = positionSeconds * 1000;
    const [syncedLyrics, setSyncedLyrics] = useState<LyricLine[]>([]);
    const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(-1);
    const flatListRef = useRef<FlatList>(null);

    const parseLRC = (lrc: string): LyricLine[] => {
        const lines = lrc.split('\n');
        const lyricLines: LyricLine[] = [];
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

        lines.forEach(line => {
            const match = timeRegex.exec(line);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const ms = parseInt(match[3].padEnd(3, '0'));
                const time = minutes * 60000 + seconds * 1000 + ms;
                const text = line.replace(timeRegex, '').trim();
                if (text) lyricLines.push({ time, text });
            }
        });

        return lyricLines.sort((a, b) => a.time - b.time);
    };

    useEffect(() => {
        if (visible && song) {
            fetchLyrics();
        } else {
            setSyncedLyrics([]);
            setPlainLyrics(null);
            setActiveIndex(-1);
        }
    }, [visible, song]);

    const fetchLyrics = async () => {
        if (!song) return;

        setLoading(true);
        setError(null);
        setSyncedLyrics([]);
        setPlainLyrics(null);

        try {
            const cacheKey = `lyrics_${song.id}`;
            const cachedData = await AsyncStorage.getItem(cacheKey);

            if (cachedData) {
                const { synced, plain, timestamp } = JSON.parse(cachedData);
                // Cache valid for 30 days (increased from 7)
                if (Date.now() - timestamp < 30 * 24 * 60 * 60 * 1000) {
                    if (synced && synced.length > 0) {
                        setSyncedLyrics(synced);
                        setLoading(false);
                        return;
                    }
                    if (plain) {
                        setPlainLyrics(plain);
                        setLoading(false);
                        // Don't return, maybe we can find synced now in background? 
                        // actually for now let's just use cache to be fast
                        return;
                    }
                }
            }

            // Cleaning strategy
            const cleanArtist = song.artist.split(/[&,\/]/)[0].replace(/\s*\([^)]*\)/g, '').trim();
            const originalTitle = song.title.trim();
            const cleanTitle = song.title
                .replace(/\s*\([^)]*\)/g, '') // remove (...)
                .replace(/\s*\[[^\]]*\]/g, '') // remove [...]
                .replace(/\s*-\s*.*$/, '') // remove - ...
                .replace(/feat\..*/i, '') // remove feat.
                .replace(/ft\..*/i, '') // remove ft.
                .trim();

            const fetchWithTimeout = (url: string, timeout = 3000) => {
                return Promise.race([
                    fetch(url),
                    new Promise<Response>((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), timeout)
                    )
                ]);
            };

            // 1. Try LRCLIB with CLEAN title first (higher success rate for pop/modern)
            try {
                const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}&album_name=${encodeURIComponent(song.album || '')}&duration=${song.duration ? song.duration / 1000 : ''}`;
                console.log('Fetching Lyrics (Clean):', url);

                const response = await fetchWithTimeout(url, 3000);
                if (response.ok) {
                    const data = await response.json();
                    if (data.syncedLyrics) {
                        const parsed = parseLRC(data.syncedLyrics);
                        setSyncedLyrics(parsed);
                        await AsyncStorage.setItem(cacheKey, JSON.stringify({ synced: parsed, timestamp: Date.now() }));
                        setLoading(false);
                        return;
                    } else if (data.plainLyrics) {
                        setPlainLyrics(data.plainLyrics);
                        await AsyncStorage.setItem(cacheKey, JSON.stringify({ plain: data.plainLyrics, timestamp: Date.now() }));
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.log('LRCLIB Clean attempt failed');
            }

            // 2. Try LRCLIB with ORIGINAL title (if clean failed)
            if (originalTitle !== cleanTitle) {
                try {
                    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(originalTitle)}&duration=${song.duration ? song.duration / 1000 : ''}`;
                    console.log('Fetching Lyrics (Original):', url);

                    const response = await fetchWithTimeout(url, 3000);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.syncedLyrics) {
                            const parsed = parseLRC(data.syncedLyrics);
                            setSyncedLyrics(parsed);
                            await AsyncStorage.setItem(cacheKey, JSON.stringify({ synced: parsed, timestamp: Date.now() }));
                            setLoading(false);
                            return;
                        }
                    }
                } catch (e) { console.log('LRCLIB Original attempt failed'); }
            }

            // 3. Fallback to Search API (Slower but finds more matches)
            try {
                const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanArtist + ' ' + cleanTitle)}`;
                console.log('Searching Lyrics:', searchUrl);
                const response = await fetchWithTimeout(searchUrl, 4000);
                if (response.ok) {
                    const results = await response.json();
                    if (Array.isArray(results) && results.length > 0) {
                        // Find best match by duration if available
                        const match = results[0]; // Take first for speed
                        if (match.syncedLyrics) {
                            const parsed = parseLRC(match.syncedLyrics);
                            setSyncedLyrics(parsed);
                            await AsyncStorage.setItem(cacheKey, JSON.stringify({ synced: parsed, timestamp: Date.now() }));
                            setLoading(false);
                            return;
                        } else if (match.plainLyrics) {
                            setPlainLyrics(match.plainLyrics);
                            await AsyncStorage.setItem(cacheKey, JSON.stringify({ plain: match.plainLyrics, timestamp: Date.now() }));
                            setLoading(false);
                            return;
                        }
                    }
                }
            } catch (e) { console.log('LRCLIB Search failed'); }

            // 4. Last Resort: lyrics.ovh (Plain text only)
            try {
                const ovhResponse = await fetchWithTimeout(
                    `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
                    3000
                );
                if (ovhResponse.ok) {
                    const ovhData = await ovhResponse.json();
                    if (ovhData.lyrics) {
                        setPlainLyrics(ovhData.lyrics);
                        await AsyncStorage.setItem(cacheKey, JSON.stringify({ plain: ovhData.lyrics, timestamp: Date.now() }));
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) { console.log('OVH failed'); }

            setError('No lyrics found');

        } catch (err) {
            setError('Lyrics not available');
        } finally {
            setLoading(false);
        }
    };

    // Update active index based on player position
    useEffect(() => {
        if (syncedLyrics.length > 0) {
            let index = -1;
            for (let i = 0; i < syncedLyrics.length; i++) {
                if (position >= syncedLyrics[i].time) {
                    index = i;
                } else {
                    break;
                }
            }
            if (index !== activeIndex) {
                setActiveIndex(index);
                if (index !== -1 && flatListRef.current) {
                    flatListRef.current.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0.3 // Center the active line slightly above the middle
                    });
                }
            }
        }
    }, [position, syncedLyrics, activeIndex]);

    const renderLyricLine = ({ item, index }: { item: LyricLine; index: number }) => {
        const isActive = index === activeIndex;

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.lyricLineContainer, isActive && styles.activeLineContainer]}
            >
                <Text style={[
                    styles.lyricText,
                    { color: isActive ? theme.primary : theme.textSecondary },
                    isActive && styles.activeLyricText
                ]}>
                    {item.text}
                </Text>
            </TouchableOpacity>
        );
    };

    if (!song) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    <View style={styles.handleBarContainer}>
                        <View style={[styles.handleBar, { backgroundColor: theme.cardBorder }]} />
                    </View>

                    <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="chevron-down" size={28} color={theme.text} />
                        </TouchableOpacity>
                        <View style={styles.headerCenter}>
                            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                                {song.title}
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                                {song.artist}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={fetchLyrics} style={styles.refreshButton}>
                            <Ionicons name="refresh" size={22} color={theme.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.songCard, { backgroundColor: theme.card }]}>
                        <MusicImage
                            uri={song.coverImage}
                            id={song.id}
                            style={styles.art}
                            iconSize={24}
                            containerStyle={[styles.artContainer, { backgroundColor: theme.background }]}
                        />
                        <View style={styles.songInfo}>
                            <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>
                                {song.title}
                            </Text>
                            <Text style={[styles.songArtist, { color: theme.textSecondary }]} numberOfLines={1}>
                                {song.artist} • {song.album || 'Unknown Album'}
                            </Text>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.centerContent}>
                            <ActivityIndicator size="large" color={theme.primary} />
                            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                                Fetching lyrics...
                            </Text>
                        </View>
                    ) : error ? (
                        <View style={styles.centerContent}>
                            <Ionicons name="musical-notes-outline" size={60} color={theme.textSecondary} />
                            <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
                        </View>
                    ) : syncedLyrics.length > 0 ? (
                        <FlatList
                            ref={flatListRef}
                            data={syncedLyrics}
                            keyExtractor={(_, index) => index.toString()}
                            renderItem={renderLyricLine}
                            contentContainerStyle={styles.lyricsScrollContent}
                            showsVerticalScrollIndicator={false}
                            onScrollToIndexFailed={() => { }}
                        />
                    ) : plainLyrics ? (
                        <FlatList
                            data={plainLyrics.split('\n')}
                            keyExtractor={(_, index) => index.toString()}
                            renderItem={({ item }) => (
                                <Text style={[styles.plainLyricText, { color: theme.text }]}>{item}</Text>
                            )}
                            contentContainerStyle={styles.lyricsScrollContent}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : null}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        height: '92%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    handleBarContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    handleBar: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: 4,
        width: 40,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    refreshButton: {
        padding: 4,
        width: 40,
        alignItems: 'flex-end',
    },
    songCard: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        padding: 12,
        borderRadius: 12,
    },
    art: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    artContainer: {
        width: 50,
        height: 50,
        borderRadius: 8,
        overflow: 'hidden',
    },
    songInfo: {
        flex: 1,
        marginLeft: 12,
    },
    songTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    songArtist: {
        fontSize: 13,
        marginTop: 2,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
    },
    errorText: {
        marginTop: 16,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    lyricsScrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: SCREEN_HEIGHT * 0.4, // Allow scrolling the last lines to the center
    },
    lyricLineContainer: {
        paddingVertical: 12,
        minHeight: 50,
        justifyContent: 'center',
    },
    activeLineContainer: {
        transform: [{ scale: 1.05 }],
    },
    lyricText: {
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.6,
    },
    activeLyricText: {
        fontSize: 22,
        fontWeight: '700',
        opacity: 1,
    },
    plainLyricText: {
        fontSize: 18,
        lineHeight: 30,
        textAlign: 'center',
        paddingVertical: 4,
    },
});

