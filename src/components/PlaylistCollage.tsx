import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MusicImage } from './MusicImage';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../hooks/useLocalMusic';
import { LinearGradient } from 'expo-linear-gradient';

interface PlaylistCollageProps {
    songs?: Song[];
    collageSongs?: Song[];
    size?: number | string;
    width?: number | string;   // optional override for container width (allows non-square)
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
    const containerWidth: any = width ?? size;
    const computedSize: any = size;
    const numericSize = typeof size === 'number' ? size : 130;

    // Stable 4-image extraction logic:
    // Finds 4 unique cover arts from the list based on a stable ID sort.
    // This ensures the collage stays EXACTLY the same and doesn't flicker 
    // or re-render even if the playlist order constantly shifts (like Most Played).
    const collageItems = React.useMemo(() => {
        if (forceSingleImage) return [];

        // If explicitly provided via collageSongs, try to use those first
        if (collageSongs && collageSongs.length >= 4) return collageSongs.slice(0, 4);

        if (songs && songs.length >= 4) {
            const stableSongs = [...songs].sort((a, b) => a.id.localeCompare(b.id));
            const unique = [];
            const seen = new Set();
            for (const s of stableSongs) {
                // Focus on picking 4 DIFFERENT cover arts for visual variety
                if (s.coverImage && !seen.has(s.coverImage)) {
                    unique.push(s);
                    seen.add(s.coverImage);
                }
                if (unique.length === 4) break;
            }

            // Fallback if there aren't 4 different images available
            if (unique.length === 4) return unique;
            return stableSongs.slice(0, 4);
        }
        return [];
    }, [songs?.length, forceSingleImage]);

    const hasCollage = !forceSingleImage && collageItems.length === 4;
    const fallbackDisplays = (collageSongs && collageSongs.length > 0) ? collageSongs : (songs && songs.length > 0 ? songs : []);

    return (
        <View style={{
            width: containerWidth,
            height: computedSize,
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
            ) : fallbackDisplays.length > 0 ? (
                <View style={[StyleSheet.absoluteFill, { opacity }]}>
                    <MusicImage
                        uri={fallbackDisplays[0].coverImage}
                        id={fallbackDisplays[0].id}
                        style={{ width: '100%', height: '100%' }}
                        assetUri={fallbackDisplays[0].uri}
                    />
                </View>
            ) : null}

            {/* Only darken when there are songs behind the overlay */}
            {(hasCollage || fallbackDisplays.length > 0) && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
            )}

            {showBubbles && (
                <>
                    <View style={{
                        position: 'absolute',
                        top: -numericSize * 0.1,
                        right: -numericSize * 0.1,
                        width: numericSize * 0.45,
                        height: numericSize * 0.45,
                        borderRadius: numericSize * 0.225,
                        backgroundColor: 'rgba(255,255,255,0.08)'
                    }} />
                    <View style={{
                        position: 'absolute',
                        bottom: -numericSize * 0.04,
                        left: -numericSize * 0.04,
                        width: numericSize * 0.3,
                        height: numericSize * 0.3,
                        borderRadius: numericSize * 0.15,
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
