import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, PanResponder, Animated, Modal, Platform, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
const FlashListAny = FlashList as any;
import ReAnimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withSpring, withDelay, Easing, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
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

    const updateSeekPosition = (locationX: number) => {
        const layout = barLayoutRef.current;
        const dur = durationRef.current;
        if (layout.width > 0 && dur > 0) {
            const newProgress = Math.min(Math.max(locationX / layout.width, 0), 1);
            setSeekPosition(newProgress * dur);
        }
    };

    const commitSeek = (locationX: number) => {
        const layout = barLayoutRef.current;
        const dur = durationRef.current;
        if (layout.width > 0 && dur > 0) {
            const newProgress = Math.min(Math.max(locationX / layout.width, 0), 1);
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
                updateSeekPosition(evt.nativeEvent.locationX);
            },
            onPanResponderMove: (evt) => {
                updateSeekPosition(evt.nativeEvent.locationX);
            },
            onPanResponderRelease: (evt) => {
                commitSeek(evt.nativeEvent.locationX);
                setIsSeeking(false);
            },
            onPanResponderTerminate: () => setIsSeeking(false),
        }).panHandlers;
    }, [seek, duration]);

    const currentPosition = isSeeking ? seekPosition : position;
    const progress = duration > 0 ? currentPosition / duration : 0;

    const formatTime = (millis: number) => {
        if (!millis && millis !== 0) return "0:00";
        const minutes = Math.floor(millis / 60000);
        const seconds = ((millis % 60000) / 1000).toFixed(0);
        return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
    };

    return (
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
                <View 
                    style={{ position: 'absolute', top: -20, bottom: -20, left: 0, right: 0 }} 
                    {...panHandlers} 
                />
            </View>
            <View style={styles.timeContainer}>
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(currentPosition)}</Text>
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(duration)}</Text>
            </View>
        </View>
    );
});



export const ClassicPlayerScreen = () => {
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
    const playlistName = usePlayerStore(state => state.playlistName);
    const isShuffleOn = usePlayerStore(state => state.isShuffleOn);
    const toggleShuffle = usePlayerStore(state => state.toggleShuffle);
    const repeatMode = usePlayerStore(state => state.repeatMode);
    const toggleRepeat = usePlayerStore(state => state.toggleRepeat);
    const playbackSpeed = usePlayerStore(state => state.playbackSpeed);
    const setPlaybackSpeed = usePlayerStore(state => state.setPlaybackSpeed);
    const isSpatial = usePlayerStore(state => state.isSpatial);
    const toggleSpatial = usePlayerStore(state => state.toggleSpatial);
    const isGapless = usePlayerStore(state => state.isGapless);

    const { theme, themeType, playerStyle, isCarouselEnabled, isSwipeEnabled } = useTheme();
    const { toggleLike, isLiked, updateSongMetadata } = useMusicLibrary();

    const dynamicArtStyle = useMemo(() => {
        const size = isLandscape ? height * 0.75 : width - 60;
        let borderRadius = 12;
        switch (playerStyle) {
            case 'circle': borderRadius = size / 2; break;
            case 'sharp': borderRadius = 0; break;
            case 'square': default: borderRadius = 12; break;
        }
        return { width: size, height: size, borderRadius };
    }, [width, height, isLandscape, playerStyle]);

    const dynamicSideArtStyle = useMemo(() => {
        const size = isLandscape ? height * 0.4 : width * 0.6;
        let borderRadius = 12;
        switch (playerStyle) {
            case 'circle': borderRadius = size / 2; break;
            case 'sharp': borderRadius = 0; break;
            case 'square': default: borderRadius = 8; break;
        }
        return { width: size, height: size, borderRadius };
    }, [width, height, isLandscape, playerStyle]);

    const dynamicCarouselStyle = useMemo(() => ({
        height: isLandscape ? height * 0.6 : width - 60,
    }), [width, height, isLandscape]);


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
        slideDirection.value = 1;
        nextTrack();
    };

    const handlePrev = () => {
        slideDirection.value = -1;
        prevTrack();
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
                    <View style={[styles.header, { zIndex: 1000, marginTop: 15 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}>
                                <Ionicons name="chevron-down" size={30} color={theme.text} />
                            </TouchableOpacity>
                            <View style={{ marginLeft: 10, flex: 1 }}>
                                <Text style={[styles.headerSubTitle, { color: theme.textSecondary, fontSize: 11, textTransform: 'uppercase' }]}>Now Playing</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                            <TouchableOpacity onPress={handleLike}>
                                <ReAnimated.View style={animeLike}>
                                    <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? '#ef4444' : theme.textSecondary} />
                                </ReAnimated.View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setRecommendationsVisible(true)}>
                                <Ionicons name="color-wand-outline" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setLyricsModalVisible(true)}>
                                <Ionicons name="document-text-outline" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setOptionsModalVisible(true)}>
                                <Ionicons name="ellipsis-vertical" size={26} color={theme.text} />
                            </TouchableOpacity>
                        </View>
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
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                {isCarouselEnabled ? (
                                <GestureDetector gesture={combinedGesture}>
                                    <View style={styles.carouselContainer}>
                                        <ReAnimated.View style={[styles.sideArtContainer, { left: -width * 0.25, opacity: 0.15, transform: [{ scale: 0.5 }] }, contentTransitionStyle]}>
                                            <View style={[styles.sideArtCard, dynamicSideArtStyle]}>
                                                <MusicImage uri={prevSong?.coverImage} id={prevSong?.id} style={{ width: '100%', height: '100%' }} iconSize={40} />
                                            </View>
                                        </ReAnimated.View>
                                        <ReAnimated.View style={[styles.artContainer, contentTransitionStyle, { zIndex: 10 }]}>
                                        <GlassCard style={[styles.artCard, dynamicArtStyle]} contentStyle={{ padding: 0, width: '100%', height: '100%' }}>
                                                <MusicImage uri={currentSong?.coverImage} id={currentSong?.id} assetUri={currentSong?.uri} style={{ width: '100%', height: '100%' }} iconSize={height * 0.3} />
                                                {feedback && (
                                                    <ReAnimated.View style={[styles.feedbackOverlay, feedbackStyle]}>
                                                        <View style={styles.feedbackContent}>
                                                            <Ionicons
                                                                name={feedback === 'forward' ? "play-forward-sharp" : "play-back-sharp"}
                                                                size={height * 0.15}
                                                                color="#fff"
                                                            />
                                                            <Text style={[styles.feedbackText, { fontSize: height * 0.05 }]}>
                                                                {feedback === 'forward' ? '+10s' : '-10s'}
                                                            </Text>
                                                        </View>
                                                    </ReAnimated.View>
                                                )}
                                            </GlassCard>
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
                                    <ReAnimated.View style={[styles.artContainer, contentTransitionStyle]}>
                                        <GlassCard style={[styles.artCard, dynamicArtStyle]} contentStyle={{ padding: 0, width: '100%', height: '100%' }}>
                                            <MusicImage uri={currentSong?.coverImage} id={currentSong?.id} assetUri={currentSong?.uri} style={{ width: '100%', height: '100%' }} iconSize={height * 0.3} />
                                            {feedback && (
                                                <ReAnimated.View style={[styles.feedbackOverlay, feedbackStyle]}>
                                                    <View style={styles.feedbackContent}>
                                                        <Ionicons
                                                            name={feedback === 'forward' ? "play-forward-sharp" : "play-back-sharp"}
                                                            size={height * 0.15}
                                                            color="#fff"
                                                        />
                                                        <Text style={[styles.feedbackText, { fontSize: height * 0.05 }]}>
                                                            {feedback === 'forward' ? '+10s' : '-10s'}
                                                        </Text>
                                                    </View>
                                                </ReAnimated.View>
                                            )}
                                        </GlassCard>
                                    </ReAnimated.View>
                                </GestureDetector>
                            )}
                        </View>

                        {/* Right Side: Info and Controls */}
                        <View style={{ flex: 1.2, justifyContent: 'center', paddingLeft: 30, paddingRight: 10, paddingTop: 40 }}>
                            <ReAnimated.View style={[styles.infoContainer, { paddingHorizontal: 0, marginBottom: 10, flexDirection: 'column', alignItems: 'flex-start' }, contentTransitionStyle]}>
                                <MarqueeText
                                    text={currentSong?.title || "Not Playing"}
                                    style={[styles.songTitle, { color: theme.text, fontSize: 20 }]}
                                />
                                <Text numberOfLines={1} style={[styles.artistName, { color: theme.textSecondary, fontSize: 13 }]}>{currentSong?.artist || "Select a song"}</Text>
                                <Text numberOfLines={1} style={[styles.albumName, { color: theme.textSecondary, opacity: 0.6, fontSize: 11 }]}>{currentSong?.album || "Unknown Album"}</Text>
                            </ReAnimated.View>

                            <ProgressBar seek={seek} isPlaying={isPlaying} theme={theme} />

                            <View style={[styles.controlsContainer, { marginTop: 10, marginBottom: 5, paddingHorizontal: 0 }]}>
                                <TouchableOpacity onPress={handleShufflePress}>
                                    <ReAnimated.View style={animeShuffle}>
                                        <Ionicons name="shuffle-outline" size={20} color={isShuffleOn ? theme.primary : theme.textSecondary} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <TouchableOpacity onPressIn={handlePrevIn} onPressOut={handlePrevOut} activeOpacity={0.7}>
                                    <ReAnimated.View style={animatePrev}>
                                        <Ionicons name="play-skip-back-sharp" size={24} color={theme.text} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.playButton, { width: 52, height: 52 }]} onPress={handlePlayPausePress}>
                                    <ReAnimated.View style={animatePlayPause}>
                                        <Ionicons name={isPlaying ? "pause-sharp" : "play-sharp"} size={32} color={theme.text} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <TouchableOpacity onPressIn={handleNextIn} onPressOut={handleNextOut} activeOpacity={0.7}>
                                    <ReAnimated.View style={animateNext}>
                                        <Ionicons name="play-skip-forward-sharp" size={24} color={theme.text} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleRepeatPress}>
                                    <ReAnimated.View style={animeRepeat}>
                                        <Ionicons name="repeat-outline" size={20} color={repeatMode !== 'off' ? theme.primary : theme.textSecondary} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <TouchableOpacity onPress={handleLike} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <ReAnimated.View style={animeLike}>
                                        <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? '#ef4444' : theme.textSecondary} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setRecommendationsVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Ionicons name="color-wand-outline" size={22} color={theme.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setLyricsModalVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Ionicons name="document-text-outline" size={22} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>


                            <TouchableOpacity style={[styles.upNextContainer, { marginBottom: 10, width: '100%', marginHorizontal: 0 }]} onPress={() => navigation.navigate('Queue')}>
                                <View style={styles.upNextLeft}>
                                    <Text style={[styles.upNextLabel, { color: theme.textSecondary }]}>Up next</Text>
                                    <Text style={[styles.upNextSong, { color: theme.text }]} numberOfLines={1}>{nextSong ? nextSong.title : 'End of queue'}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    </View>
                ) : (
                    <View style={{ flex: 1, paddingHorizontal: 0, paddingTop: 10, paddingBottom: Platform.OS === 'android' ? 40 : 30 }}>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                            {isCarouselEnabled ? (
                                <GestureDetector gesture={combinedGesture}>
                                    <View style={styles.carouselContainer}>
                                        <ReAnimated.View style={[styles.sideArtContainer, { left: -width * 0.45 }, contentTransitionStyle]}>
                                            <View style={[styles.sideArtCard, dynamicSideArtStyle, { opacity: 0.4, transform: [{ scale: 0.8 }] }]}>
                                                <MusicImage uri={prevSong?.coverImage} id={prevSong?.id} style={{ width: '100%', height: '100%' }} iconSize={40} />
                                            </View>
                                        </ReAnimated.View>
                                        <ReAnimated.View style={[styles.artContainer, contentTransitionStyle, { zIndex: 10 }]}>
                                            <GlassCard style={[styles.artCard, dynamicArtStyle]} contentStyle={{ padding: 0, width: '100%', height: '100%' }}>
                                                <MusicImage uri={currentSong?.coverImage} id={currentSong?.id} assetUri={currentSong?.uri} style={{ width: '100%', height: '100%' }} iconSize={width * 0.4} />
                                                {feedback && (
                                                    <ReAnimated.View style={[styles.feedbackOverlay, feedbackStyle]}>
                                                        <LinearGradient
                                                            colors={['transparent', 'rgba(0,0,0,0.5)', 'transparent']}
                                                            style={StyleSheet.absoluteFill}
                                                        />
                                                        <View style={styles.feedbackContent}>
                                                            <Ionicons
                                                                name={feedback === 'forward' ? "play-forward-sharp" : "play-back-sharp"}
                                                                size={50}
                                                                color="#fff"
                                                            />
                                                            <Text style={styles.feedbackText}>
                                                                {feedback === 'forward' ? '+10s' : '-10s'}
                                                            </Text>
                                                        </View>
                                                    </ReAnimated.View>
                                                )}
                                            </GlassCard>
                                        </ReAnimated.View>
                                        <ReAnimated.View style={[styles.sideArtContainer, { right: -width * 0.45 }, contentTransitionStyle]}>
                                            <View style={[styles.sideArtCard, dynamicSideArtStyle, { opacity: 0.4, transform: [{ scale: 0.8 }] }]}>
                                                <MusicImage uri={nextSong?.coverImage} id={nextSong?.id} style={{ width: '100%', height: '100%' }} iconSize={40} />
                                            </View>
                                        </ReAnimated.View>
                                    </View>
                                </GestureDetector>
                            ) : (
                                <GestureDetector gesture={combinedGesture}>
                                    <ReAnimated.View style={[styles.artContainer, contentTransitionStyle]}>
                                        <GlassCard style={[styles.artCard, dynamicArtStyle]} contentStyle={{ padding: 0, width: '100%', height: '100%' }}>
                                            <MusicImage uri={currentSong?.coverImage} id={currentSong?.id} assetUri={currentSong?.uri} style={{ width: '100%', height: '100%' }} iconSize={width * 0.4} />
                                            {feedback && (
                                                <ReAnimated.View style={[styles.feedbackOverlay, feedbackStyle]}>
                                                    <LinearGradient
                                                        colors={['transparent', 'rgba(0,0,0,0.5)', 'transparent']}
                                                        style={StyleSheet.absoluteFill}
                                                    />
                                                    <View style={styles.feedbackContent}>
                                                        <Ionicons
                                                            name={feedback === 'forward' ? "play-forward-sharp" : "play-back-sharp"}
                                                            size={60}
                                                            color="#fff"
                                                        />
                                                        <Text style={styles.feedbackText}>
                                                            {feedback === 'forward' ? '+10s' : '-10s'}
                                                        </Text>
                                                    </View>
                                                </ReAnimated.View>
                                            )}
                                        </GlassCard>
                                    </ReAnimated.View>
                                </GestureDetector>
                            )}
                        </View>



                        <View style={{ flex: 1, justifyContent: 'space-evenly', width: '100%', paddingTop: 10 }}>
                            <View style={[styles.bottomControlsBlock, { width: '100%' }]}>
                            {isSpatial && (
                                <SpatialAudioEngine 
                                    songUrl={currentSong?.uri} 
                                    isPlaying={isPlaying} 
                                    onEnded={nextTrack}
                                    onProgress={() => {}} 
                                    seekPosition={null} 
                                />
                            )}

                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 30, marginBottom: 15 }}>
                                {/* Removed Spatial and Quality toggles from here per request */}
                            </View>

                            <ReAnimated.View style={[styles.infoContainer, contentTransitionStyle, { marginTop: 0 }]}>
                                <View style={{ flex: 1 }}>
                                    <MarqueeText
                                        text={currentSong?.title || "Not Playing"}
                                        style={[styles.songTitle, { color: theme.text }]}
                                    />
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.albumName, { color: theme.textSecondary }]}
                                    >
                                        {currentSong?.album || "Unknown Album"}
                                    </Text>
                                    <Text
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={[styles.artistName, { color: theme.textSecondary, opacity: 0.6 }]}
                                    >
                                        {currentSong?.artist || "Select a song"}
                                    </Text>
                                </View>

                            </ReAnimated.View>

                            <ProgressBar seek={seek} isPlaying={isPlaying} theme={theme} />



                            <View style={styles.controlsContainer}>
                                <TouchableOpacity onPress={handleShufflePress}>
                                    <ReAnimated.View style={animeShuffle}>
                                        <Ionicons name="shuffle-outline" size={24} color={isShuffleOn ? theme.primary : theme.textSecondary} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPressIn={handlePrevIn}
                                    onPressOut={handlePrevOut}
                                    activeOpacity={0.7}
                                >
                                    <ReAnimated.View style={animatePrev}>
                                        <Ionicons name="play-skip-back-sharp" size={30} color={theme.text} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.playButton} onPress={handlePlayPausePress}>
                                    <ReAnimated.View style={animatePlayPause}>
                                        <Ionicons name={isPlaying ? "pause-sharp" : "play-sharp"} size={52} color={theme.text} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPressIn={handleNextIn}
                                    onPressOut={handleNextOut}
                                    activeOpacity={0.7}
                                >
                                    <ReAnimated.View style={animateNext}>
                                        <Ionicons name="play-skip-forward-sharp" size={30} color={theme.text} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleRepeatPress}>
                                    <ReAnimated.View style={animeRepeat}>
                                        <View style={{ position: 'relative' }}>
                                            <Ionicons name="repeat-outline" size={24} color={repeatMode !== 'off' ? theme.primary : theme.textSecondary} />
                                            {repeatMode === 'one' && (
                                                <View style={{
                                                    position: 'absolute',
                                                    top: 6,
                                                    right: -2,
                                                    backgroundColor: theme.primary,
                                                    borderRadius: 5,
                                                    width: 10,
                                                    height: 10,
                                                    justifyContent: 'center',
                                                    alignItems: 'center'
                                                }}>
                                                    <Text style={{ fontSize: 7, color: theme.textOnPrimary, fontWeight: 'bold' }}>1</Text>
                                                </View>
                                            )}
                                        </View>
                                    </ReAnimated.View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.upNextContainer, { width: '80%', alignSelf: 'center', marginBottom: 0 }]}
                            onPress={() => navigation.navigate('Queue')}
                        >
                            <View style={styles.upNextLeft}>
                                <Text style={[styles.upNextLabel, { color: theme.textSecondary }]}>
                                    {repeatMode === 'one' ? 'Repeating' : 'Up next'}
                                </Text>
                                <Text style={[styles.upNextSong, { color: theme.text }]} numberOfLines={1}>
                                    {nextSong
                                        ? `${nextSong.title} — ${nextSong.artist}`
                                        : 'End of queue'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 25 },
    headerSubTitle: { fontSize: 10, letterSpacing: 1, fontFamily: 'PlusJakartaSans_600SemiBold', opacity: 0.7 },
    headerMainTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
    artContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 0, marginBottom: 0 },
    artCard: { borderRadius: 12, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 },
    infoContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, marginBottom: 20 },
    songTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 2 },
    albumName: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', opacity: 0.8, marginBottom: 1 },
    artistName: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular' },
    progressContainer: { paddingHorizontal: 25, marginBottom: 10 },
    progressBarBg: { height: 4, backgroundColor: 'rgba(150,150,150,0.2)', borderRadius: 2, marginBottom: 10, position: 'relative' },
    progressBarFill: { height: '100%', borderRadius: 2 },
    progressKnob: { width: 12, height: 12, borderRadius: 6, position: 'absolute', top: -4, marginLeft: -6 },
    timeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    timeText: { fontSize: 12 },
    bottomControlsBlock: { marginBottom: 10 },
    controlsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginBottom: 20 },
    playButton: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    repeatOneBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 6, width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
    iconButton: { justifyContent: 'center', alignItems: 'center', width: 44, height: 44, borderRadius: 22 },
    lyricsButton: { justifyContent: 'center', alignItems: 'center' },
    upNextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 11,
        paddingHorizontal: 16,
        borderRadius: 14,
        marginBottom: 20
    },
    upNextLeft: { flex: 1 },
    upNextLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_600SemiBold', textTransform: 'uppercase', marginBottom: 2 },
    upNextSong: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
    carouselContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 20,
        marginBottom: 20,
        position: 'relative',
        overflow: 'visible'
    },
    sideArtContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sideArtCard: {
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    speedModalContent: {
        width: '100%',
        maxWidth: 300,
        borderRadius: 24,
        padding: 20,
        elevation: 10,
    },
    speedModalTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 15,
        textAlign: 'center'
    },
    speedOptionsContainer: {
        marginBottom: 10
    },
    speedOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 12,
        marginBottom: 4
    },
    speedOptionText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold'
    },
    closeButton: {
        marginTop: 10,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center'
    },
    closeButtonText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold'
    },
    speedButton: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    feedbackOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    feedbackContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedbackText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginTop: 5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },

});
