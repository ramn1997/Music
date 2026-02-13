import React, { useState, useEffect } from 'react';
import { Image, View, StyleProp, ImageStyle, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/ThemeContext';
import { importService } from '../services/ImportService';

const GRADIENTS: [string, string][] = [
    ['#4f46e5', '#9333ea'], // Indigo -> Purple
    ['#be123c', '#e11d48'], // Rose
    ['#0e7490', '#0891b2'], // Cyan
    ['#15803d', '#16a34a'], // Green
    ['#b45309', '#d97706'], // Amber
    ['#4338ca', '#6366f1'], // Indigo
    ['#7e22ce', '#a855f7'], // Purple
    ['#0369a1', '#0ea5e9'], // Sky
    ['#c2410c', '#f97316'], // Orange
    ['#1d4ed8', '#3b82f6']  // Blue
];

const getDesignProps = (id?: string) => {
    if (!id) return { gradient: GRADIENTS[0], rotation: 0, seed: 0 };
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash) % GRADIENTS.length;
    return {
        gradient: GRADIENTS[idx],
        rotation: (Math.abs(hash) % 360),
        seed: Math.abs(hash)
    };
};


interface MusicImageProps {
    uri?: string;
    style?: StyleProp<ImageStyle>;
    iconSize?: number;
    containerStyle?: StyleProp<ViewStyle>;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    id?: string; // Song ID for lazy loading album art
    assetUri?: string; // Asset URI for fetching album art
    blurRadius?: number;
    iconName?: string; // Custom icon name for fallback
}


// In-memory cache to avoid redundant lookups
const artLoadingInProgress = new Set<string>();
const lazyArtCache = new Map<string, string | null>();

export const MusicImage = React.memo(({ uri, style, iconSize = 40, containerStyle, resizeMode = 'cover', id, assetUri, blurRadius, iconName = "musical-note" }: MusicImageProps) => {
    const [error, setError] = useState(false);
    const [lazyUri, setLazyUri] = useState<string | null>(null);
    const [ignorePropUri, setIgnorePropUri] = useState(false);
    const { theme } = useTheme();

    const design = React.useMemo(() => getDesignProps(id), [id]);


    useEffect(() => {
        setError(false);
        setIgnorePropUri(false);
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
                // If cached is null, it means we already tried and failed, so don't retry immediately
                // unless we want to implement a retry mechanism.
                return;
            }

            // Priority loading for Player Screen (large images)
            const isPlayerScreen = iconSize > 100;
            const delay = isPlayerScreen ? 0 : 100;

            const timer = setTimeout(async () => {
                if (artLoadingInProgress.has(id)) return;
                artLoadingInProgress.add(id);

                try {
                    // check cache again inside timeout just in case
                    if (lazyArtCache.has(id)) {
                        const cached = lazyArtCache.get(id);
                        if (cached) setLazyUri(cached);
                        artLoadingInProgress.delete(id);
                        return;
                    }
                    // 1. Try fast lookup (System Art / Cache)
                    let coverImage = await importService.getAlbumArt(id, assetUri || '');

                    // 2. If fast lookup failed, try full extraction
                    if (!coverImage) {
                        // Only if not explicitly disabled or too heavy?
                        // For now, let's enable it to fix the "not visible" issue.
                        console.log(`[MusicImage] Fast lookup failed for ${id}, attempting extraction...`);
                        coverImage = await importService.getAlbumArt(id, assetUri || '', true);
                    }

                    lazyArtCache.set(id, coverImage);
                    if (coverImage) {
                        setLazyUri(coverImage);
                    }
                } catch (e) {
                    console.warn(`[MusicImage] Load failed for ${id}`, e);
                    lazyArtCache.set(id, null);
                } finally {
                    artLoadingInProgress.delete(id);
                }
            }, delay);

            return () => clearTimeout(timer);
        }
    }, [uri, id, assetUri, lazyUri]);

    const handleImageError = async () => {
        // If we were using the prop 'uri' and it failed, try to force extract
        if (uri && !ignorePropUri && id) {
            console.log(`[MusicImage] URI failed for ${id}, attempting extraction...`);
            setIgnorePropUri(true);

            try {
                // Force extraction since the provided URI (system) failed
                const extractedUri = await importService.getAlbumArt(id, assetUri || '', true);
                if (extractedUri) {
                    console.log(`[MusicImage] Extraction successful for ${id}: ${extractedUri}`);
                    setLazyUri(extractedUri);
                    // Error will be cleared on re-render if effectiveUri is valid
                    setError(false);
                } else {
                    console.log(`[MusicImage] Extraction returned null for ${id}`);
                    setError(true);
                }
            } catch (e) {
                console.warn(`[MusicImage] Extraction failed for ${id}:`, e);
                setError(true);
            }
        } else {
            // We were already using lazyUri or simply failed
            // Only log if not already in error state to avoid spam
            if (!error) console.log(`[MusicImage] Final load failure for ${id}`);
            setError(true);
            if (id) {
                lazyArtCache.set(id, null);
            }
        }
    };

    const effectiveUri = (uri && uri.trim() !== '' && !ignorePropUri) ? uri : lazyUri;
    const showImage = effectiveUri && effectiveUri.trim() !== '' && !error;

    let finalUri = '';
    if (showImage && effectiveUri) {
        finalUri = effectiveUri.trim();
        // Fix common URI issues
        if (finalUri.startsWith('file://file://')) {
            finalUri = finalUri.replace(/^file:\/\/file:\/\//, 'file://');
        } else if (!finalUri.match(/^(file|content|http|https):\/\//)) {
            finalUri = `file://${finalUri}`;
        }
    }

    return (
        <View style={[styles.placeholder, { backgroundColor: theme.card, overflow: 'hidden' }, style as any, containerStyle]}>
            {/* Random Design Fallback */}
            {!showImage && (
                <>
                    <LinearGradient
                        colors={design.gradient}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    {/* Abstract Decorative Elements */}
                    <View style={{
                        position: 'absolute',
                        width: '150%',
                        height: '150%',
                        borderRadius: 100,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        top: '-20%',
                        left: '-20%',
                        transform: [{ rotate: `${design.rotation}deg` }]
                    }} />
                    <View style={{
                        position: 'absolute',
                        width: '80%',
                        height: '80%',
                        borderRadius: 40,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        bottom: '-10%',
                        right: '-10%',
                        transform: [{ rotate: `${-design.rotation / 2}deg` }]
                    }} />

                    {iconSize > 0 && (
                        <Ionicons
                            name={iconName as any}
                            size={Math.max(5, iconSize * 0.5)}
                            color="#fff"
                            style={{ opacity: 0.5 }}
                        />
                    )}
                </>
            )}

            {/* Render Image on top if available */}
            {showImage && (
                <Image
                    source={{ uri: finalUri }}
                    style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                    resizeMode={resizeMode}
                    blurRadius={blurRadius}
                    onError={() => {
                        setError(true);
                        handleImageError();
                    }}
                />
            )}
        </View>

    );
});

const styles = StyleSheet.create({
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    }
});
