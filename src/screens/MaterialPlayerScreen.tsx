import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, PanResponder, Animated, Modal, Platform, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
const FlashListAny = FlashList as any;
import ReAnimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withSpring, withDelay, Easing, runOnJS, interpolate } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTheme } from '../hooks/ThemeContext';
import { MusicImage } from '../components/MusicImage';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { SongOptionsMenu } from '../components/SongOptionsMenu';
import { EditSongModal } from '../components/EditSongModal';
import { LyricsModal } from '../components/LyricsModal';
import { PlayingIndicator } from '../components/PlayingIndicator';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { MarqueeText } from '../components/MarqueeText';
import { ShareCardModal } from '../components/ShareCardModal';
import { RecommendationsModal } from '../components/RecommendationsModal';
import { useProgress, useIsPlaying } from 'react-native-track-player';
import TrackPlayer, { State } from 'react-native-track-player';
import { Song } from '../hooks/MusicLibraryContext';
import { SpatialAudioEngine } from '../components/SpatialAudioEngine';
import * as Network from 'expo-network';
import { Alert } from 'react-native';


const ProgressBar = React.memo(({ seek, isPlaying, theme }: { seek: (pos: number) => void, isPlaying: boolean, theme: any }) => {
    const { position: rawPosition, duration: rawDuration } = useProgress(250);
    const position = rawPosition * 1000;
    const duration = rawDuration * 1000;
    const [barLayout, setBarLayout] = useState({ x: 0, width: 0 });
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekPosition, setSeekPosition] = useState(0);

    const barLayoutRef = useRef(barLayout);
    const durationRef = useRef(duration);
    useEffect(() => { barLayoutRef.current = barLayout; }, [barLayout]);
    useEffect(() => { durationRef.current = duration; }, [duration]);

    const updateSeekPosition = (localX: number) => {
        const layout = barLayoutRef.current;
        const dur = durationRef.current;
        if (layout.width > 0 && dur > 0) {
            const newProgress = Math.min(Math.max(localX / layout.width, 0), 1);
            setSeekPosition(newProgress * dur);
        }
    };

    const commitSeek = (localX: number) => {
        const layout = barLayoutRef.current;
        const dur = durationRef.current;
        if (layout.width > 0 && dur > 0) {
            const newProgress = Math.min(Math.max(localX / layout.width, 0), 1);
            const targetPosition = newProgress * dur;
            seek(targetPosition);
            setSeekPosition(targetPosition);
        }
    };

    const smoothProgress = useSharedValue(0);
    const waveOffset = useSharedValue(0);

    // Smoothly animate the bar width between 1s skip/updates
    useEffect(() => {
        if (!isSeeking) {
            const currentProgress = duration > 0 ? (position / duration) : 0;
            smoothProgress.value = withTiming(currentProgress, { 
                duration: isPlaying ? 1000 : 250, 
                easing: Easing.linear 
            });
        }
    }, [position, duration, isPlaying, isSeeking]);

    // Handle immediate updates during seeking for responsiveness
    useEffect(() => {
        if (isSeeking) {
            const currentSeekProgress = duration > 0 ? (seekPosition / duration) : 0;
            smoothProgress.value = currentSeekProgress;
        }
    }, [seekPosition, isSeeking, duration]);

    useEffect(() => {
        if (isPlaying) {
            waveOffset.value = withRepeat(
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
                -1,
                true
            );
        } else {
            waveOffset.value = withTiming(0.5);
        }
    }, [isPlaying]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${smoothProgress.value * 100}%`
    }));

    const waveStyle = useAnimatedStyle(() => ({
        opacity: interpolate(waveOffset.value, [0, 0.5, 1], [0.3, 0.7, 1]),
        transform: [
            { translateX: interpolate(waveOffset.value, [0, 1], [-100, 100]) },
            { scaleY: interpolate(waveOffset.value, [0, 0.5, 1], [0.95, 1.05, 0.95]) }
        ] as any
    }));

    const progressGesture = React.useMemo(() => {
        const pan = Gesture.Pan()
            .activeOffsetX([-5, 5])
            .onBegin((e) => {
                runOnJS(setIsSeeking)(true);
                runOnJS(updateSeekPosition)(e.x);
            })
            .onUpdate((e) => {
                runOnJS(updateSeekPosition)(e.x);
            })
            .onEnd((e) => {
                runOnJS(commitSeek)(e.x);
                runOnJS(setIsSeeking)(false);
            })
            .onFinalize(() => {
                runOnJS(setIsSeeking)(false);
            });

        const tap = Gesture.Tap()
            .onEnd((e) => {
                runOnJS(setIsSeeking)(true);
                runOnJS(commitSeek)(e.x);
                runOnJS(setIsSeeking)(false);
            });

        return Gesture.Simultaneous(pan, tap);
    }, [updateSeekPosition, commitSeek]);

    const currentPosition = isSeeking ? seekPosition : position;
    const progress = duration > 0 ? currentPosition / duration : 0;

    const formatTime = (millis: number) => {
        if (!millis && millis !== 0) return "0:00";
        const minutes = Math.floor(millis / 60000);
        const seconds = ((millis % 60000) / 1000).toFixed(0);
        return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
    };

    const pulseValue = useSharedValue(1);
    useEffect(() => {
        if (isPlaying) {
            pulseValue.value = withRepeat(
                withSequence(
                    withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            pulseValue.value = withTiming(1);
        }
    }, [isPlaying]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scaleY: pulseValue.value }]
    }));

    return (
        <View style={styles.progressContainer}>
            <View
                onLayout={(e) => setBarLayout({ x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}
                style={styles.progressBarBg}
            >
                <ReAnimated.View style={[styles.progressBarFill, { backgroundColor: theme.primary }, progressStyle]}>
                    <ReAnimated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
                        <ReAnimated.View style={[StyleSheet.absoluteFill, waveStyle]}>
                            <LinearGradient
                                colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </ReAnimated.View>
                    </ReAnimated.View>
                </ReAnimated.View>
                <GestureDetector gesture={progressGesture}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent', marginVertical: -15 }]} />
                </GestureDetector>
            </View>
            <View style={styles.timeContainer}>
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(currentPosition)}</Text>
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(duration)}</Text>
            </View>
        </View>
    );
});



export const MaterialPlayerScreen = () => {
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const navigation = useNavigation<any>();
    const currentSong = usePlayerStore(state => state.currentTrack);
    const { playing: nativeIsPlaying, bufferingDuringPlay: isBuffering } = useIsPlaying();
    const isPlaying = nativeIsPlaying || isBuffering;
    const playPause = usePlayerStore(state => state.playPause);
    const nextTrack = usePlayerStore(state => state.nextTrack);
    const prevTrack = usePlayerStore(state => state.prevTrack);
    const seek = usePlayerStore(state => state.seek);
    const playlist = usePlayerStore(state => state.playlist);
    const currentIndex = usePlayerStore(state => state.currentIndex);
    const isShuffleOn = usePlayerStore(state => state.isShuffleOn);
    const toggleShuffle = usePlayerStore(state => state.toggleShuffle);
    const repeatMode = usePlayerStore(state => state.repeatMode);
    const toggleRepeat = usePlayerStore(state => state.toggleRepeat);
    const isSpatial = usePlayerStore(state => state.isSpatial);
    const playbackSpeed = usePlayerStore(state => state.playbackSpeed);
    const setPlaybackSpeed = usePlayerStore(state => state.setPlaybackSpeed);

    const { theme, playerStyle, isCarouselEnabled, isSwipeEnabled } = useTheme();
    const { toggleLike, isLiked, updateSongMetadata } = useMusicLibrary();

    const dynamicArtStyle = useMemo(() => {
        const size = isLandscape ? height * 0.75 : width - 60;
        let borderRadius = 24;
        switch (playerStyle) {
            case 'circle': borderRadius = size / 2; break;
            case 'sharp': borderRadius = 0; break;
            case 'square': default: borderRadius = 24; break;
        }
        return { width: size, height: size, borderRadius };
    }, [width, height, isLandscape, playerStyle]);

    const dynamicSideArtStyle = useMemo(() => {
        const size = isLandscape ? height * 0.5 : width * 0.6;
        let borderRadius = 12;
        switch (playerStyle) {
            case 'circle': borderRadius = size / 2; break;
            case 'sharp': borderRadius = 0; break;
            case 'square': default: borderRadius = 12; break;
        }
        return { width: size, height: size, borderRadius };
    }, [width, height, isLandscape, playerStyle]);

    const prevSong = currentIndex > 0 ? playlist[currentIndex - 1] : (repeatMode === 'all' ? playlist[playlist.length - 1] : null);
    const nextSong = repeatMode === 'one' ? currentSong : (currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : (repeatMode === 'all' ? playlist[0] : null));

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [lyricsModalVisible, setLyricsModalVisible] = useState(false);
    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [activeModalSong, setActiveModalSong] = useState<Song | null>(null);
    const [isAddingQueue, setIsAddingQueue] = useState(false);
    const [speedModalVisible, setSpeedModalVisible] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [recommendationsVisible, setRecommendationsVisible] = useState(false);

    const likeScale = useSharedValue(1);
    const animeLike = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }]
    }));
    const shuffleScale = useSharedValue(1);
    const repeatScale = useSharedValue(1);
    const playPauseScale = useSharedValue(1);
    const prevScale = useSharedValue(1);
    const nextScale = useSharedValue(1);
    const songTransition = useSharedValue(1);
    const slideDirection = useSharedValue(0);

    useEffect(() => {
        songTransition.value = 0;
        songTransition.value = withTiming(1, {
            duration: 350,
            easing: Easing.out(Easing.quad)
        });
    }, [currentSong?.id]);

    const contentTransitionStyle = useAnimatedStyle(() => ({
        opacity: songTransition.value,
        transform: [
            { translateX: 100 * (1 - songTransition.value) * (slideDirection.value || 1) }
        ] as any
    }));

    const handleNext = () => {
        if (isCarouselEnabled) {
            slideDirection.value = 1;
            // Delay for animation sync
            setTimeout(() => {
                nextTrack();
            }, 50);
        } else {
            nextTrack();
        }
    };

    const handlePrev = () => {
        if (isCarouselEnabled) {
            slideDirection.value = -1;
            setTimeout(() => {
                prevTrack();
            }, 50);
        } else {
            prevTrack();
        }
    };

    const handleLike = () => {
        if (!currentSong) return;
        likeScale.value = withSequence(
            withSpring(1.4, { damping: 3, stiffness: 200 }),
            withSpring(1, { damping: 3, stiffness: 200 })
        );
        toggleLike(currentSong);
    };

    const liked = currentSong ? isLiked(currentSong.id) : false;

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
        shuffleScale.value = withSequence(
            withTiming(0.85, { duration: 100 }),
            withSpring(1.0, { damping: 10 })
        );
        toggleShuffle();
    };

    const handleRepeatPress = () => {
        repeatScale.value = withSequence(
            withTiming(0.85, { duration: 100 }),
            withSpring(1.0, { damping: 10 })
        );
        toggleRepeat();
    };
    const handlePlayPausePress = () => {
        playPauseScale.value = 0.8;
        setTimeout(() => { playPauseScale.value = 1; }, 150);
        playPause();
    };
    const [feedback, setFeedback] = useState<'forward' | 'backward' | null>(null);
    const feedbackOpacity = useSharedValue(0);
    const feedbackScale = useSharedValue(0);
    const seekIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressRef = useRef(false);
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startSeeking = (direction: 'forward' | 'backward') => {
        if (seekIntervalRef.current) return;
        seekIntervalRef.current = setInterval(async () => {
            await TrackPlayer.seekBy(direction === 'forward' ? 5 : -5);
        }, 200);
    };

    const stopSeeking = () => {
        if (seekIntervalRef.current) {
            clearInterval(seekIntervalRef.current);
            seekIntervalRef.current = null;
        }
    };

    const handleNextIn = () => {
        nextScale.value = 0.8;
        isLongPressRef.current = false;
        longPressTimeoutRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            nextScale.value = 1.2;
            startSeeking('forward');
        }, 500);
    };

    const handleNextOut = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
        if (isLongPressRef.current) {
            stopSeeking();
            nextScale.value = 1;
        } else {
            handleNext();
            nextScale.value = 1;
        }
    };

    const handlePrevIn = () => {
        prevScale.value = 0.8;
        isLongPressRef.current = false;
        longPressTimeoutRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            prevScale.value = 1.2;
            startSeeking('backward');
        }, 500);
    };

    const handlePrevOut = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
        if (isLongPressRef.current) {
            stopSeeking();
            prevScale.value = 1;
        } else {
            handlePrev();
            prevScale.value = 1;
        }
    };

    const showFeedback = (type: 'forward' | 'backward') => {
        setFeedback(type);
        feedbackOpacity.value = 1;
        feedbackScale.value = 0.5;
        feedbackScale.value = withSpring(1);
        feedbackOpacity.value = withTiming(0, { duration: 800 });
    };

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onStart((e) => {
            const artworkWidth = dynamicArtStyle.width;
            const isRightSide = e.x > artworkWidth / 2;
            if (isRightSide) {
                runOnJS(showFeedback)('forward');
                runOnJS(TrackPlayer.seekBy)(10);
            } else {
                runOnJS(showFeedback)('backward');
                runOnJS(TrackPlayer.seekBy)(-10);
            }
        });

    const swipeGesture = Gesture.Pan()
        .minDistance(10)
        .activeOffsetX([-20, 20])
        .onEnd((e) => {
            if (!isSwipeEnabled) return;
            if (e.translationX > 60 || e.velocityX > 600) {
                runOnJS(handlePrev)();
            } else if (e.translationX < -60 || e.velocityX < -600) {
                runOnJS(handleNext)();
            }
        });

    const combinedGesture = Gesture.Exclusive(doubleTapGesture, swipeGesture);

    const feedbackStyle = useAnimatedStyle(() => ({
        opacity: feedbackOpacity.value,
        transform: [{ scale: feedbackScale.value }]
    }));

    return (
        <ScreenContainer variant="player">
            <View style={styles.safeArea}>
                {!isLandscape && (
                    <View style={[styles.headerMaterialDesign, { marginTop: 15 }]}>
                        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.headerIconBtn}>
                            <Ionicons name="chevron-down" size={32} color={theme.primary} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitleDesign, { color: theme.text, fontSize: 13, textTransform: 'uppercase' }]}>Now Playing</Text>
                        <TouchableOpacity onPress={() => setOptionsModalVisible(true)} style={styles.headerIconBtn}>
                            <Ionicons name="ellipsis-vertical" size={26} color={theme.primary} />
                        </TouchableOpacity>
                    </View>
                )}

                {isLandscape ? (
                    <View style={{ flex: 1 }}>
                        <View style={{ position: 'absolute', top: 15, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, zIndex: 100 }} pointerEvents="box-none">
                            <TouchableOpacity 
                                onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} 
                                style={{ padding: 10 }}
                            >
                                <Ionicons name="chevron-down" size={32} color={theme.text} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => setOptionsModalVisible(true)} 
                                style={{ padding: 10 }}
                            >
                                <Ionicons name="ellipsis-vertical" size={26} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 30, alignItems: 'center', zIndex: 1 }}>
                            {/* Left Side: Art Section */}
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                            {isCarouselEnabled ? (
                                <GestureDetector gesture={combinedGesture}>
                                    <View style={styles.carouselContainer}>
                                        <ReAnimated.View style={[styles.sideArtContainer, { left: -width * 0.25, opacity: 0.15, transform: [{ scale: 0.5 }] }, contentTransitionStyle]}>
                                            <View style={[styles.sideArtCard, dynamicSideArtStyle]}>
                                                <MusicImage uri={prevSong?.coverImage} id={prevSong?.id} style={{ width: '100%', height: '100%' }} iconSize={40} />
                                            </View>
                                        </ReAnimated.View>
                                        <ReAnimated.View style={[styles.artContainerContent, contentTransitionStyle, { zIndex: 10 }]}>
                                            <View style={[styles.artCardOriginal, dynamicArtStyle, { backgroundColor: theme.card, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 15 } }]}>
                                                <MusicImage uri={currentSong?.coverImage} id={currentSong?.id} assetUri={currentSong?.uri} style={{ width: '100%', height: '100%' }} iconSize={height * 0.4} />
                                                {feedback && (
                                                    <ReAnimated.View style={[styles.feedbackOverlay, feedbackStyle]}>
                                                        <LinearGradient
                                                            colors={['transparent', 'rgba(0,0,0,0.5)', 'transparent']}
                                                            style={StyleSheet.absoluteFill}
                                                        />
                                                        <View style={styles.feedbackContent}>
                                                            <Ionicons
                                                                name={feedback === 'forward' ? "play-forward" : "play-back"}
                                                                size={60}
                                                                color="#fff"
                                                            />
                                                            <Text style={styles.feedbackText}>
                                                                {feedback === 'forward' ? '+10s' : '-10s'}
                                                            </Text>
                                                        </View>
                                                    </ReAnimated.View>
                                                )}
                                            </View>
                                        </ReAnimated.View>
                                        <ReAnimated.View style={[styles.sideArtContainer, { right: -width * 0.25, opacity: 0.15, transform: [{ scale: 0.5 }] }, contentTransitionStyle]}>
                                            <View style={[styles.sideArtCard, dynamicSideArtStyle]}>
                                                <MusicImage uri={nextSong?.coverImage} id={nextSong?.id} style={{ width: '100%', height: '100%' }} iconSize={40} />
                                            </View>
                                        </ReAnimated.View>
                                    </View>
                                </GestureDetector>
                            ) : (
                                <GestureDetector gesture={combinedGesture}>
                                    <ReAnimated.View style={[styles.artContainerContent, contentTransitionStyle]}>
                                        <View style={[styles.artCardOriginal, dynamicArtStyle, { backgroundColor: theme.card, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 15 } }]}>
                                            <MusicImage uri={currentSong?.coverImage} id={currentSong?.id} assetUri={currentSong?.uri} style={{ width: '100%', height: '100%' }} iconSize={height * 0.4} />
                                            {feedback && (
                                                <ReAnimated.View style={[styles.feedbackOverlay, feedbackStyle]}>
                                                    <LinearGradient
                                                        colors={['transparent', 'rgba(0,0,0,0.5)', 'transparent']}
                                                        style={StyleSheet.absoluteFill}
                                                    />
                                                    <View style={styles.feedbackContent}>
                                                        <Ionicons
                                                            name={feedback === 'forward' ? "play-forward" : "play-back"}
                                                            size={60}
                                                            color="#fff"
                                                        />
                                                        <Text style={styles.feedbackText}>
                                                            {feedback === 'forward' ? '+10s' : '-10s'}
                                                        </Text>
                                                    </View>
                                                </ReAnimated.View>
                                            )}
                                        </View>
                                    </ReAnimated.View>
                                </GestureDetector>
                            )}
                        </View>

                        {/* Right Side: Info and Controls */}
                        <View style={{ flex: 1.2, justifyContent: 'center', paddingLeft: 20, paddingTop: 40 }}>
                            <View style={[styles.infoContainerMaterial, { marginVertical: 0, paddingHorizontal: 0 }]}>
                                <MarqueeText text={currentSong?.title || "Not Playing"} style={[styles.songTitleMaterial, { color: theme.text, fontSize: 24 }]} />
                                <Text numberOfLines={1} style={[styles.artistNameMaterial, { color: theme.primary, fontSize: 16 }]}>{currentSong?.artist || "Select a song"}</Text>
                                {currentSong?.album && currentSong?.album !== 'Unknown Album' && (
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.albumNameMaterial, { color: theme.textSecondary, fontSize: 12 }]}
                                    >
                                        {currentSong.album}
                                    </Text>
                                )}
                            </View>

                            <View style={{ marginVertical: 10 }}>
                                <ProgressBar seek={seek} isPlaying={isPlaying} theme={theme} />
                            </View>

                            <View style={[styles.controlsContainerMaterial, { marginBottom: 10 }]}>
                                <TouchableOpacity onPress={handleShufflePress} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} activeOpacity={0.6}>
                                    <ReAnimated.View style={animeShuffle}>
                                        <Ionicons name="shuffle-outline" size={20} color={isShuffleOn ? theme.primary : theme.textSecondary} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <View style={styles.mainControlsBlockMaterial}>
                                    <TouchableOpacity onPressIn={handlePrevIn} onPressOut={handlePrevOut} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <ReAnimated.View style={animatePrev}>
                                            <Ionicons name="play-skip-back-sharp" size={26} color={theme.text} />
                                        </ReAnimated.View>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.playButtonMaterial, { width: 56, height: 56 }]} onPress={handlePlayPausePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <ReAnimated.View style={animatePlayPause}>
                                            <Ionicons name={isPlaying ? "pause-sharp" : "play-sharp"} size={44} color={theme.text} />
                                        </ReAnimated.View>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPressIn={handleNextIn} onPressOut={handleNextOut} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <ReAnimated.View style={animateNext}>
                                            <Ionicons name="play-skip-forward-sharp" size={26} color={theme.text} />
                                        </ReAnimated.View>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={handleRepeatPress} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} activeOpacity={0.6}>
                                    <ReAnimated.View style={animeRepeat}>
                                        <MaterialCommunityIcons 
                                            name={repeatMode === 'one' ? "repeat-once" : "repeat"} 
                                            size={24} 
                                            color={repeatMode !== 'off' ? theme.primary : theme.textSecondary} 
                                        />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                            </View>
                            
                            <View style={[styles.extraControlsMaterial, { marginTop: 10 }]}>
                                <TouchableOpacity onPress={() => setRecommendationsVisible(true)} style={styles.materialIconBtn}>
                                    <Ionicons name="color-wand-outline" size={24} color={theme.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setLyricsModalVisible(true)} style={styles.materialIconBtn}>
                                    <Ionicons name="document-text-outline" size={24} color={theme.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleLike} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <ReAnimated.View style={[styles.materialIconBtn, animeLike]}>
                                        <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? '#ef4444' : theme.textSecondary} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.materialIconBtn} onPress={() => navigation.navigate('Queue')}>
                                    <Ionicons name="list-outline" size={24} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    </View>
                ) : (
                    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === 'android' ? 40 : 30 }}>
                        {/* Hero Album Art / Carousel */}
                        <View style={[styles.artSection, { height: 'auto', flex: 1 }]}>
                            {isCarouselEnabled ? (
                                <GestureDetector gesture={combinedGesture}>
                                    <View style={styles.carouselContainer}>
                                        <ReAnimated.View style={[styles.sideArtContainer, { left: -width * 0.45 }, contentTransitionStyle]}>
                                            <View style={[styles.sideArtCard, dynamicSideArtStyle, { opacity: 0.15, transform: [{ scale: 0.8 }] }]}>
                                                <MusicImage uri={prevSong?.coverImage} id={prevSong?.id} style={{ width: '100%', height: '100%' }} iconSize={40} />
                                            </View>
                                        </ReAnimated.View>
                                        <ReAnimated.View style={[styles.artContainerContent, contentTransitionStyle, { zIndex: 10 }]}>
                                            <View style={[styles.artCardOriginal, dynamicArtStyle, { backgroundColor: theme.card, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 15 } }]}>
                                                <MusicImage uri={currentSong?.coverImage} id={currentSong?.id} assetUri={currentSong?.uri} style={{ width: '100%', height: '100%' }} iconSize={width * 0.4} />
                                                {feedback && (
                                                    <ReAnimated.View style={[styles.feedbackOverlay, feedbackStyle]}>
                                                        <LinearGradient
                                                            colors={['transparent', 'rgba(0,0,0,0.5)', 'transparent']}
                                                            style={StyleSheet.absoluteFill}
                                                        />
                                                        <View style={styles.feedbackContent}>
                                                            <Ionicons
                                                                name={feedback === 'forward' ? "play-forward" : "play-back"}
                                                                size={60}
                                                                color="#fff"
                                                            />
                                                            <Text style={styles.feedbackText}>
                                                                {feedback === 'forward' ? '+10s' : '-10s'}
                                                            </Text>
                                                        </View>
                                                    </ReAnimated.View>
                                                )}
                                            </View>
                                        </ReAnimated.View>
                                        <ReAnimated.View style={[styles.sideArtContainer, { right: -width * 0.45 }, contentTransitionStyle]}>
                                            <View style={[styles.sideArtCard, dynamicSideArtStyle, { opacity: 0.15, transform: [{ scale: 0.8 }] }]}>
                                                <MusicImage uri={nextSong?.coverImage} id={nextSong?.id} style={{ width: '100%', height: '100%' }} iconSize={40} />
                                            </View>
                                        </ReAnimated.View>
                                    </View>
                                </GestureDetector>
                            ) : (
                                <GestureDetector gesture={combinedGesture}>
                                    <ReAnimated.View style={[styles.artContainerContent, contentTransitionStyle]}>
                                        <View style={[styles.artCardOriginal, dynamicArtStyle, { backgroundColor: theme.card, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 15 } }]}>
                                            <MusicImage uri={currentSong?.coverImage} id={currentSong?.id} assetUri={currentSong?.uri} style={{ width: '100%', height: '100%' }} iconSize={width * 0.4} />
                                            {feedback && (
                                                <ReAnimated.View style={[styles.feedbackOverlay, feedbackStyle]}>
                                                    <LinearGradient
                                                        colors={['transparent', 'rgba(0,0,0,0.5)', 'transparent']}
                                                        style={StyleSheet.absoluteFill}
                                                    />
                                                    <View style={styles.feedbackContent}>
                                                        <Ionicons
                                                            name={feedback === 'forward' ? "play-forward" : "play-back"}
                                                            size={60}
                                                            color="#fff"
                                                        />
                                                        <Text style={styles.feedbackText}>
                                                            {feedback === 'forward' ? '+10s' : '-10s'}
                                                        </Text>
                                                    </View>
                                                </ReAnimated.View>
                                            )}
                                        </View>
                                    </ReAnimated.View>
                                </GestureDetector>
                            )}
                        </View>
    
                        {/* Track Information */}
                        <View style={[styles.infoContainerMaterial, { marginTop: 0 }]}>
                            <View style={styles.titleArtistBlockMaterial}>
                                <MarqueeText
                                    text={currentSong?.title || "Not Playing"}
                                    style={[styles.songTitleMaterial, { color: theme.text }]}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[styles.artistNameMaterial, { color: theme.primary }]}
                                >
                                    {currentSong?.artist || "Select a song"}
                                </Text>
                                {currentSong?.album && currentSong?.album !== 'Unknown Album' && (
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.albumNameMaterial, { color: theme.textSecondary }]}
                                    >
                                        {currentSong.album}
                                    </Text>
                                )}
                            </View>
                        </View>
    
                        {/* Interactive Seek Bar */}
                        <View style={styles.seekSection}>
                            <ProgressBar seek={seek} isPlaying={isPlaying} theme={theme} />
                        </View>
    
                        {/* Dynamic Controls */}
                        <View style={styles.controlsContainerMaterial}>
                            <TouchableOpacity onPress={handleShufflePress} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} activeOpacity={0.6}>
                                <ReAnimated.View style={animeShuffle}>
                                    <Ionicons name="shuffle-outline" size={24} color={isShuffleOn ? theme.primary : theme.textSecondary} />
                                </ReAnimated.View>
                            </TouchableOpacity>
    
                            <View style={styles.mainControlsBlockMaterial}>
                                <TouchableOpacity onPressIn={handlePrevIn} onPressOut={handlePrevOut} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <ReAnimated.View style={animatePrev}>
                                        <Ionicons name="play-skip-back-sharp" size={30} color={theme.text} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                
                                <TouchableOpacity style={styles.playButtonMaterial} onPress={handlePlayPausePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <ReAnimated.View style={animatePlayPause}>
                                        <Ionicons name={isPlaying ? "pause-sharp" : "play-sharp"} size={52} color={theme.text} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
    
                                <TouchableOpacity onPressIn={handleNextIn} onPressOut={handleNextOut} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <ReAnimated.View style={animateNext}>
                                        <Ionicons name="play-skip-forward-sharp" size={30} color={theme.text} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                            </View>
    
                            <TouchableOpacity onPress={handleRepeatPress} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} activeOpacity={0.6}>
                                <ReAnimated.View style={animeRepeat}>
                                    <MaterialCommunityIcons 
                                        name={repeatMode === 'one' ? "repeat-once" : "repeat"} 
                                        size={24} 
                                        color={repeatMode !== 'off' ? theme.primary : theme.textSecondary} 
                                    />
                                </ReAnimated.View>
                            </TouchableOpacity>
                        </View>
    
                        {/* Secondary Actions */}
                        <View style={styles.extraControlsMaterial}>
                            <TouchableOpacity onPress={() => setRecommendationsVisible(true)} style={styles.materialIconBtn}>
                                <Ionicons name="color-wand-outline" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setLyricsModalVisible(true)} style={styles.materialIconBtn}>
                                <Ionicons name="document-text-outline" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleLike} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <ReAnimated.View style={[styles.materialIconBtn, animeLike]}>
                                    <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={liked ? '#ef4444' : theme.textSecondary} />
                                </ReAnimated.View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.materialIconBtn} onPress={() => navigation.navigate('Queue')}>
                                <Ionicons name="list-outline" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <SongOptionsMenu
                visible={optionsModalVisible}
                onClose={() => setOptionsModalVisible(false)}
                song={currentSong}
                currentSpeed={playbackSpeed}
                onPlaybackSpeedPress={() => { setOptionsModalVisible(false); setTimeout(() => setSpeedModalVisible(true), 100); }}
                onSharePress={() => { setOptionsModalVisible(false); setTimeout(() => setShareModalVisible(true), 100); }}
                onRequestPlaylistAdd={() => { setActiveModalSong(currentSong); setOptionsModalVisible(false); setTimeout(() => setPlaylistModalVisible(true), 100); }}
                onEditDetails={() => { setActiveModalSong(currentSong); setOptionsModalVisible(false); setTimeout(() => setEditModalVisible(true), 100); }}
            />

            <EditSongModal visible={editModalVisible} onClose={() => setEditModalVisible(false)} song={activeModalSong || currentSong} onSave={updateSongMetadata} />
            <LyricsModal visible={lyricsModalVisible} onClose={() => setLyricsModalVisible(false)} song={currentSong} />
            <ShareCardModal visible={shareModalVisible} onClose={() => setShareModalVisible(false)} song={currentSong} />

            {/* Playback Speed Modal */}
            <Modal
                visible={speedModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSpeedModalVisible(false)}
            >
                <TouchableOpacity
                    style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}
                    activeOpacity={1}
                    onPress={() => setSpeedModalVisible(false)}
                >
                    <View style={[styles.speedModalContent, { backgroundColor: theme.menuBackground, borderColor: theme.cardBorder, borderWidth: 1 }]}>
                        <Text style={[styles.speedModalTitle, { color: theme.text }]}>Playback Speed</Text>
                        <View style={styles.speedOptionsContainer}>
                            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.speedOption,
                                        playbackSpeed === s && { backgroundColor: theme.primary + '33' }
                                    ]}
                                    onPress={() => {
                                        setPlaybackSpeed(s);
                                        setSpeedModalVisible(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.speedOptionText,
                                        { color: playbackSpeed === s ? theme.primary : theme.text }
                                    ]}>
                                        {s === 1.0 ? 'Normal (1x)' : `${s}x`}
                                    </Text>
                                    {playbackSpeed === s && (
                                        <Ionicons name="checkmark" size={20} color={theme.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: theme.textSecondary + '10' }]}
                            onPress={() => setSpeedModalVisible(false)}
                        >
                            <Text style={[styles.closeButtonText, { color: theme.text }]}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <AddToPlaylistModal
                visible={playlistModalVisible}
                onClose={() => {
                    setPlaylistModalVisible(false);
                    setIsAddingQueue(false);
                    setActiveModalSong(null);
                }}
                songs={isAddingQueue ? playlist : (activeModalSong ? [activeModalSong] : currentSong ? [currentSong] : [])}
            />

            <RecommendationsModal
                visible={recommendationsVisible}
                onClose={() => setRecommendationsVisible(false)}
                song={currentSong}
            />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    headerMaterialDesign: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, paddingHorizontal: 20 },
    headerIconBtn: { padding: 8, borderRadius: 100 },
    headerTitleDesign: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7 },

    artSection: { height: Dimensions.get('window').width * 0.9, justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 0, marginBottom: 0, overflow: 'visible' },
    carouselContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative', overflow: 'visible' },
    sideArtContainer: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    sideArtCard: { overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12 },
    artGlowContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    artGlow: { position: 'absolute', width: Dimensions.get('window').width * 1.5, height: Dimensions.get('window').width * 1.5, borderRadius: Dimensions.get('window').width } as any,
    artCardOriginal: { overflow: 'hidden', elevation: 20 },
    
    infoContainerMaterial: { width: '100%', paddingHorizontal: 20, marginBottom: 15, zIndex: 10 },
    titleArtistBlockMaterial: { alignItems: 'center', width: '100%' },
    songTitleMaterial: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28, textAlign: 'center' },
    artistNameMaterial: { fontSize: 15, fontWeight: '700', opacity: 0.85, marginTop: 4, textAlign: 'center' },
    albumNameMaterial: { fontSize: 12, fontWeight: '600', opacity: 0.6, marginTop: 1, textAlign: 'center' },
    infoActionsMaterial: { marginLeft: 0 },
    likeBtnDesign: { padding: 4 },
    
    seekSection: { width: '100%', paddingHorizontal: 20, marginBottom: 8, zIndex: 10 },
    
    controlsContainerMaterial: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 20, marginBottom: 15, zIndex: 10 },
    mainControlsBlockMaterial: { flexDirection: 'row', alignItems: 'center', gap: 28 },
    playButtonMaterial: { 
        width: 64, 
        height: 64, 
        borderRadius: 32, 
        justifyContent: 'center', 
        alignItems: 'center'
    },
    
    shelfActions: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 25, paddingBottom: 20 },
    shelfBtn: { alignItems: 'center', gap: 6 },
    shelfLabel: { fontSize: 9, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 2, textTransform: 'uppercase' },
    
    // Original fallback styles
    progressContainer: { width: '100%', marginBottom: 12 },
    progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 2 },
    timeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    timeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    speedModalContent: { width: '100%', maxWidth: 300, borderRadius: 24, padding: 20, elevation: 10 },
    speedModalTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 15, textAlign: 'center' },
    speedOptionsContainer: { marginBottom: 10 },
    speedOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, marginBottom: 4 },
    speedOptionText: { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold' },
    closeButton: { marginTop: 10, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    closeButtonText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
    feedbackOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    feedbackContent: { alignItems: 'center', justifyContent: 'center' },
    feedbackText: { color: '#fff', fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    artContainerContent: { alignItems: 'center', justifyContent: 'center', width: '100%' },
    extraControlsMaterial: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 10, marginTop: 20 },
    materialIconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
});
