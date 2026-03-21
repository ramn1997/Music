import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/ThemeContext';
import { useLibraryStore } from '../store/useLibraryStore';
import { MusicImage } from '../components/MusicImage';
import { PlaylistCollage } from '../components/PlaylistCollage';
import { useArtistImage } from '../hooks/useArtistImage';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 3;
const CARD_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

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

const ArtistAvatar = ({ name, id }: { name: string, id: string }) => {
    const imageUri = useArtistImage(name);
    return (
        <View style={StyleSheet.absoluteFill}>
            <MusicImage
                uri={imageUri || undefined}
                id={id}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                iconSize={32}
                iconName="person"
            />
        </View>
    );
};

const GridItemWrapper = ({ children, theme, onPress, isCircular = false }: { children: React.ReactNode, theme: any, onPress: () => void, isCircular?: boolean }) => (
    <View style={styles.gridItemContainer}>
        <Pressable
            onPress={onPress}
            android_ripple={{ color: theme.primary + '20' }}
            style={({ pressed }) => [
                styles.gridItemPressable,
                {
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: isCircular ? 1000 : 24,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                }
            ]}
        >
            <View style={{
                flex: 1, 
                backgroundColor: theme.card,
                borderRadius: isCircular ? 1000 : 24,
                overflow: 'hidden',
                width: '100%',
                height: '100%'
            }}>
                {children}
            </View>
        </Pressable>
    </View>
);

const AlbumGridItem = React.memo(({ item, theme, onPress }: { item: any, theme: any, onPress: () => void }) => (
    <View style={styles.gridItem}>
        <GridItemWrapper theme={theme} onPress={onPress}>
            <View style={styles.gridImageContainer}>
                <PlaylistCollage
                    songs={item.songs || []}
                    size={CARD_SIZE}
                    borderRadius={0}
                    showBubbles={false}
                    showIcon={false}
                    gradientColors={getGradientColors(item.id)}
                    forceSingleImage={true}
                />
            </View>
        </GridItemWrapper>
        <Text style={[styles.gridItemTitle, { color: theme.text }]} numberOfLines={1}>
            {item.name}
        </Text>
    </View>
));

const ArtistGridItem = React.memo(({ item, theme, onPress }: { item: any, theme: any, onPress: () => void }) => (
    <View style={styles.gridItem}>
        <GridItemWrapper theme={theme} onPress={onPress} isCircular>
            <View style={[styles.gridImageContainer, { borderRadius: 1000 }]}>
                <ArtistAvatar name={item.name} id={item.id} />
            </View>
        </GridItemWrapper>
        <Text style={[styles.gridItemTitle, { color: theme.text }]} numberOfLines={1}>
            {item.name}
        </Text>
    </View>
));

const PlaylistGridItem = React.memo(({ item, theme, onPress }: { item: any, theme: any, onPress: () => void }) => (
    <View style={styles.gridItem}>
        <GridItemWrapper theme={theme} onPress={onPress}>
            <View style={styles.gridImageContainer}>
                <PlaylistCollage
                    songs={item.songs || []}
                    size={CARD_SIZE}
                    borderRadius={0}
                    showBubbles={false}
                    showIcon={false}
                    gradientColors={getGradientColors(item.id)}
                />
            </View>
        </GridItemWrapper>
        <Text style={[styles.gridItemTitle, { color: theme.text }]} numberOfLines={1}>
            {item.name}
        </Text>
    </View>
));

const SectionHeader = ({ title, theme }: { title: string, theme: any }) => (
    <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    </View>
);

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

    const data = useMemo(() => {
        const favAlbumsSet = new Set(favoriteAlbums || []);
        const favGenresSet = new Set(favoriteGenres || []);

        const albumSongsMap = new Map<string, any[]>();
        const genreSongsMap = new Map<string, any[]>();

        const allSongs = songs || [];
        for (let i = 0; i < allSongs.length; i++) {
            const s = allSongs[i];
            if (s.album && favAlbumsSet.has(s.album)) {
                let arr = albumSongsMap.get(s.album);
                if (!arr) { arr = []; albumSongsMap.set(s.album, arr); }
                arr.push(s);
            }
            if (s.genre && favGenresSet.has(s.genre)) {
                let arr = genreSongsMap.get(s.genre);
                if (!arr) { arr = []; genreSongsMap.set(s.genre, arr); }
                arr.push(s);
            }
        }

        const favPlaylists = [
            ...(favoriteSpecialPlaylists.includes('liked') ? [{ id: 'liked', name: 'Liked Songs', type: 'playlist', songs: likedSongs }] : []),
            ...(favoriteSpecialPlaylists.includes('most_played') ? [{ id: 'most_played', name: 'Most Played', type: 'playlist', songs: [...allSongs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 50) }] : []),
            ...(playlists || []).filter(p => p.isFavorite).map(p => ({ ...p, type: 'playlist' }))
        ];

        const favArtistsList = (favoriteArtists || []).map(artist => ({
            id: artist, name: artist, type: 'artist'
        }));

        const favAlbumsList = (favoriteAlbums || []).map(album => ({
            id: album, name: album, type: 'album', songs: albumSongsMap.get(album) || []
        }));

        const favGenresList = (favoriteGenres || []).map(genre => ({
            id: genre, name: genre, type: 'genre', songs: genreSongsMap.get(genre) || []
        }));

        return { favPlaylists, favArtistsList, favAlbumsList, favGenresList };
    }, [playlists, favoriteArtists, favoriteAlbums, favoriteGenres, favoriteSpecialPlaylists, songs, likedSongs]);

    const { favPlaylists, favArtistsList, favAlbumsList, favGenresList } = data;
    const hasAnyFavorites = favPlaylists.length > 0 || favArtistsList.length > 0 || favAlbumsList.length > 0 || favGenresList.length > 0;

    const handleNavigate = (item: any) => {
        navigation.navigate('Playlist', { id: item.id, name: item.name, type: item.type });
    };

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Favorites</Text>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {!hasAnyFavorites ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="heart-outline" size={48} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No favorites yet</Text>
                        <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                            Heart songs, albums, and artists to see them grouped here.
                        </Text>
                    </View>
                ) : (
                    <>
                        {favArtistsList.length > 0 && (
                            <>
                                <SectionHeader title="Artists" theme={theme} />
                                <View style={styles.gridRow}>
                                    {favArtistsList.map((item) => (
                                        <ArtistGridItem key={item.id} item={item} theme={theme} onPress={() => handleNavigate(item)} />
                                    ))}
                                </View>
                            </>
                        )}
                        
                        {favAlbumsList.length > 0 && (
                            <>
                                <SectionHeader title="Albums" theme={theme} />
                                <View style={styles.gridRow}>
                                    {favAlbumsList.map((item) => (
                                        <AlbumGridItem key={item.id} item={item} theme={theme} onPress={() => handleNavigate(item)} />
                                    ))}
                                </View>
                            </>
                        )}

                        {favPlaylists.length > 0 && (
                            <>
                                <SectionHeader title="Playlists" theme={theme} />
                                <View style={styles.gridRow}>
                                    {favPlaylists.map((item) => (
                                        <PlaylistGridItem key={item.id} item={item} theme={theme} onPress={() => handleNavigate(item)} />
                                    ))}
                                </View>
                            </>
                        )}

                        {favGenresList.length > 0 && (
                            <>
                                <SectionHeader title="Genres" theme={theme} />
                                <View style={styles.gridRow}>
                                    {favGenresList.map((item) => (
                                        <PlaylistGridItem key={item.id} item={item} theme={theme} onPress={() => handleNavigate(item)} />
                                    ))}
                                </View>
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 16,
        paddingBottom: 12,
        height: 72,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.2,
        marginLeft: 8,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: GRID_PADDING,
        paddingBottom: 150,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: 0.1,
    },
    gridRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
    },
    gridItem: {
        width: CARD_SIZE,
        marginBottom: 16,
    },
    gridItemContainer: {
        width: CARD_SIZE,
        height: CARD_SIZE,
        marginBottom: 8,
    },
    gridItemPressable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridImageContainer: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    gridItemTitle: {
        fontSize: 11.5,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: 0.1,
        textAlign: 'center',
        paddingHorizontal: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        opacity: 0.5,
        paddingHorizontal: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    emptySubText: {
        marginTop: 6,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
});
