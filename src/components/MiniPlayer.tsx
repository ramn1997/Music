import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerContext } from '../hooks/PlayerContext';
import { useTheme } from '../hooks/ThemeContext';
import { MusicImage } from './MusicImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

export const MiniPlayer = () => {
    const navigation = useNavigation<any>();
    const { currentSong, isPlaying, playPause, position, duration, nextTrack, prevTrack } = usePlayerContext();
    const { theme, themeType } = useTheme();
    const insets = useSafeAreaInsets();

    // Get current route name to hide mini player when on Player screen
    const currentRouteName = useNavigationState(state =>
        state ? state.routes[state.index].name : null
    );

    // Only hide mini player when on the full Player screen, Settings screen, or if no song exists
    if (!currentSong || currentRouteName === 'Player' || currentRouteName === 'Settings') return null;

    // List of screens that DO NOT have a bottom tab bar
    const noTabBarScreens = ['Player', 'Settings', 'Equalizer', 'EditSong', 'Lyrics'];
    const hasTabBar = !noTabBarScreens.includes(currentRouteName || '');

    // The TabBar height is 65 + insets.bottom
    const bottomOffset = hasTabBar ? (65 + insets.bottom) : insets.bottom;

    const progress = duration > 0 ? (position / duration) * 100 : 0;


    return (
        <View
            style={[styles.container, { bottom: bottomOffset }]}
            key={currentSong?.id || 'no-song'}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Player')}
                style={[styles.pillContainer, { overflow: 'hidden', borderColor: 'rgba(255,255,255,0.1)', backgroundColor: theme.background }]}
            >
                {/* Adaptive Background based on Album Art (Pure JS Fallback) */}
                {/* Adaptive Background based on Album Art */}
                <View style={StyleSheet.absoluteFill}>
                    <MusicImage
                        uri={currentSong?.coverImage}
                        id={currentSong?.id || ''}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                        blurRadius={50}
                        iconSize={0} // Hide icon for background
                    />
                    {/* Overlay to ensure it feels solid and text is readable */}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
                </View>
                <View style={[styles.blurContainer]}>
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
                                style={styles.albumArt}
                                iconSize={20}
                                containerStyle={[styles.albumArt, { backgroundColor: theme.card }]}
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
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); prevTrack(); }} style={styles.controlButton}>
                                <Ionicons name="play-back" size={22} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); playPause(); }} style={styles.controlButton}>
                                <Ionicons
                                    name={isPlaying ? "pause" : "play"}
                                    size={28}
                                    color="white"
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); nextTrack(); }} style={styles.controlButton}>
                                <Ionicons name="play-forward" size={22} color="white" />
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
        left: 0,
        right: 0,
        zIndex: 1000, // Significantly higher to be above everything
        alignItems: 'center',
    },
    pillContainer: {
        width: '100%',
        height: 60,
        borderRadius: 0,
        overflow: 'hidden',
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 8,
    },
    blurContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    progressTrack: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
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
        paddingHorizontal: 10,
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
