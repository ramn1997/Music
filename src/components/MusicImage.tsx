import React, { useState, useEffect } from 'react';
import { Image, View, StyleProp, ImageStyle, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { importService } from '../services/ImportService';

interface MusicImageProps {
    uri?: string;
    style?: StyleProp<ImageStyle>;
    iconSize?: number;
    containerStyle?: StyleProp<ViewStyle>;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    id?: string; // Song ID for lazy loading album art
    assetUri?: string; // Asset URI for fetching album art
}

const GRADIENTS = [
    ['#f97316', '#db2777'], // Orange -> Pink
    ['#8b5cf6', '#3b82f6'], // Violet -> Blue
    ['#06b6d4', '#2563eb'], // Cyan -> Blue
    ['#84cc16', '#10b981'], // Lime -> Emerald
    ['#f43f5e', '#7c3aed'], // Rose -> Violet
    ['#eab308', '#ea580c'], // Yellow -> Orange
    ['#ec4899', '#8b5cf6'], // Pink -> Violet
    ['#6366f1', '#0ea5e9'], // Indigo -> Sky
];

// In-memory cache to avoid redundant lookups
const artLoadingInProgress = new Set<string>();
const lazyArtCache = new Map<string, string | null>();

export const MusicImage = React.memo(({ uri, style, iconSize = 40, containerStyle, resizeMode = 'cover', id, assetUri }: MusicImageProps) => {
    const [error, setError] = useState(false);
    const [lazyUri, setLazyUri] = useState<string | null>(null);
    const { theme } = useTheme();

    useEffect(() => {
        setError(false);
    }, [uri]);

    // Lazy load album art if no uri provided but we have an id
    useEffect(() => {
        if (!uri && id && !lazyUri && !artLoadingInProgress.has(id)) {
            // Check cache first
            if (lazyArtCache.has(id)) {
                const cached = lazyArtCache.get(id);
                if (cached) {
                    setLazyUri(cached);
                }
                return;
            }

            // Don't fetch for every song on screen - only visible ones after a delay
            const timer = setTimeout(async () => {
                if (artLoadingInProgress.has(id)) return;
                artLoadingInProgress.add(id);

                try {
                    const coverImage = await importService.getAlbumArt(id, assetUri || '');
                    lazyArtCache.set(id, coverImage);
                    if (coverImage) {
                        setLazyUri(coverImage);
                    }
                } catch (e) {
                    lazyArtCache.set(id, null);
                } finally {
                    artLoadingInProgress.delete(id);
                }
            }, 100); // Small delay to batch visible items

            return () => clearTimeout(timer);
        }
    }, [uri, id, assetUri, lazyUri]);

    const handleImageError = () => {
        setError(true);
        // Also cache the failure
        if (id) {
            lazyArtCache.set(id, null);
        }
    };

    const effectiveUri = uri || lazyUri;

    // Generate stable randomness from ID
    const getStableRandom = (seed: string) => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
    };

    if (effectiveUri && effectiveUri.trim() !== '' && !error) {
        return (
            <Image
                source={{ uri: effectiveUri.trim() }}
                style={style}
                resizeMode={resizeMode}
                onError={handleImageError}
            />
        );
    }

    // Fallback Design
    const seed = id || 'default';
    const hash = getStableRandom(seed);
    const gradient = GRADIENTS[hash % GRADIENTS.length];

    // Simple geometric patterns based on hash
    const patternType = hash % 3;

    return (
        <LinearGradient
            colors={gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.placeholder, style as any, containerStyle]}
        >
            {/* Geometric Overlays */}
            {patternType === 0 && (
                <View style={{
                    position: 'absolute',
                    top: -10, right: -10,
                    width: '60%', height: '60%',
                    borderRadius: 100,
                    backgroundColor: 'rgba(255,255,255,0.1)'
                }} />
            )}
            {patternType === 1 && (
                <View style={{
                    position: 'absolute',
                    bottom: 0, left: 0,
                    width: '100%', height: '40%',
                    transform: [{ skewY: '-15deg' }],
                    backgroundColor: 'rgba(255,255,255,0.08)'
                }} />
            )}
            {patternType === 2 && (
                <>
                    <View style={{
                        position: 'absolute',
                        top: '10%', left: '10%',
                        width: '20%', height: '20%',
                        borderRadius: 50,
                        backgroundColor: 'rgba(255,255,255,0.1)'
                    }} />
                    <View style={{
                        position: 'absolute',
                        bottom: '20%', right: '20%',
                        width: '30%', height: '30%',
                        borderRadius: 50,
                        backgroundColor: 'rgba(255,255,255,0.08)'
                    }} />
                </>
            )}

            <Ionicons name="musical-note" size={iconSize} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
    );
});

const styles = StyleSheet.create({
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    }
});
