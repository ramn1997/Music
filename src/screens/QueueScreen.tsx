import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
const FlashListAny = FlashList as any;
import { usePlayerContext } from '../hooks/PlayerContext';
import { useTheme } from '../hooks/ThemeContext';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { MusicImage } from '../components/MusicImage';
import { PlayingIndicator } from '../components/PlayingIndicator';
import { ScreenContainer } from '../components/ScreenContainer';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { SongOptionsMenu } from '../components/SongOptionsMenu';
import { EditSongModal } from '../components/EditSongModal';
import { Song } from '../hooks/MusicLibraryContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Queue'>;

const { width } = Dimensions.get('window');

export const QueueScreen = ({ navigation }: Props) => {
    const {
        currentSong,
        isPlaying,
        playlist,
        currentIndex,
        playSongInPlaylist,
        playlistName,
        isShuffleOn,
        toggleShuffle,
        removeFromQueue
    } = usePlayerContext();

    const { theme, themeType } = useTheme();
    const { addToPlaylist, updateSongMetadata } = useMusicLibrary();

    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [selectedQueueItem, setSelectedQueueItem] = useState<{ song: Song, index: number } | null>(null);
    const [queueOptionsVisible, setQueueOptionsVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [activeModalSong, setActiveModalSong] = useState<Song | null>(null);

    const listRef = useRef<any>(null);

    const scrollToCurrent = useCallback(() => {
        if (currentIndex === -1 || playlist.length === 0 || !listRef.current) return;

        // Use a bit more generous timeout to ensure FlashList is fully ready
        const timer = setTimeout(() => {
            try {
                if (listRef.current && currentIndex >= 0 && currentIndex < playlist.length) {
                    listRef.current.scrollToIndex({
                        index: currentIndex,
                        animated: true,
                        viewPosition: 0.5 // Center the playing song
                    });
                }
            } catch (err) {
                console.log('[QueueScreen] Scroll failed, retrying...', err);
                // Fallback retry
                setTimeout(() => {
                    if (listRef.current && currentIndex >= 0 && currentIndex < playlist.length) {
                        listRef.current.scrollToIndex({
                            index: currentIndex,
                            animated: true,
                            viewPosition: 0.5
                        });
                    }
                }, 400);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [currentIndex, playlist.length]);

    useFocusEffect(
        useCallback(() => {
            const cleanUp = scrollToCurrent();
            return () => {
                if (typeof cleanUp === 'function') cleanUp();
            };
        }, [scrollToCurrent])
    );

    useEffect(() => {
        const cleanUp = scrollToCurrent();
        return () => {
            if (typeof cleanUp === 'function') cleanUp();
        };
    }, [currentIndex, scrollToCurrent]);

    const handleAddQueueToPlaylist = () => {
        setPlaylistModalVisible(true);
    };

    return (
        <ScreenContainer variant="default">
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Queue</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={toggleShuffle} style={styles.headerActionBtn}>
                            <Ionicons name="shuffle" size={24} color={isShuffleOn ? theme.primary : theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleAddQueueToPlaylist} style={styles.headerActionBtn}>
                            <Ionicons name="add-circle-outline" size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <FlashListAny
                    ref={listRef}
                    data={playlist}
                    extraData={currentIndex}
                    keyExtractor={(item: Song, index: number) => `${item.id}-${index}`}
                    estimatedItemSize={73}
                    initialScrollIndex={currentIndex !== -1 ? currentIndex : undefined}
                    contentContainerStyle={styles.listContent}
                    decelerationRate="fast"
                    renderItem={({ item, index }: { item: Song, index: number }) => (
                        <View style={[styles.queueItem, index === currentIndex && { backgroundColor: theme.primary + '15' }]}>
                            <TouchableOpacity
                                style={styles.itemMain}
                                onPress={() => playSongInPlaylist(playlist, index, playlistName)}
                            >
                                <View style={styles.artworkContainer}>
                                    <MusicImage
                                        uri={item.coverImage}
                                        id={item.id}
                                        style={styles.artwork}
                                        iconSize={20}
                                    />
                                    {index === currentIndex && isPlaying && (
                                        <View style={styles.playingOverlay}>
                                            <PlayingIndicator color="white" size={14} isPlaying={true} />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.info}>
                                    <Text style={[styles.title, { color: index === currentIndex ? theme.primary : theme.text }]} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text style={[styles.artist, { color: theme.textSecondary }]} numberOfLines={1}>
                                        {item.artist}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.optionsButton}
                                onPress={() => { setSelectedQueueItem({ song: item, index }); setQueueOptionsVisible(true); }}
                            >
                                <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}
                />

                <SongOptionsMenu
                    visible={queueOptionsVisible}
                    onClose={() => setQueueOptionsVisible(false)}
                    song={selectedQueueItem?.song || null}
                    onRequestPlaylistAdd={() => { setActiveModalSong(selectedQueueItem?.song || null); setQueueOptionsVisible(false); setTimeout(() => setPlaylistModalVisible(true), 100); }}
                    onRemoveFromQueue={() => { if (selectedQueueItem) removeFromQueue(selectedQueueItem.index); }}
                    onEditDetails={() => { setActiveModalSong(selectedQueueItem?.song || null); setQueueOptionsVisible(false); setTimeout(() => setEditModalVisible(true), 100); }}
                />

                <EditSongModal
                    visible={editModalVisible}
                    onClose={() => setEditModalVisible(false)}
                    song={activeModalSong}
                    onSave={updateSongMetadata}
                />

                <AddToPlaylistModal
                    visible={playlistModalVisible}
                    onClose={() => setPlaylistModalVisible(false)}
                    songs={activeModalSong ? [activeModalSong] : playlist}
                />
            </SafeAreaView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        justifyContent: 'space-between',
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerActionBtn: { padding: 10 },
    listContent: { paddingHorizontal: 15, paddingBottom: 40 },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        paddingHorizontal: 10,
        marginBottom: 5,
    },
    itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    artworkContainer: { position: 'relative' },
    artwork: { width: 48, height: 48, borderRadius: 8 },
    playingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    info: { flex: 1, marginLeft: 12 },
    title: { fontSize: 16, fontWeight: '600' },
    artist: { fontSize: 14, marginTop: 2 },
    optionsButton: { padding: 10 },
});
