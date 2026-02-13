import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeInDown,
    ZoomIn,
    withSpring,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    useAnimatedStyle,
    Easing,
    FadeInLeft
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { MarqueeText } from '../components/MarqueeText';
import { MusicImage } from '../components/MusicImage';
import { useArtistImage } from '../hooks/useArtistImage';
import { useTheme } from '../hooks/ThemeContext';
import { useMusicLibrary, Song } from '../hooks/MusicLibraryContext';
import { Alert } from 'react-native';
import { usePlayerContext } from '../hooks/PlayerContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const HISTORY_ITEMS = [
    { id: 'recently_played', name: 'Recently Played', type: 'History', image: 'https://images.unsplash.com/photo-1459749411177-8c4750bb0e8e?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'recently', name: 'Recently Played', type: 'recently_played' } },
    { id: 'recently_added', name: 'Recently Added', type: 'Smart Playlist', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'recently_added', name: 'Recently Added', type: 'recently_added' } },
    { id: 'never_played', name: 'Never Played', type: 'Smart Playlist', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'never', name: 'Never Played', type: 'never_played' } },
];

const FAVORITES = [
    { id: 'most_played', name: 'Most Played', type: 'Smart Playlist', image: 'https://images.unsplash.com/photo-1514525253440-b393452e8fc4?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'most', name: 'Most Played', type: 'most_played' } },
    { id: 'liked', name: 'Liked Songs', type: 'Playlist', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'liked', name: 'Liked Songs', type: 'playlist' } },
];

const CATEGORIES = ['Songs', 'Albums', 'Artists', 'Genres'];

const getGradientColors = (id: string): [string, string] => {
    switch (id) {
        case 'Songs': return ['#0f172a', '#1e3a8a']; // Deep Blue
        case 'Albums': return ['#4a044e', '#701a75']; // Deep Purple
        case 'Artists': return ['#7c2d12', '#9a3412']; // Deep Orange
        case 'Genres': return ['#064e3b', '#065f46']; // Deep Green
        case 'Years': return ['#1e293b', '#64748b']; // Dark Slate/Steel
        case 'most_played': return ['#2e1065', '#5b21b6']; // Deep Violet
        case 'liked': return ['#881337', '#be123c']; // Deep Rose
        case 'recently_played': return ['#422006', '#854d0e']; // Deep Brown/Gold
        case 'recently_added': return ['#172554', '#1d4ed8']; // Royal Blue
        case 'never_played': return ['#020617', '#334155']; // Dark Slate
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

const CardDesign = () => (
    <>
        <View style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ position: 'absolute', bottom: -10, left: -10, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)' }} />
    </>
);

const HistoryCardDesign = () => (
    <>
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: '30%', width: 20, transform: [{ skewX: '-20deg' }], backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: '60%', width: 10, transform: [{ skewX: '-20deg' }], backgroundColor: 'rgba(255,255,255,0.05)' }} />
    </>
);

const CategoryPillDesign = () => (
    <>
        <View style={{ position: 'absolute', top: -30, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ position: 'absolute', bottom: -10, right: -10, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)' }} />
    </>
);

const BigHistoryCard = ({ item, songs, theme, navigation }: { item: any, songs: Song[], theme: any, navigation: any }) => {
    const categorySongs = useMemo(() => {
        let list: Song[] = [];
        if (item.id === 'recently_played') {
            list = [...songs].filter(s => s.lastPlayed).sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
        } else if (item.id === 'recently_added') {
            list = [...songs].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
        } else if (item.id === 'never_played') {
            list = [...songs].filter(s => !s.playCount || s.playCount === 0);
        }
        return list.slice(0, 3);
    }, [item.id, songs]);

    const gridSongs = useMemo(() => {
        let list: Song[] = [];
        if (item.id === 'recently_played') {
            list = [...songs].filter(s => s.lastPlayed).sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
        } else if (item.id === 'recently_added') {
            list = [...songs].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
        } else if (item.id === 'never_played') {
            list = [...songs].filter(s => !s.playCount || s.playCount === 0);
        }
        return list.slice(0, 4);
    }, [item.id, songs]);

    const totalSongs = useMemo(() => {
        if (item.id === 'recently_played') return songs.filter(s => s.lastPlayed).length;
        if (item.id === 'recently_added') return songs.length;
        if (item.id === 'never_played') return songs.filter(s => !s.playCount).length;
        return 0;
    }, [item.id, songs]);

    const cardBgColor = getGradientColors(item.id)[0];

    return (
        <View style={styles.cardContainer}>
            <TouchableOpacity
                style={[styles.bigHistoryCard, { backgroundColor: cardBgColor, borderColor: 'rgba(255,255,255,0.1)' }]}
                activeOpacity={0.9}
                onPress={() => {
                    if (item.screen === 'Playlist') {
                        navigation.navigate('Playlist', {
                            id: item.params.id,
                            name: item.params.name,
                            type: item.params.type as any
                        });
                    } else {
                        navigation.navigate(item.screen as any);
                    }
                }}
            >
                {/* Header Section - Now matches PlaylistScreen cover art */}
                <View style={styles.cardHeader}>
                    <View style={styles.gridContainer}>
                        <LinearGradient
                            colors={getGradientColors(item.id)}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <CardDesign />
                        <HistoryCardDesign />
                        <View style={styles.iconContainer}>
                            <View style={styles.historyIconCircle}>
                                <Ionicons
                                    name={
                                        item.id === 'never_played' ? "ban" :
                                            item.id === 'recently_added' ? "time" :
                                                "play"
                                    }
                                    size={36}
                                    color="white"
                                />
                            </View>
                        </View>
                    </View>
                    <View style={styles.headerText}>
                        <Text style={[styles.cardTitle, { color: 'white' }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.songCount, { color: 'rgba(255,255,255,0.7)' }]}>{totalSongs} songs</Text>
                    </View>
                </View>

                {/* Song List Section */}
                <View style={styles.songsList}>
                    {categorySongs.length > 0 ? categorySongs.map(song => (
                        <View key={song.id} style={styles.songHistoryItem}>
                            <MusicImage uri={song.coverImage} id={song.id} assetUri={song.uri} style={styles.songThumb} iconSize={14} />
                            <View style={styles.songHistoryInfo}>
                                <Text style={[styles.songHistoryTitle, { color: 'white' }]} numberOfLines={1}>{song.title}</Text>
                                <Text style={[styles.songHistoryArtist, { color: 'rgba(255,255,255,0.5)' }]} numberOfLines={1}>
                                    {song.artist}
                                </Text>
                            </View>
                        </View>
                    )) : (
                        <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No songs found</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
};


const FavoriteItemCard = ({ item, theme, navigation }: { item: any, theme: any, navigation: any }) => {
    const isArtist = item.id === 'Artist' || item.type === 'Artist' || ((item.params as any)?.type === 'artist');
    const artistImage = useArtistImage(isArtist ? item.name : '');
    const displayImage = isArtist ? (artistImage || item.image) : item.image;

    return (
        <TouchableOpacity
            style={styles.favoriteItemWrapper}
            onPress={() => {
                navigation.navigate('Playlist', {
                    id: (item.params as any).id,
                    name: (item.params as any).name,
                    type: (item.params as any).type
                });
            }}
        >
            <View
                style={[
                    // Base styles
                    {
                        width: '100%',
                        height: 150,
                        alignSelf: 'center',
                        justifyContent: 'center',
                        alignItems: 'center',
                    },
                    // Card styles only for non-artists
                    !isArtist && [
                        styles.favoriteCard,
                        {
                            borderRadius: 16,
                            overflow: 'hidden',
                            borderWidth: 1,
                            borderColor: theme.cardBorder
                        }
                    ]
                ]}
            >
                {!isArtist && (
                    <LinearGradient
                        colors={getGradientColors(item.id)}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                )}
                {!isArtist && (
                    item.id === 'liked' ? (
                        <>
                            <View style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                            <View style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        </>
                    ) : (
                        <CardDesign />
                    )
                )}
                <View style={{ alignItems: 'center', zIndex: 1, justifyContent: 'center', flex: 1, paddingHorizontal: isArtist ? 10 : 0 }}>
                    {displayImage ? (
                        <View style={[
                            styles.iconCircle,
                            {
                                marginBottom: 8,
                                width: isArtist ? 100 : 80,
                                height: isArtist ? 100 : 80,
                                borderRadius: isArtist ? 50 : 12,
                                overflow: 'hidden',
                                borderWidth: isArtist ? 2 : 0,
                                borderColor: 'rgba(255,255,255,0.3)'
                            }
                        ]}>
                            <MusicImage
                                uri={displayImage}
                                id={item.id}
                                assetUri={(item as any).assetUri}
                                style={StyleSheet.absoluteFill}
                                iconSize={isArtist ? 48 : 36}
                            />
                        </View>
                    ) : (
                        <View style={[
                            styles.iconCircle,
                            {
                                backgroundColor: 'transparent',
                                marginBottom: 8,
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }
                        ]}>
                            <Ionicons
                                name={
                                    item.id === 'most_played' ? "refresh" :
                                        item.id === 'liked' ? "heart" :
                                            isArtist ? "person" :
                                                (item as any).type === 'Album' ? "disc" :
                                                    (item as any).type === 'Genre' ? "pricetags" :
                                                        "musical-notes"
                                }
                                size={item.id === 'liked' ? 40 : 36}
                                color="white"
                            />
                        </View>
                    )}
                    <MarqueeText
                        text={item.name}
                        style={[
                            styles.favoriteName,
                            {
                                color: isArtist ? theme.text : 'white',
                                fontWeight: 'bold',
                                marginTop: isArtist ? 4 : 0
                            }
                        ]}
                    />

                    {item.type === 'Playlist' && item.id !== 'liked' && (
                        <View style={styles.playlistTag}>
                            <Text style={styles.playlistTagText}>PLAYLIST</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity >
    );
};

export const HomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme } = useTheme();
    const { songs, likedSongs, playlists, favoriteArtists, favoriteAlbums, favoriteGenres } = useMusicLibrary();
    const flatListRef = useRef<FlatList>(null);
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused && flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
    }, [isFocused]);

    const favoritedPlaylists = useMemo(() => playlists.filter(p => p.isFavorite).map(p => ({
        id: p.id,
        name: p.name,
        type: 'Playlist',
        screen: 'Playlist' as const,
        params: { id: p.id, name: p.name, type: 'playlist' }
    })), [playlists]);

    const favArtists = useMemo(() => (favoriteArtists || []).map(artist => ({
        id: artist,
        name: artist,
        type: 'Artist',
        screen: 'Playlist' as const,
        params: { id: artist, name: artist, type: 'artist' }
    })), [favoriteArtists]);

    const favAlbums = useMemo(() => (favoriteAlbums || []).map(album => ({
        id: album,
        name: album,
        type: 'Album',
        screen: 'Playlist' as const,
        params: { id: album, name: album, type: 'album' }
    })), [favoriteAlbums]);

    const favGenres = useMemo(() => (favoriteGenres || []).map(genre => ({
        id: genre,
        name: genre,
        type: 'Genre',
        screen: 'Playlist' as const,
        params: { id: genre, name: genre, type: 'genre' }
    })), [favoriteGenres]);

    const allFavorites = useMemo(() => {
        const base = [...FAVORITES, ...favoritedPlaylists, ...favArtists, ...favAlbums, ...favGenres];
        return base.map(item => {
            // Find a song in this category to get a cover image
            let matchingSong: Song | undefined;
            const type = (item.params as any)?.type;
            const name = item.name;

            if (type === 'artist') matchingSong = songs.find(s => s.artist === name);
            else if (type === 'album') matchingSong = songs.find(s => s.album === name);
            else if (type === 'genre') matchingSong = songs.find(s => s.genre === name);
            else if (type === 'playlist') {
                const pl = playlists.find(p => p.id === item.id);
                matchingSong = pl?.songs[0];
            } else if (item.id === 'liked') {
                matchingSong = undefined; // Force use static icon
            }

            return {
                ...item,
                image: item.id === 'liked' ? undefined : (matchingSong?.coverImage || (item as any).image),
                assetUri: matchingSong?.uri
            };
        });
    }, [favoritedPlaylists, favArtists, favAlbums, favGenres, songs, playlists, likedSongs]);

    const dynamicHistory = useMemo(() => {
        return HISTORY_ITEMS.map(item => {
            return {
                ...item,
                image: undefined // No album art in listening history cards
            };
        });
    }, []);

    const renderHeader = () => (
        <View style={{ paddingBottom: 100 }}>
            {/* Greeting & Header */}
            <View style={styles.header}>
                <Image
                    source={require('../../assets/discicon.png')}
                    style={{ width: 34, height: 34, borderRadius: 8 }}
                />
                <View style={{ marginLeft: 10 }}>
                    <Text style={[styles.appName, { color: theme.text }]}>Music</Text>
                </View>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
                    <Ionicons name="settings-outline" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            {/* Category Pills */}
            <View style={{ height: 70, marginBottom: 20, marginTop: 10 }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryPills}
                >
                    {CATEGORIES.map((cat, index) => {
                        let iconName: any = 'musical-notes';
                        if (cat === 'Albums') iconName = 'disc';
                        if (cat === 'Artists') iconName = 'person';
                        if (cat === 'Genres') iconName = 'pricetags';
                        if (cat === 'Years') iconName = 'calendar';

                        return (
                            <TouchableOpacity
                                key={cat}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate(cat as any)}
                                style={[
                                    styles.categoryPill,
                                    {
                                        backgroundColor: theme.card,
                                        borderColor: 'rgba(255,255,255,0.2)',
                                        elevation: 5,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.25,
                                        shadowRadius: 3.84,
                                    }
                                ]}
                            >
                                <LinearGradient
                                    colors={getGradientColors(cat)}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                <CategoryPillDesign />
                                <Ionicons name={iconName} size={20} color="white" style={{ marginRight: 8 }} />
                                <Text style={[styles.categoryPillTitle, { color: 'white' }]}>{cat}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Favorites Section */}
            <View style={[styles.sectionHeaderContainer, { paddingRight: 20 }]}>
                <Ionicons name="heart" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 0 }]}>Your Favorites</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>See All</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.favoritesGrid}>
                {allFavorites.slice(0, 4).map((item) => (
                    <FavoriteItemCard
                        key={item.id}
                        item={item}
                        theme={theme}
                        navigation={navigation}
                    />
                ))}
            </View>

            {/* Listening History Section */}
            <View style={styles.sectionHeaderContainer}>
                <Ionicons name="time-outline" size={22} color={theme.text} style={{ marginRight: 10 }} />
                <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 0 }]}>Listening History</Text>
            </View>

            <View style={{ minHeight: 250 }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                    snapToInterval={Dimensions.get('window').width * 0.8 + 16}
                    decelerationRate="fast"
                >
                    {dynamicHistory.map((item) => (
                        <BigHistoryCard
                            key={item.id}
                            item={item}
                            songs={songs}
                            theme={theme}
                            navigation={navigation}
                        />
                    ))}
                    {/* Add extra space at the end */}
                    <View style={{ width: 20 }} />
                </ScrollView>
            </View>
        </View>
    );

    return (
        <ScreenContainer variant="default">
            <FlatList
                ref={flatListRef}
                data={[]}
                renderItem={null}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={renderHeader()}
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
            />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 15,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    iconButton: {
        padding: 5,
    },
    categoryPills: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        alignItems: 'center',
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
        overflow: 'hidden',
        height: 48,
        minWidth: 100,
        justifyContent: 'center'
    },
    categoryPillTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    iconCircle: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10
    },
    favoritesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    favoriteItemWrapper: {
        width: '48%',
        marginBottom: 15,
    },
    favoriteCard: {
        width: '100%',
        height: 130,
        padding: 0,
        overflow: 'hidden'
    },
    favoriteName: {
        fontSize: 14,
        textAlign: 'center',
    },
    // Big History Card Styles
    cardContainer: {
        marginBottom: 20,
    },
    bigHistoryCard: {
        width: Dimensions.get('window').width * 0.8,
        borderRadius: 24,
        padding: 16,
        marginRight: 16,
        borderWidth: 1,
        minHeight: 220,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    gridContainer: {
        width: 70,
        height: 70,
        borderRadius: 35, // Circular to match PlaylistScreen design
        overflow: 'hidden',
        marginRight: 16,
        position: 'relative',
    },
    iconContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    historyIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 80,
        height: 80,
    },
    gridImageWrapper: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridImage: {
        width: 39,
        height: 39,
    },
    headerText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    cardSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        marginVertical: 2,
    },
    songCount: {
        fontSize: 12,
        fontWeight: '500',
    },
    songsList: {
        marginTop: 4,
    },
    songHistoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    songThumb: {
        width: 40,
        height: 40,
        borderRadius: 6,
        marginRight: 12,
    },
    songHistoryInfo: {
        flex: 1,
    },
    songHistoryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    songHistoryArtist: {
        fontSize: 12,
        marginTop: 2,
    },
    moreBtn: {
        padding: 4,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    playBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    playlistTag: {
        marginTop: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        alignSelf: 'center',
    },
    playlistTagText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 1,
    }
});
