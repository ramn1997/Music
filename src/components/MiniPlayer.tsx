import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTheme } from '../hooks/ThemeContext';
import { MusicImage } from './MusicImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useProgress } from 'react-native-track-player';
import { useLibraryStore } from '../store/useLibraryStore';

export const MiniPlayer = ({ isSidebar = false }: { isSidebar?: boolean }) => {
    const navigation = useNavigation<any>();
    const currentSong = usePlayerStore(state => state.currentTrack);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const playPause = usePlayerStore(state => state.playPause);
    const toggleLike = useLibraryStore(state => state.toggleLike);
    const isLiked = useLibraryStore(state => state.likedSongs.some(s => s.id === currentSong?.id));
    const nextTrack = usePlayerStore(state => state.nextTrack);
    const prevTrack = usePlayerStore(state => state.prevTrack);
    const seek = usePlayerStore(state => state.seek);
    const { theme, themeType, playerStyle, navigationStyle } = useTheme();
    const insets = useSafeAreaInsets();
    const { position, duration } = useProgress(1000);
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isLandscape = windowWidth > windowHeight;

    const currentRouteName = useNavigationState(state =>
        state ? (state.routes[state.index]?.name || null) : null
    );

    const seekInterval = useRef<NodeJS.Timeout | null>(null);

    const isHiddenScreen = currentRouteName === 'Player' || currentRouteName === 'Queue' || currentRouteName === 'Settings' || currentRouteName === 'About' || currentRouteName === 'Equalizer';
    if (!currentSong || isHiddenScreen) return null;
    
    // If we're not in sidebar mode but it's landscape, hide standalone player
    // because it's now integrated into the sidebar on the left.
    if (!isSidebar && isLandscape) return null;

    const noTabBarScreens = ['Player', 'Settings', 'EditSong', 'Lyrics'];
    const hasTabBar = !noTabBarScreens.includes(currentRouteName || '');

    const isPillNav = navigationStyle === 'pill' || isLandscape;
    const bottomOffset = hasTabBar
        ? (isPillNav ? (isLandscape ? 105 : 105 + insets.bottom) : (68 + insets.bottom))
        : (isPillNav ? (15 + insets.bottom) : insets.bottom);

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    const getMiniRadius = () => {
        switch (playerStyle) {
            case 'circle': return 19;
            case 'sharp': return 0;
            case 'square': return 4;
            default: return 8;
        }
    };

    const startSeeking = (direction: 'forward' | 'backward') => {
        if (seekInterval.current) clearInterval(seekInterval.current);
        let skipAmount = 2000;
        let currentPosMs = position * 1000;
        const durMs = duration * 1000;
        seekInterval.current = setInterval(() => {
            currentPosMs = direction === 'forward' ? currentPosMs + skipAmount : currentPosMs - skipAmount;
            currentPosMs = Math.min(Math.max(currentPosMs, 0), durMs);
            seek(currentPosMs);
            skipAmount = Math.min(skipAmount * 1.3, 30000);
        }, 150);
    };

    const stopSeeking = () => {
        if (seekInterval.current) {
            clearInterval(seekInterval.current);
            seekInterval.current = null;
        }
    };

    return (
        <View key={`miniplayer-${isLandscape ? 'landscape' : 'portrait'}`} style={[
            !isSidebar && styles.container, 
            !isSidebar && (isLandscape ? {
                top: (insets?.top || 0) + 15,
                bottom: (insets?.bottom || 0) + 15,
                right: 15,
                left: 'auto',
                width: 72,
                justifyContent: 'center'
            } : { bottom: bottomOffset }),
            isSidebar && { width: '100%', alignItems: 'center', marginTop: 'auto' }
        ]}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Player')}
                style={[
                    styles.pillContainer,
                    isPillNav && !isLandscape ? [styles.floatingPill, { width: windowWidth - 30 }] :
                    isLandscape ? [styles.floatingPill, { width: 88, height: isSidebar ? 64 : '100%' }] : styles.standardBar,
                    {
                        maxWidth: isLandscape ? 88 : '100%',
                        borderWidth: isSidebar ? 0 : (isPillNav ? 1 : 0),
                        backgroundColor: isSidebar ? 'transparent' : (theme.background === '#000' || theme.background === '#050505' ? 'rgba(20,20,20,0.9)' : theme.card)
                    }
                ]}
            >
                {!isSidebar && (
                    <View style={StyleSheet.absoluteFill}>
                        <MusicImage uri={currentSong?.coverImage} id={currentSong?.id || ''} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={30} iconSize={0} />
                        <BlurView intensity={Platform.OS === 'ios' ? 30 : 60} tint={['black', 'forest', 'water', 'fire', 'cyber'].includes(themeType) ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />
                    </View>
                )}

                <View style={styles.blurContainer}>
                    {!isLandscape && (
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
                        </View>
                    )}
                    <View style={isLandscape ? [styles.contentRow, { flexDirection: 'column', paddingVertical: 0, paddingHorizontal: 0, justifyContent: 'center', alignItems: 'center' }] : styles.contentRow}>
                        {isLandscape ? (
                            <View style={{ width: 64, height: 64, borderRadius: 16, overflow: 'hidden' }}>
                                <MusicImage uri={currentSong?.coverImage} id={currentSong?.id || ''} style={StyleSheet.absoluteFill} iconSize={20} />
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }]}>
                                    <TouchableOpacity 
                                        activeOpacity={0.7} 
                                        onPress={(e) => { e.stopPropagation(); playPause(); }} 
                                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
                                    >
                                        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={styles.artContainer}>
                                    <MusicImage uri={currentSong?.coverImage} id={currentSong?.id || ''} style={[styles.albumArt, { borderRadius: getMiniRadius() + 2 }]} iconSize={20} />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={[styles.title, { color: 'white' }]} numberOfLines={1}>{currentSong?.title || 'No Song'}</Text>
                                    <Text style={[styles.artist, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>{currentSong?.artist || 'Unknown'}</Text>
                                </View>
                                <View style={styles.controls}>
                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggleLike(currentSong!); }} style={styles.controlButton}>
                                        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#ef4444" : "white"} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); prevTrack(); }} style={styles.controlButton}>
                                        <Ionicons name="play-skip-back" size={22} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); playPause(); }} style={styles.controlButton}>
                                        <Ionicons name={isPlaying ? "pause" : "play"} size={26} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); nextTrack(); }} style={styles.controlButton}>
                                        <Ionicons name="play-skip-forward" size={22} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 1000,
        alignItems: 'center',
    },
    pillContainer: {
        width: '100%',
        height: 68,
        overflow: 'hidden',
        elevation: 20,
    },
    floatingPill: {
        borderRadius: 36,
        height: 72,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    standardBar: {
        width: '100%',
        height: 68,
        borderRadius: 0,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    blurContainer: { flex: 1, justifyContent: 'center' },
    progressTrack: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        zIndex: 10,
    },
    progressFill: { height: '100%', borderRadius: 1 },
    contentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: '100%' },
    albumArt: { width: 44, height: 44, borderRadius: 10, marginRight: 8 },
    textContainer: { flex: 1, justifyContent: 'center', marginRight: 6 },
    title: { fontSize: 13, fontWeight: 'bold' },
    artist: { fontSize: 11, opacity: 0.7 },
    controls: { flexDirection: 'row', alignItems: 'center' },
    controlButton: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
    artContainer: { position: 'relative', marginRight: 10 }
});
