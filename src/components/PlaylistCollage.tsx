import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MusicImage } from './MusicImage';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../hooks/useLocalMusic';
import { LinearGradient } from 'expo-linear-gradient';

interface PlaylistCollageProps {
    songs?: Song[];
    collageSongs?: Song[];
    size?: number;
    width?: number;   // optional override for container width (allows non-square)
    iconSize?: number;
    iconName?: string;
    borderRadius?: number;
    opacity?: number;
    overlayColor?: string;
    showBubbles?: boolean;
    gradientColors?: [string, string];
    forceSingleImage?: boolean;
}

export const PlaylistCollage = ({
    songs = [],
    collageSongs,
    size = 130,
    width,
    iconSize = 40,
    iconName = "musical-notes",
    borderRadius = 16,
    opacity = 0.8,
    overlayColor = 'rgba(0,0,0,0.3)',
    showBubbles = true,
    gradientColors,
    forceSingleImage = false
}: PlaylistCollageProps) => {
    const containerWidth = width ?? size;
    const displaySongs = (collageSongs && collageSongs.length > 0) ? collageSongs : (songs && songs.length > 0 ? songs : []);
    const collageItems = displaySongs.slice(0, 4);
    const hasCollage = !forceSingleImage && collageItems.length >= 4;

    return (
        <View style={{
            width: containerWidth,
            height: size,
            borderRadius: borderRadius,
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.05)',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            {gradientColors && (
                <LinearGradient
                    colors={gradientColors}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            )}

            {hasCollage ? (
                <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', flexWrap: 'wrap', opacity }]}>
                    {collageItems.map((s, idx) => (
                        <View key={`collage-${s.id}-${idx}`} style={{ width: '50%', height: '50%' }}>
                            <MusicImage
                                uri={s.coverImage}
                                id={s.id}
                                style={{ width: '100%', height: '100%' }}
                                assetUri={s.uri}
                            />
                        </View>
                    ))}
                </View>
            ) : displaySongs.length > 0 ? (
                <View style={[StyleSheet.absoluteFill, { opacity }]}>
                    <MusicImage
                        uri={displaySongs[0].coverImage}
                        id={displaySongs[0].id}
                        style={{ width: '100%', height: '100%' }}
                        assetUri={displaySongs[0].uri}
                    />
                </View>
            ) : null}

            {/* Only darken when there are songs behind the overlay */}
            {displaySongs.length > 0 && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
            )}

            {showBubbles && (
                <>
                    <View style={{
                        position: 'absolute',
                        top: -size * 0.1,
                        right: -size * 0.1,
                        width: size * 0.45,
                        height: size * 0.45,
                        borderRadius: size * 0.225,
                        backgroundColor: 'rgba(255,255,255,0.08)'
                    }} />
                    <View style={{
                        position: 'absolute',
                        bottom: -size * 0.04,
                        left: -size * 0.04,
                        width: size * 0.3,
                        height: size * 0.3,
                        borderRadius: size * 0.15,
                        backgroundColor: 'rgba(255,255,255,0.04)'
                    }} />
                </>
            )}

            <Ionicons
                name={iconName as any}
                size={iconSize}
                color="white"
                style={{
                    zIndex: 1,
                    textShadowColor: 'rgba(0,0,0,0.5)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 6
                }}
            />
        </View>
    );
};
