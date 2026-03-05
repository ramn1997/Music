import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';

const FlashListAny = FlashList as any;
import { ScreenContainer } from '../components/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/ThemeContext';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usePlayerContext } from '../hooks/PlayerContext';
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
    const { songs, playlists, favoriteArtists, favoriteAlbums, favoriteGenres, likedSongs, favoriteSpecialPlaylists } = useMusicLibrary();
    const { playSongInPlaylist } = usePlayerContext();
    const [layoutMode] = useState<'grid2' | 'grid3' | 'list'>('grid3');

    const allFavorites = useMemo(() => {
        const findImageForType = (name: string, type: 'artist' | 'album' | 'playlist' | 'genre') => {
            if (type === 'playlist') {
                const pl = playlists.find(p => p.name === name);
                return pl?.songs[0]?.coverImage;
            }
            const song = (songs || []).find(s =>
                (type === 'artist' && s.artist === name) ||
                (type === 'album' && s.album === name) ||
                (type === 'genre' && s.genre === name)
            );
            return song?.coverImage;
        };

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
            image: findImageForType(artist, 'artist'),
            screen: 'Playlist',
            params: { id: artist, name: artist, type: 'artist' }
        }));

        const favAlbums = (favoriteAlbums || []).map(album => ({
            id: album,
            name: album,
            type: 'Album',
            image: findImageForType(album, 'album'),
            songs: (songs || []).filter(s => s.album === album),
            screen: 'Playlist',
            params: { id: album, name: album, type: 'album' }
        }));

        const favGenres = (favoriteGenres || []).map(genre => ({
            id: genre,
            name: genre,
            type: 'Genre',
            image: findImageForType(genre, 'genre'),
            songs: (songs || []).filter(s => s.genre === genre),
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
    }, [playlists, favoriteArtists, favoriteAlbums, favoriteGenres, favoriteSpecialPlaylists, songs, likedSongs]);




    const renderItem = React.useCallback(({ item, index }: { item: any, index: number }) => {
        const isArtist = item.type === 'Artist';
        const isGrid3 = layoutMode === 'grid3';
        const isList = layoutMode === 'list';
        const { width } = Dimensions.get('window');
        const gridCardWidth = (width - 40 - (isGrid3 ? 20 : 10)) / (isGrid3 ? 3 : 2);
        const cardWidth = isList ? '100%' : gridCardWidth;

        // Consistent height for non-artist cards (Square aspect ratio)
        const cardHeight = isList ? 60 : gridCardWidth;

        return (
            <View
                style={{
                    width: isList ? '100%' : cardWidth,
                    marginBottom: 15,
                    alignItems: isList ? 'stretch' : (isArtist ? 'center' : 'flex-start')
                }}
            >
                <TouchableOpacity
                    onPress={() => navigation.navigate('Playlist', {
                        id: item.params.id,
                        name: item.params.name,
                        type: item.params.type as any
                    })}
                    style={isList ? styles.listItem : undefined}
                >
                    <View style={[
                        // Only apply card shadows/elevation to NON-artists
                        !isArtist && styles.cardContainer,
                        !isList && {
                            height: isArtist ? (isGrid3 ? 80 : 120) : cardHeight,
                            width: isArtist ? (isGrid3 ? 80 : 120) : '100%',
                            borderRadius: isArtist ? (isGrid3 ? 40 : 60) : 16,
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
                                songs={item.songs}
                                size={isList ? 50 : (isArtist ? (isGrid3 ? 80 : 120) : cardHeight)}
                                iconSize={isList ? 24 : 32}
                                iconName={
                                    item.id === 'most_played' ? "refresh" :
                                        item.id === 'liked' ? "heart" :
                                            item.type === 'Album' ? "disc" :
                                                item.type === 'Genre' ? "pricetags" :
                                                    "musical-notes"
                                }
                                borderRadius={isList ? 8 : 16}
                                gradientColors={getGradientColors(item.id)}
                                forceSingleImage={item.type === 'Album'}
                            />
                        )}

                        {/* Special Rendering for Artists with Image Support */}
                        {isArtist && (
                            <ArtistAvatar
                                name={item.name}
                                id={item.id}
                                isList={isList}
                                isGrid3={isGrid3}
                            />
                        )}
                    </View>

                    {/* Item Name outside for Grid */}
                    {!isList && (
                        <View style={{ marginTop: 8, alignItems: isArtist ? 'center' : 'flex-start', paddingHorizontal: isArtist ? 0 : 4, width: '100%' }}>
                            <Text style={[styles.artistName, { color: theme.text, marginTop: 0 }]} numberOfLines={1}>{item.name}</Text>
                        </View>
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

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Favorites</Text>
            </View>

            <View style={{ flex: 1 }}>
                <FlashListAny
                    key={layoutMode}
                    data={allFavorites}
                    renderItem={renderItem}
                    numColumns={layoutMode === 'list' ? 1 : (layoutMode === 'grid3' ? 3 : 2)}
                    estimatedItemSize={layoutMode === 'list' ? 60 : 150}
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
