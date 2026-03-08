import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import Animated, { FadeInDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAnimatedFlashList } from '../components/SafeAnimatedFlashList';
import { ScreenContainer } from '../components/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/ThemeContext';
import { useLibraryStore } from '../store/useLibraryStore';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '../store/usePlayerStore';
import { useArtistImage } from '../hooks/useArtistImage';
import { MusicImage } from '../components/MusicImage';
import { PlaylistCollage } from '../components/PlaylistCollage';

const FAVORITES = [
    { id: 'most_played', name: 'Most Played', type: 'Smart Playlist', image: 'https://images.unsplash.com/photo-1514525253440-b393452e8fc4?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'most', name: 'Most Played', type: 'most_played' } },
    { id: 'liked', name: 'Liked Songs', type: 'Playlist', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'liked', name: 'Liked Songs', type: 'playlist' } },
];

const getGradientColors = (id: string): [string, string] => {
    switch (id) {
        case 'Songs': return ['#0f172a', '#1e3a8a'];
        case 'Albums': return ['#4a044e', '#701a75'];
        case 'Artists': return ['#7c2d12', '#9a3412'];
        case 'Genres': return ['#064e3b', '#065f46'];
        case 'most_played': return ['#2e1065', '#5b21b6'];
        case 'liked': return ['#881337', '#be123c'];
        default: {
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const userColors: [string, string][] = [
                ['#0f172a', '#1e40af'],
                ['#312e81', '#4338ca'],
                ['#581c87', '#7e22ce'],
                ['#701a75', '#a21caf'],
                ['#831843', '#be185d'],
                ['#064e3b', '#065f46'],
            ];
            return userColors[hash % userColors.length];
        }
    }
};

const CardDesign = () => null;

const ArtistAvatar = ({ name, id, isList, isGrid3 }: { name: string, id: string, isList: boolean, isGrid3: boolean }) => {
    const imageUri = useArtistImage(name);

    // If list mode, small circle. If grid, large circle.
    // However, the container already handles size/radius.
    // We just need to fill it with the MusicImage or Fallback.

    return (
        <View style={StyleSheet.absoluteFill}>
            <MusicImage
                uri={imageUri || undefined}
                id={id}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                iconSize={isList ? 24 : (isGrid3 ? 30 : 50)}
                iconName="person"
            />
        </View>
    );
};

export const FavoritesScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme } = useTheme();
    const songs = useLibraryStore(state => state.songs);
    const playlists = useLibraryStore(state => state.playlists);
    const favoriteArtists = useLibraryStore(state => state.favoriteArtists);
    const favoriteAlbums = useLibraryStore(state => state.favoriteAlbums);
    const favoriteGenres = useLibraryStore(state => state.favoriteGenres);
    const favoriteSpecialPlaylists = useLibraryStore(state => state.favoriteSpecialPlaylists);
    const likedSongs = useLibraryStore(state => state.likedSongs);
    const playSongInPlaylist = usePlayerStore(state => state.playSongInPlaylist);
    const [layoutMode] = useState<'grid2' | 'list'>('grid2');
    const [isNavigated, setIsNavigated] = useState(false);

    useEffect(() => {
        const interaction = require('react-native').InteractionManager.runAfterInteractions(() => {
            setIsNavigated(true);
        });
        return () => interaction.cancel();
    }, []);

    const allFavorites = useMemo(() => {
        if (!isNavigated) return [];
        const favAlbumsSet = new Set(favoriteAlbums || []);
        const favGenresSet = new Set(favoriteGenres || []);
        const favArtistsSet = new Set(favoriteArtists || []);

        const albumSongsMap = new Map<string, any[]>();
        const genreSongsMap = new Map<string, any[]>();
        const artistImageMap = new Map<string, string>();
        const albumImageMap = new Map<string, string>();
        const genreImageMap = new Map<string, string>();

        // SINGLE O(N) pass to gather all required assets and arrays
        for (const s of (songs || [])) {
            if (s.album && favAlbumsSet.has(s.album)) {
                let arr = albumSongsMap.get(s.album);
                if (!arr) { arr = []; albumSongsMap.set(s.album, arr); }
                arr.push(s);
                if (!albumImageMap.has(s.album) && s.coverImage) albumImageMap.set(s.album, s.coverImage);
            }
            if (s.genre && favGenresSet.has(s.genre)) {
                let arr = genreSongsMap.get(s.genre);
                if (!arr) { arr = []; genreSongsMap.set(s.genre, arr); }
                arr.push(s);
                if (!genreImageMap.has(s.genre) && s.coverImage) genreImageMap.set(s.genre, s.coverImage);
            }
            if (s.artist && favArtistsSet.has(s.artist)) {
                if (!artistImageMap.has(s.artist) && s.coverImage) artistImageMap.set(s.artist, s.coverImage);
            }
        }

        const favoritedPlaylists = (playlists || []).filter(p => p.isFavorite).map(p => ({
            id: p.id,
            name: p.name,
            type: 'Playlist',
            songs: p.songs,
            image: p.songs && p.songs.length > 0 ? p.songs[0].coverImage : null,
            screen: 'Playlist',
            params: { id: p.id, name: p.name, type: 'playlist' }
        }));

        const favArtists = (favoriteArtists || []).map(artist => ({
            id: artist,
            name: artist,
            type: 'Artist',
            image: artistImageMap.get(artist) || null,
            screen: 'Playlist',
            params: { id: artist, name: artist, type: 'artist' }
        }));

        const favAlbums = (favoriteAlbums || []).map(album => ({
            id: album,
            name: album,
            type: 'Album',
            image: albumImageMap.get(album) || null,
            songs: albumSongsMap.get(album) || [],
            screen: 'Playlist',
            params: { id: album, name: album, type: 'album' }
        }));

        const favGenres = (favoriteGenres || []).map(genre => ({
            id: genre,
            name: genre,
            type: 'Genre',
            image: genreImageMap.get(genre) || null,
            songs: genreSongsMap.get(genre) || [],
            screen: 'Playlist',
            params: { id: genre, name: genre, type: 'genre' }
        }));

        const dynamicSpecial = FAVORITES.filter(f => favoriteSpecialPlaylists.includes(f.id)).map(f => {
            if (f.id === 'liked') return { ...f, songs: likedSongs };
            if (f.id === 'most_played') {
                const sorted = [...(songs || [])].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 50);
                return { ...f, songs: sorted };
            }
            return f;
        });

        return [...dynamicSpecial, ...favoritedPlaylists, ...favArtists, ...favAlbums, ...favGenres];
    }, [playlists, favoriteArtists, favoriteAlbums, favoriteGenres, favoriteSpecialPlaylists, songs, likedSongs, isNavigated]);




    const renderItem = React.useCallback(({ item, index }: { item: any, index: number }) => {
        const isArtist = item.type === 'Artist';
        const isList = layoutMode === 'list';
        const { width } = Dimensions.get('window');
        const gridCardWidth = (width - 40 - 16) / 2; // 40 horizontal padding, 16 gap
        const cardWidth = isList ? '100%' : gridCardWidth;

        // Consistent height for non-artist cards (Square aspect ratio)
        const cardHeight = isList ? 60 : gridCardWidth;

        return (
            <View
                style={{
                    flex: isList ? 1 : 1 / 2,
                    paddingHorizontal: isList ? 0 : 8,
                    marginBottom: isList ? 15 : 24,
                    alignItems: isList ? 'stretch' : 'center'
                }}
            >
                <TouchableOpacity
                    style={isList ? styles.listItem : { width: '100%', alignItems: 'center' }}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Playlist', {
                        id: item.params.id,
                        name: item.params.name,
                        type: item.params.type as any
                    })}
                >
                    <View style={[
                        !isList && styles.cardContainer,
                        !isList && {
                            height: isArtist ? cardHeight : cardHeight,
                            width: '100%',
                            aspectRatio: 1,
                            borderRadius: isArtist ? cardHeight / 2 : 20,
                            marginBottom: 10,
                            elevation: 8,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.35,
                            shadowRadius: 5,
                            backgroundColor: theme.card
                        },
                        isList && {
                            width: 50,
                            height: 50,
                            borderRadius: isArtist ? 25 : 8,
                            marginRight: 15
                        },
                        { overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }
                    ]}>
                        {!isArtist && (
                            <PlaylistCollage
                                songs={item.songs || []}
                                size={isList ? 50 : cardHeight}
                                width={(!isList ? '100%' : undefined) as any}
                                iconSize={isList ? 24 : 40}
                                iconName={
                                    item.id === 'most_played' ? "refresh" :
                                        item.id === 'liked' ? "heart" :
                                            item.type === 'Album' ? "disc" :
                                                item.type === 'Genre' ? "pricetags" :
                                                    "musical-notes"
                                }
                                borderRadius={isList ? 8 : 0}
                                gradientColors={getGradientColors(item.id)}
                                forceSingleImage={item.type === 'Album'}
                                showBubbles={!isList}
                            />
                        )}

                        {/* Special Rendering for Artists with Image Support */}
                        {isArtist && (
                            <ArtistAvatar
                                name={item.name}
                                id={item.id}
                                isList={isList}
                                isGrid3={false}
                            />
                        )}
                    </View>

                    {/* Item Name outside for Grid */}
                    {!isList && (
                        <>
                            <Text style={{ color: theme.text, fontSize: 15, fontWeight: 'bold', textAlign: 'center', width: '100%' }} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center', width: '100%' }} numberOfLines={1}>
                                {item.type}
                            </Text>
                        </>
                    )}

                    {/* List View Details */}
                    {isList && (
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                            <Text style={[styles.listSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{item.type}</Text>
                        </View>
                    )}
                    {isList && <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />}
                </TouchableOpacity>
            </View>
        );
    }, [theme, navigation, layoutMode]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            // Bypass JS bridge tracking
        },
    });

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Favorites</Text>
            </View>

            <View style={{ flex: 1 }}>
                <SafeAnimatedFlashList
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    key={layoutMode}
                    data={allFavorites}
                    renderItem={renderItem}
                    numColumns={layoutMode === 'list' ? 1 : 2}
                    estimatedItemSize={layoutMode === 'list' ? 60 : 220}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="thumbs-up-outline" size={60} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No favorites yet</Text>
                        </View>
                    }
                />
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 10
    },
    backButton: {
        padding: 5,
        marginRight: 15
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -0.5,
        flex: 1
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 150
    },
    cardContainer: {
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    cardTextOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 10,
        backgroundColor: 'transparent'
    },
    cardTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3
    },
    cardSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2
    },
    artistName: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'left'
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '500'
    },
    listSubtitle: {
        fontSize: 12,
        marginTop: 2
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
        opacity: 0.5
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16
    }
});
