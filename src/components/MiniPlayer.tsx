import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerContext } from '../hooks/PlayerContext';
import { useTheme } from '../hooks/ThemeContext';
import { MusicImage } from './MusicImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useProgress } from 'react-native-track-player';

export const MiniPlayer = () => {
    const navigation = useNavigation<any>();
    const { currentSong, isPlaying, playPause, nextTrack, prevTrack, seek } = usePlayerContext();
    const { theme, themeType, playerStyle } = useTheme();
    const insets = useSafeAreaInsets();
    const { position, duration } = useProgress(1000); // 1s update for mini player is enough

    // Get current route name to hide mini player when on Player screen
    const currentRouteName = useNavigationState(state =>
        state ? state.routes[state.index].name : null
    );

    const seekInterval = useRef<NodeJS.Timeout | null>(null);

    // Only hide mini player when on the full Player screen, Settings screen, About screen, or if no song exists
    const isHiddenScreen = currentRouteName === 'Player' || currentRouteName === 'Settings' || currentRouteName === 'About';
    if (!currentSong || isHiddenScreen) return null;

    // List of screens that DO NOT have a bottom tab bar
    const noTabBarScreens = ['Player', 'Settings', 'Equalizer', 'EditSong', 'Lyrics'];
    const hasTabBar = !noTabBarScreens.includes(currentRouteName || '');

    // The tab bar is floating with bottom offset. Adjust mini player to sit perfectly above it.
    const tabBarHeight = 75 + Math.max(insets.bottom, 10);
    const bottomOffset = hasTabBar ? (tabBarHeight + 5) : (insets.bottom + 10);

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    const getMiniRadius = () => {
        switch (playerStyle) {
            case 'circle': return 19;

            case 'sharp': return 0;
            case 'soft': return 12;
            case 'square': return 4;
            default: return 6;
        }
    };

    const startSeeking = (direction: 'forward' | 'backward') => {
        if (seekInterval.current) clearInterval(seekInterval.current);
        let skipAmount = 2000;
        let currentPosMs = position * 1000;
        const durMs = duration * 1000;
        const acceleration = 1.3;
        const maxSkip = 30000;
        currentPosMs = direction === 'forward' ? currentPosMs + 2000 : currentPosMs - 2000;
        currentPosMs = Math.min(Math.max(currentPosMs, 0), durMs);
        seek(currentPosMs);
        seekInterval.current = setInterval(() => {
            currentPosMs = direction === 'forward' ? currentPosMs + skipAmount : currentPosMs - skipAmount;
            currentPosMs = Math.min(Math.max(currentPosMs, 0), durMs);
            seek(currentPosMs);
            skipAmount = Math.min(skipAmount * acceleration, maxSkip);
        }, 150);
    };

    const stopSeeking = () => {
        if (seekInterval.current) {
            clearInterval(seekInterval.current);
            seekInterval.current = null;
        }
    };


    return (
        <View
            style={[styles.container, { bottom: bottomOffset }]}
            key={currentSong?.id || 'no-song'}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Player')}
                style={[styles.pillContainer, {
                    overflow: 'hidden',
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.background === '#000' || theme.background === '#050505' ? 'rgba(20,20,20,0.9)' : theme.card
                }]}
            >
                {/* Adaptive Background based on Album Art */}
                <View style={StyleSheet.absoluteFill}>
                    <MusicImage
                        uri={currentSong?.coverImage}
                        id={currentSong?.id || ''}
                        assetUri={currentSong?.uri}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                        blurRadius={Platform.OS === 'ios' ? 20 : 30}
                        iconSize={0}
                    />
                    <BlurView
                        intensity={Platform.OS === 'ios' ? 30 : 60}
                        tint={['black', 'green', 'purple', 'blue'].includes(themeType) ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* Subtle Gradient Overlay for depth */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
                        style={StyleSheet.absoluteFill}
                    />
                </View>

                <View style={styles.blurContainer}>
                    {/* Progress Bar Line */}
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
                    </View>
                    <View style={styles.contentRow}>
                        {/* Album Art */}
                        <View style={styles.artContainer}>
                            <MusicImage
                                uri={currentSong?.coverImage}
                                id={currentSong?.id || ''}
                                style={[styles.albumArt, { borderRadius: getMiniRadius() }]}
                                iconSize={20}
                                containerStyle={[styles.albumArt, { backgroundColor: theme.card, borderRadius: getMiniRadius() }]}
                            />
                        </View>

                        {/* Song Info */}
                        <View style={styles.textContainer}>
                            <Text style={[styles.title, { color: 'white' }]} numberOfLines={1}>
                                {currentSong?.title || 'No Song Playing'}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.artist, { color: 'rgba(255,255,255,0.7)', flex: 1 }]} numberOfLines={1}>
                                    {currentSong?.artist || 'Unknown Artist'}
                                </Text>
                            </View>
                        </View>

                        {/* Controls */}
                        <View style={styles.controls}>
                            <TouchableOpacity
                                onPress={(e) => { e.stopPropagation(); prevTrack(); }}
                                onLongPress={(e) => { e.stopPropagation(); startSeeking('backward'); }}
                                onPressOut={(e) => { e.stopPropagation(); stopSeeking(); }}
                                delayLongPress={300}
                                style={styles.controlButton}
                            >
                                <Ionicons name="play-skip-back" size={22} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); playPause(); }} style={styles.controlButton}>
                                <Ionicons
                                    name={isPlaying ? "pause" : "play"}
                                    size={28}
                                    color="white"
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={(e) => { e.stopPropagation(); nextTrack(); }}
                                onLongPress={(e) => { e.stopPropagation(); startSeeking('forward'); }}
                                onPressOut={(e) => { e.stopPropagation(); stopSeeking(); }}
                                delayLongPress={300}
                                style={styles.controlButton}
                            >
                                <Ionicons name="play-skip-forward" size={22} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 15,
        right: 15,
        zIndex: 1000, // Significantly higher to be above everything
        alignItems: 'center',
    },
    pillContainer: {
        width: '100%',
        height: 60,
        borderRadius: 30, // Make it pill shape
        overflow: 'hidden',
        borderWidth: 1, // Full border instead of top/bottom
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: '#121212', // Solid dark fallback for visibility
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4, // Higher shadow
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 20, // Even higher elevation
    },
    blurContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    progressTrack: {
        position: 'absolute',
        bottom: 0,
        left: 20, // inset for the pill bounds
        right: 20,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        zIndex: 10,
    },
    progressFill: {
        height: '100%',
        borderRadius: 1,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: '100%',
    },
    albumArt: {
        width: 38,
        height: 38,
        borderRadius: 6,
        marginRight: 8,
        backgroundColor: 'transparent'
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 6,
    },
    title: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    artist: {
        fontSize: 11,
        opacity: 0.7,
    },

    controls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    artContainer: {
        position: 'relative',
        marginRight: 10,
    }
});
