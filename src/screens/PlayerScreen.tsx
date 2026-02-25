import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, PanResponder, FlatList, Animated, Modal, Platform } from 'react-native';
import ReAnimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { usePlayerContext } from '../hooks/PlayerContext';
import { useTheme } from '../hooks/ThemeContext';
import { MusicImage } from '../components/MusicImage';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { SongOptionsMenu } from '../components/SongOptionsMenu';
import { EditSongModal } from '../components/EditSongModal';
import { LyricsModal } from '../components/LyricsModal';
import { PlayingIndicator } from '../components/PlayingIndicator';
import { MarqueeText } from '../components/MarqueeText';
import { useProgress } from 'react-native-track-player';
import { Song } from '../hooks/useLocalMusic';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const { width, height: screenHeight } = Dimensions.get('window');

export const PlayerScreen = ({ route, navigation }: Props) => {
    const {
        currentSong,
        isPlaying,
        playPause,
        nextTrack,
        prevTrack,
        seek,
        playlist,
        currentIndex,
        playSongInPlaylist,
        playlistName,
        isShuffleOn,
        toggleShuffle,
        repeatMode,
        toggleRepeat,
        removeFromQueue,
    } = usePlayerContext();

    const { position: rawPosition, duration: rawDuration } = useProgress(250); // Faster updates for the full player
    const position = rawPosition * 1000;
    const duration = rawDuration * 1000;

    const { theme, themeType, playerStyle } = useTheme();

    const getArtStyle = () => {
        const size = width - 100;
        let borderRadius = 24;

        switch (playerStyle) {
            case 'circle': borderRadius = size / 2; break;

            case 'square': borderRadius = 12; break;
            case 'sharp': borderRadius = 0; break;
            case 'soft': borderRadius = 48; break;
            case 'squircle': borderRadius = size / 4; break;
            case 'rounded': default: borderRadius = 24; break;
        }

        return {
            width: size,
            height: size,
            borderRadius
        };
    };

    const dynamicArtStyle = getArtStyle();
    const { toggleLike, isLiked, playlists, addToPlaylist, updateSongMetadata } = useMusicLibrary();
    const [barLayout, setBarLayout] = useState({ x: 0, width: 0 });
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekPosition, setSeekPosition] = useState(0);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [lyricsModalVisible, setLyricsModalVisible] = useState(false);
    const likeScale = useRef(new Animated.Value(1)).current;

    const shuffleScale = useSharedValue(1);
    const repeatScale = useSharedValue(1);
    const playPauseScale = useSharedValue(1);
    const prevScale = useSharedValue(1);
    const nextScale = useSharedValue(1);
    const likeShine = useSharedValue(0);
    const songTransition = useSharedValue(1);
    const slideDirection = useSharedValue(0); // 1 for right-to-left (next), -1 for left-to-right (prev)

    useEffect(() => {
        // Trigger animation whenever currentSong changes
        songTransition.value = 0;
        songTransition.value = withTiming(1, {
            duration: 250,
            easing: Easing.out(Easing.back(0.5))
        });
    }, [currentSong?.id]);

    const contentTransitionStyle = useAnimatedStyle(() => ({
        opacity: songTransition.value,
        transform: [
            { translateX: 100 * (1 - songTransition.value) * (slideDirection.value || 1) }
        ] as any
    }));

    const likeShineStyle = useAnimatedStyle(() => ({
        opacity: likeShine.value,
        transform: [
            { scale: withTiming(likeShine.value * 2.5, { duration: 400 }) },
            { rotate: `${likeShine.value * 45}deg` }
        ] as any
    }));

    const handleNext = () => {
        slideDirection.value = 1;
        nextTrack();
    };

    const handlePrev = () => {
        slideDirection.value = -1;
        prevTrack();
    };

    const [selectedQueueItem, setSelectedQueueItem] = useState<{ song: Song, index: number } | null>(null);
    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [queueOptionsVisible, setQueueOptionsVisible] = useState(false);
    const [activeModalSong, setActiveModalSong] = useState<Song | null>(null);

    const queueListRef = useRef<FlatList>(null);

    const liked = currentSong ? isLiked(currentSong.id) : false;

    const toggleOptions = () => setOptionsModalVisible(true);

    const handleLike = () => {
        if (!currentSong) return;

        // Trigger shine effect
        likeShine.value = 0;
        likeShine.value = withSequence(
            withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) })
        );

        Animated.sequence([
            Animated.spring(likeScale, { toValue: 1.4, friction: 3, useNativeDriver: true }),
            Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true })
        ]).start();
        toggleLike(currentSong);
    };

    const handleAddToPlaylist = async (playlistId: string) => {
        const targetSong = activeModalSong || currentSong;
        if (targetSong) {
            await addToPlaylist(playlistId, targetSong);
            setPlaylistModalVisible(false);
        }
    };

    const barLayoutRef = useRef(barLayout);
    const durationRef = useRef(duration);

    useEffect(() => { barLayoutRef.current = barLayout; }, [barLayout]);
    useEffect(() => { durationRef.current = duration; }, [duration]);

    const updateSeekPosition = (pageX: number) => {
        const layout = barLayoutRef.current;
        const dur = durationRef.current;
        if (layout.width > 0 && dur > 0) {
            const relX = pageX - layout.x;
            const newProgress = Math.min(Math.max(relX / layout.width, 0), 1);
            setSeekPosition(newProgress * dur);
        }
    };

    const commitSeek = (pageX: number) => {
        const layout = barLayoutRef.current;
        const dur = durationRef.current;
        if (layout.width > 0 && dur > 0) {
            const relX = pageX - layout.x;
            const newProgress = Math.min(Math.max(relX / layout.width, 0), 1);
            const targetPosition = newProgress * dur;
            seek(targetPosition);
            setSeekPosition(targetPosition);
        }
    };

    const waveOffset = useSharedValue(0);
    useEffect(() => {
        if (isPlaying) {
            waveOffset.value = withRepeat(
                withTiming(1, { duration: 1500, easing: Easing.linear }),
                -1,
                false
            );
        }
    }, [isPlaying]);

    const waveStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: `${-waveOffset.value * 50}%` }] as any
    }));

    const panHandlers = React.useMemo(() => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                setIsSeeking(true);
                updateSeekPosition(evt.nativeEvent.pageX);
            },
            onPanResponderMove: (evt) => {
                updateSeekPosition(evt.nativeEvent.pageX);
            },
            onPanResponderRelease: (evt) => {
                commitSeek(evt.nativeEvent.pageX);
                setIsSeeking(false);
            },
            onPanResponderTerminate: () => setIsSeeking(false),
        }).panHandlers;
    }, [seek, duration]);

    const currentPosition = isSeeking ? seekPosition : position;
    const progress = duration > 0 ? currentPosition / duration : 0;

    const seekInterval = useRef<NodeJS.Timeout | null>(null);

    const startSeeking = (direction: 'forward' | 'backward') => {
        if (seekInterval.current) clearInterval(seekInterval.current);
        let skipAmount = 2000;
        let currentPos = position;
        const acceleration = 1.3;
        const maxSkip = 30000;
        currentPos = direction === 'forward' ? currentPos + 2000 : currentPos - 2000;
        currentPos = Math.min(Math.max(currentPos, 0), duration);
        seek(currentPos);
        seekInterval.current = setInterval(() => {
            currentPos = direction === 'forward' ? currentPos + skipAmount : currentPos - skipAmount;
            currentPos = Math.min(Math.max(currentPos, 0), duration);
            seek(currentPos);
            skipAmount = Math.min(skipAmount * acceleration, maxSkip);
        }, 150);
    };

    const stopSeeking = () => {
        if (seekInterval.current) {
            clearInterval(seekInterval.current);
            seekInterval.current = null;
        }
    };

    const formatTime = (millis: number) => {
        if (!millis && millis !== 0) return "0:00";
        const minutes = Math.floor(millis / 60000);
        const seconds = ((millis % 60000) / 1000).toFixed(0);
        return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
    };

    const incrementPlayCount = useMusicLibrary()?.incrementPlayCount;
    const lastTrackedSongId = useRef<string | null>(null);

    useEffect(() => {
        if (currentSong && currentSong.id !== lastTrackedSongId.current) {
            lastTrackedSongId.current = currentSong.id;
            if (incrementPlayCount) incrementPlayCount(currentSong.id);
        }
    }, [currentSong?.id]);

    const SHEET_MAX_HEIGHT = screenHeight * 0.85;
    const SHEET_MIN_HEIGHT = 60;
    const [sheetOpen, setSheetOpen] = useState(false);

    useEffect(() => {
        if (sheetOpen && currentIndex !== -1 && playlist.length > 0 && currentIndex < playlist.length) {
            setTimeout(() => {
                if (currentIndex < playlist.length) {
                    try {
                        queueListRef.current?.scrollToIndex({
                            index: currentIndex,
                            animated: true,
                            viewPosition: 0.5
                        });
                    } catch (e) {
                        console.warn('[PlayerScreen] Queue scroll failed:', e);
                    }
                }
            }, 300);
        }
    }, [sheetOpen, currentIndex, playlist.length]);

    const translateY = useRef(new Animated.Value(0)).current;

    const sheetPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                const newY = sheetOpen ? gestureState.dy : gestureState.dy;
                if (newY > 0 && sheetOpen) translateY.setValue(newY);
                else if (newY < 0 && !sheetOpen) translateY.setValue(newY);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (sheetOpen) {
                    if (gestureState.dy > 100) closeSheet();
                    else openSheet();
                } else {
                    if (gestureState.dy < -100) openSheet();
                    else closeSheet();
                }
            }
        })
    ).current;

    const openSheet = () => {
        Animated.spring(translateY, {
            toValue: -SHEET_MAX_HEIGHT + SHEET_MIN_HEIGHT,
            useNativeDriver: true,
            bounciness: 4
        }).start(() => setSheetOpen(true));
    };

    const closeSheet = () => {
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4
        }).start(() => setSheetOpen(false));
    };

    const listOpacity = translateY.interpolate({
        inputRange: [-SHEET_MAX_HEIGHT + SHEET_MIN_HEIGHT, -50],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    const animeShuffle = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(shuffleScale.value, { duration: 150 }) }]
    }));
    const animeRepeat = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(repeatScale.value, { duration: 150 }) }]
    }));
    const animatePlayPause = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(playPauseScale.value, { duration: 150 }) }]
    }));
    const animatePrev = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(prevScale.value, { duration: 150 }) }]
    }));
    const animateNext = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(nextScale.value, { duration: 150 }) }]
    }));

    const handleShufflePress = () => {
        shuffleScale.value = 0.8;
        setTimeout(() => { shuffleScale.value = 1.1; setTimeout(() => { shuffleScale.value = 1; }, 100); }, 100);
        toggleShuffle();
    };
    const handleRepeatPress = () => {
        repeatScale.value = 0.8;
        setTimeout(() => { repeatScale.value = 1.1; setTimeout(() => { repeatScale.value = 1; }, 100); }, 100);
        toggleRepeat();
    };
    const handlePlayPausePress = () => {
        playPauseScale.value = 0.8;
        setTimeout(() => { playPauseScale.value = 1; }, 150);
        playPause();
    };

    return (
        <ScreenContainer variant="player">
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-down" size={30} color={theme.text} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Now Playing</Text>
                        <Text
                            style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2, maxWidth: 200, fontWeight: '500' }}
                            numberOfLines={1}
                        >
                            {currentSong?.title || (playlistName || '')}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={toggleOptions}>
                        <Ionicons name="ellipsis-horizontal" size={28} color={theme.text} />
                    </TouchableOpacity>
                </View>


                <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 160 }}>
                    <ReAnimated.View style={[styles.artContainer, contentTransitionStyle]}>
                        <GlassCard style={[styles.artCard, dynamicArtStyle]} contentStyle={{ padding: 0, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            <MusicImage
                                uri={currentSong?.coverImage}
                                id={currentSong?.id}
                                assetUri={currentSong?.uri}
                                style={{ width: '100%', height: '100%' }}
                                iconSize={width * 0.4}
                                containerStyle={styles.placeholderArt}
                                resizeMode="cover"
                                priority={true}
                            />

                        </GlassCard>
                    </ReAnimated.View>

                    <View style={styles.bottomControlsBlock}>
                        <ReAnimated.View style={[styles.infoContainer, contentTransitionStyle]}>
                            <View style={{ flex: 1 }}>
                                <MarqueeText
                                    text={currentSong?.title || "Not Playing"}
                                    style={[styles.songTitle, { color: theme.text }]}
                                />
                                <Text
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={[styles.albumName, { color: theme.textSecondary }]}
                                >
                                    {`${currentSong?.album || "Unknown Album"}${currentSong?.year && currentSong.year !== 'Unknown Year' ? ` • ${currentSong.year}` : ''}`}
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={[styles.artistName, { color: theme.primary }]}
                                >
                                    {currentSong?.artist || "Select a song"}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                <TouchableOpacity
                                    onPress={() => setLyricsModalVisible(true)}
                                    style={[styles.lyricsPillButton, { backgroundColor: theme.card }]}
                                >
                                    <Ionicons name="document-text-outline" size={16} color={theme.primary} />
                                    <Text style={[styles.lyricsPillText, { color: theme.text }]}>Lyrics</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleLike} style={[styles.iconButton, { backgroundColor: theme.card }]}>
                                    <ReAnimated.View style={[
                                        {
                                            position: 'absolute',
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            backgroundColor: liked ? '#ef4444' : theme.primary,
                                            zIndex: -1
                                        },
                                        likeShineStyle
                                    ]} />
                                    <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                                        <Ionicons
                                            name={liked ? "heart" : "heart-outline"}
                                            size={28}
                                            color={liked ? '#ef4444' : theme.primary}
                                        />
                                    </Animated.View>
                                </TouchableOpacity>
                            </View>
                        </ReAnimated.View>

                        <View style={styles.progressContainer}>
                            <View
                                onLayout={(e) => setBarLayout({ x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}
                                style={styles.progressBarBg}
                            >
                                <View style={[styles.progressBarFill, { width: `${progress * 100}%`, overflow: 'hidden' }]}>
                                    <ReAnimated.View style={[{ width: '200%', height: '100%', flexDirection: 'row' }, waveStyle]}>
                                        <LinearGradient
                                            colors={[theme.primary, theme.secondary, theme.primary]}
                                            start={{ x: 0, y: 0.5 }}
                                            end={{ x: 1, y: 0.5 }}
                                            style={{ flex: 1 }}
                                        />
                                    </ReAnimated.View>
                                </View>
                                <View style={[styles.progressKnob, { left: `${progress * 100}%`, backgroundColor: theme.text }]} />
                                <View style={StyleSheet.absoluteFill} {...panHandlers} />
                            </View>
                            <View style={styles.timeContainer}>
                                <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(currentPosition)}</Text>
                                <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(duration)}</Text>
                            </View>
                        </View>

                        <View style={styles.controlsContainer}>
                            <TouchableOpacity onPress={handleShufflePress}>
                                <ReAnimated.View style={animeShuffle}>
                                    <Ionicons name="shuffle" size={24} color={isShuffleOn ? theme.primary : theme.textSecondary} />
                                </ReAnimated.View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handlePrev}
                                onLongPress={() => { prevScale.value = 0.9; startSeeking('backward'); }}
                                onPressOut={() => { prevScale.value = 1; stopSeeking(); }}
                                delayLongPress={300}
                            >
                                <ReAnimated.View style={animatePrev}>
                                    <Ionicons name="play-skip-back" size={36} color={theme.text} />
                                </ReAnimated.View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.playButton} onPress={handlePlayPausePress}>
                                <ReAnimated.View style={animatePlayPause}>
                                    <Ionicons name={isPlaying ? "pause" : "play"} size={48} color={theme.text} />
                                </ReAnimated.View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleNext}
                                onLongPress={() => { nextScale.value = 0.9; startSeeking('forward'); }}
                                onPressOut={() => { nextScale.value = 1; stopSeeking(); }}
                                delayLongPress={300}
                            >
                                <ReAnimated.View style={animateNext}>
                                    <Ionicons name="play-skip-forward" size={36} color={theme.text} />
                                </ReAnimated.View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleRepeatPress}>
                                <ReAnimated.View style={animeRepeat}>
                                    <Ionicons name="repeat" size={24} color={repeatMode !== 'off' ? theme.primary : theme.textSecondary} />
                                    {repeatMode === 'one' && (
                                        <View style={styles.repeatOneBadge}>
                                            <Text style={{ fontSize: 8, color: theme.background, fontWeight: 'bold' }}>1</Text>
                                        </View>
                                    )}
                                </ReAnimated.View>
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>
            </SafeAreaView>

            <Animated.View
                style={[
                    styles.bottomSheet,
                    {
                        backgroundColor: theme.background === '#ffffff' ? '#f5f5f5' : (theme.background === '#000000' ? '#121212' : theme.card),
                        height: SHEET_MAX_HEIGHT,
                        transform: [{ translateY: translateY }],
                        bottom: -SHEET_MAX_HEIGHT + SHEET_MIN_HEIGHT + 60
                    }
                ]}
            >
                <View {...(!sheetOpen ? sheetPanResponder.panHandlers : {})}>
                    <View style={styles.sheetHeader}>
                        {sheetOpen ? (
                            <TouchableOpacity onPress={closeSheet} style={{ padding: 10 }}>
                                <Ionicons name="chevron-down" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={{ alignItems: 'center', width: '100%', paddingVertical: 10 }} onPress={openSheet}>
                                <View style={styles.dragHandle} />
                                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 5 }}>Queue</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <Animated.View style={{ flex: 1, opacity: listOpacity }}>
                    <FlatList
                        ref={queueListRef}
                        data={playlist}
                        keyExtractor={(item, index) => `${item.id}-${index}`}
                        showsVerticalScrollIndicator={false}
                        getItemLayout={(_, index) => ({
                            length: 73,
                            offset: 73 * index,
                            index,
                        })}
                        onScrollToIndexFailed={(info) => {
                            setTimeout(() => {
                                queueListRef.current?.scrollToIndex({ index: info.index, animated: true });
                            }, 500);
                        }}
                        renderItem={({ item, index }) => (
                            <View style={[styles.queueItem, index === currentIndex && { backgroundColor: theme.primary + '20' }]}>
                                <TouchableOpacity
                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                                    onPress={() => { playSongInPlaylist(playlist, index, playlistName); closeSheet(); }}
                                >
                                    <MusicImage uri={item.coverImage} id={item.id} style={styles.queueArtwork} iconSize={20} containerStyle={styles.queueArtwork} />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={[styles.queueTitle, { color: index === currentIndex ? theme.primary : theme.text }]} numberOfLines={1}>{item.title}</Text>
                                        <Text style={[styles.queueArtist, { color: theme.textSecondary }]} numberOfLines={1}>{item.artist}</Text>
                                    </View>
                                </TouchableOpacity>
                                {index === currentIndex && <PlayingIndicator color={theme.primary} size={18} isPlaying={isPlaying} />}
                                <TouchableOpacity style={{ padding: 10 }} onPress={() => { setSelectedQueueItem({ song: item, index }); setQueueOptionsVisible(true); }}>
                                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                </Animated.View>
            </Animated.View>

            <SongOptionsMenu
                visible={optionsModalVisible}
                onClose={() => setOptionsModalVisible(false)}
                song={currentSong}
                onRequestPlaylistAdd={() => { setActiveModalSong(currentSong); setOptionsModalVisible(false); setTimeout(() => setPlaylistModalVisible(true), 100); }}
                onEditDetails={() => { setActiveModalSong(currentSong); setOptionsModalVisible(false); setTimeout(() => setEditModalVisible(true), 100); }}
            />

            <SongOptionsMenu
                visible={queueOptionsVisible}
                onClose={() => setQueueOptionsVisible(false)}
                song={selectedQueueItem?.song || null}
                onRequestPlaylistAdd={() => { setActiveModalSong(selectedQueueItem?.song || null); setQueueOptionsVisible(false); setTimeout(() => setPlaylistModalVisible(true), 100); }}
                onRemoveFromQueue={() => { if (selectedQueueItem) removeFromQueue(selectedQueueItem.index); }}
                onEditDetails={() => { setActiveModalSong(selectedQueueItem?.song || null); setQueueOptionsVisible(false); setTimeout(() => setEditModalVisible(true), 100); }}
            />

            <EditSongModal visible={editModalVisible} onClose={() => setEditModalVisible(false)} song={activeModalSong || currentSong} onSave={updateSongMetadata} />
            <LyricsModal visible={lyricsModalVisible} onClose={() => setLyricsModalVisible(false)} song={currentSong} />

            <Modal animationType="slide" transparent={true} visible={playlistModalVisible} onRequestClose={() => setPlaylistModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Add to Playlist</Text>
                            <TouchableOpacity onPress={() => setPlaylistModalVisible(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
                        </View>
                        <FlatList
                            data={playlists.filter(p => !p.isSpecial && p.id !== 'liked')}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={[styles.playlistItem, { borderBottomColor: theme.cardBorder }]} onPress={() => handleAddToPlaylist(item.id)}>
                                    <View style={[styles.playlistIcon, { backgroundColor: theme.card }]}><Ionicons name="musical-notes" size={24} color={theme.primary} /></View>
                                    <View style={{ flex: 1 }}><Text style={[styles.playlistName, { color: theme.text }]}>{item.name}</Text><Text style={[styles.songCount, { color: theme.textSecondary }]}>{item.songs.length} songs</Text></View>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </ScreenContainer >
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 },
    headerTitle: { fontSize: 16, fontWeight: '600' },
    artContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, marginBottom: 20 },
    artCard: { width: width - 100, height: width - 100, borderRadius: 24, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 },
    placeholderArt: { width: '100%', height: '100%', backgroundColor: 'rgba(139, 92, 246, 0.2)', justifyContent: 'center', alignItems: 'center' },
    infoContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30, marginBottom: 30 },
    songTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    artistName: { fontSize: 12, opacity: 0.8, marginBottom: 2 },
    albumName: { fontSize: 15, fontWeight: '600' },
    progressContainer: { paddingHorizontal: 30, marginBottom: 10 },
    progressBarBg: { height: 6, backgroundColor: 'rgba(150,150,150,0.2)', borderRadius: 3, marginBottom: 10, position: 'relative' },
    progressBarFill: { height: '100%', borderRadius: 3 },
    progressKnob: { width: 14, height: 14, borderRadius: 7, position: 'absolute', top: -4, marginLeft: -7 },
    timeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    timeText: { fontSize: 12 },
    bottomControlsBlock: { marginTop: 0 },
    controlsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, marginBottom: 20 },
    playButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    repeatOneBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 6, width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
    bottomSheet: { position: 'absolute', left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, elevation: 10 },
    sheetHeader: { alignItems: 'center', paddingVertical: 10 },
    dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(150,150,150,0.4)', borderRadius: 2 },
    queueItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderRadius: 12, paddingHorizontal: 10, marginBottom: 5 },
    queueArtwork: { width: 48, height: 48, borderRadius: 8 },
    queueTitle: { fontSize: 15, fontWeight: '600' },
    queueArtist: { fontSize: 13, opacity: 0.7 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%', borderWidth: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    playlistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
    playlistIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    playlistName: { fontSize: 16, fontWeight: '600' },
    songCount: { fontSize: 13, opacity: 0.6 },
    iconButton: { justifyContent: 'center', alignItems: 'center', width: 44, height: 44, borderRadius: 22 },
    lyricsPillButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, gap: 6 },
    lyricsPillText: { fontSize: 12, fontWeight: '600' }
});
