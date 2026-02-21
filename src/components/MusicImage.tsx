import React, { useState, useEffect } from 'react';
import { View, StyleProp, ImageStyle, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/ThemeContext';
import { importService } from '../services/ImportService';

const GRADIENTS: [string, string][] = [
    ['#1e1b4b', '#312e81'], // Deep Indigo
    ['#1a1a1a', '#262626'], // Dark Grey
    ['#2d0606', '#450a0a'], // Deep Red
    ['#062d1a', '#0a452a'], // Deep Green
    ['#1e1b4b', '#312e81'], // Deep Indigo
    ['#1a1a1a', '#262626'], // Dark Grey
    ['#2d0606', '#450a0a'], // Deep Red
    ['#062d1a', '#0a452a'], // Deep Green
    ['#2e1065', '#4c1d95'], // Deep Purple
    ['#0c4a6e', '#075985']  // Deep Sky
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
    priority?: boolean; // Skip debounce for critical images
}


// In-memory cache to avoid redundant lookups
const artLoadingInProgress = new Set<string>();
const lazyArtCache = new Map<string, string | null>();

export const MusicImage = React.memo(({ uri, style, iconSize = 40, containerStyle, resizeMode = 'cover', id, assetUri, blurRadius, iconName = "musical-note", priority = false }: MusicImageProps) => {
    const [error, setError] = useState(false);
    const [lazyUri, setLazyUri] = useState<string | null>(null);
    const [ignorePropUri, setIgnorePropUri] = useState(false);
    const { theme } = useTheme();

    const design = React.useMemo(() => getDesignProps(id), [id]);


    useEffect(() => {
        setError(false);
        setIgnorePropUri(false);

        // Immediate cache check on ID change to prevent stale art
        if (id) {
            if (lazyArtCache.has(id)) {
                setLazyUri(lazyArtCache.get(id) || null);
            } else {
                setLazyUri(null); // Clear old art immediately while loading new
            }
        }
    }, [uri, id]);

    // Lazy load album art if no uri provided but we have an id
    useEffect(() => {
        let isMounted = true;

        if (!uri && id && !lazyUri && !artLoadingInProgress.has(id)) {
            // Check cache first (synchronous check) - though handled above, double check for safety
            if (lazyArtCache.has(id)) {
                const cached = lazyArtCache.get(id);
                if (cached) {
                    setLazyUri(cached);
                }
                return;
            }

            // Debounce the heavy async loading to improve scroll performance
            // But skip debounce if priority is true (Player Screen)
            const timeoutMs = priority ? 0 : 100;

            const timer = setTimeout(() => {
                if (!isMounted) return;

                const loadArt = async () => {
                    if (artLoadingInProgress.has(id)) return;

                    // Double check cache before starting work
                    if (lazyArtCache.has(id)) {
                        const cached = lazyArtCache.get(id);
                        if (cached && isMounted) setLazyUri(cached);
                        return;
                    }

                    artLoadingInProgress.add(id);

                    try {
                        // Try fast lookup first (System Art / DB Cache)
                        // This uses importService which may check DB or System.
                        let coverImage = await importService.getAlbumArt(id, assetUri || '');

                        // Only do deep extraction if needed and for larger images (Player screen)
                        // AND only if we didn't find anything yet
                        if (!coverImage && iconSize > 100) {
                            coverImage = await importService.getAlbumArt(id, assetUri || '', true);
                        }

                        lazyArtCache.set(id, coverImage);
                        if (coverImage && isMounted) {
                            setLazyUri(coverImage);
                        }
                    } catch (e) {
                        // warning suppressed for cleaner logs in production
                        lazyArtCache.set(id, null);
                    } finally {
                        artLoadingInProgress.delete(id);
                    }
                };

                loadArt();
            }, timeoutMs);

            return () => {
                isMounted = false;
                clearTimeout(timer);
            };
        }
    }, [uri, id, assetUri, lazyUri, iconSize, priority]);

    const handleImageError = async () => {
        // If we were using the prop 'uri' and it failed, try to force extract
        if (uri && !ignorePropUri && id) {
            console.log(`[MusicImage] URI failed for ${id}, attempting extraction...`);
            setIgnorePropUri(true);

            try {
                // Force extraction since the provided URI (system) failed
                const extractedUri = await importService.getAlbumArt(id, assetUri || '', true);
                if (extractedUri) {
                    setLazyUri(extractedUri);
                    // Error will be cleared on re-render if effectiveUri is valid
                    setError(false);
                } else {
                    setError(true);
                }
            } catch (e) {
                console.warn(`[MusicImage] Extraction failed for ${id}:`, e);
                setError(true);
            }
        } else {
            // We were already using lazyUri or simply failed
            // Silence noise for missing artwork as it's common
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
        } else if (finalUri.startsWith('//')) {
            finalUri = `https:${finalUri}`;
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

                    {/* Consistent Decorative Circles (matching HistoryCardDesign) */}
                    <View style={{
                        position: 'absolute',
                        width: '50%',
                        height: '50%',
                        borderRadius: 100,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        top: '-12%',
                        right: '-12%',
                    }} />
                    <View style={{
                        position: 'absolute',
                        width: '35%',
                        height: '35%',
                        borderRadius: 40,
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        bottom: '-5%',
                        left: '-5%',
                    }} />

                    {iconSize > 0 && (
                        <Ionicons
                            name={iconName as any}
                            size={Math.max(5, iconSize * 0.75)}
                            color="#fff"
                            style={{
                                zIndex: 1,
                                textShadowColor: 'rgba(0,0,0,0.5)',
                                textShadowOffset: { width: 0, height: 2 },
                                textShadowRadius: 6
                            }}
                        />
                    )}
                </>
            )}

            {/* Render Image on top if available */}
            {showImage && (
                <Image
                    source={{ uri: finalUri }}
                    style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                    contentFit={resizeMode === 'cover' ? 'cover' : 'contain'}
                    transition={100}
                    cachePolicy="memory-disk"
                    priority="high"
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
