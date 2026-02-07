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
    Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { MarqueeText } from '../components/MarqueeText';
import { MusicImage } from '../components/MusicImage';
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
                image: item.id === 'liked' ? undefined : (matchingSong?.coverImage || (item as any).image)
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

    const MemoizedHeader = useMemo(() => (
        <View style={{ paddingBottom: 100 }}>
            {/* Greeting & Header */}
            <View style={styles.header}>
                <Text style={[styles.appName, { color: theme.text }]}>Music</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Years')}
                    style={{
                        marginLeft: 16,
                        marginTop: 8,
                        backgroundColor: theme.card,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        flexDirection: 'row',
                        alignItems: 'center'
                    }}
                >
                    <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} style={{ marginRight: 5 }} />
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>Years</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
                    <Ionicons name="settings-outline" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            {/* Category Grid */}
            <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat, index) => {
                    let iconName: any = 'musical-notes';
                    if (cat === 'Albums') iconName = 'disc';
                    if (cat === 'Artists') iconName = 'person';
                    if (cat === 'Genres') iconName = 'pricetags';

                    return (
                        <Animated.View
                            key={cat}
                            style={styles.categoryCardWrapper}
                            entering={ZoomIn.delay(index * 100).springify()}
                        >
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate(cat as any)}
                            >
                                <View style={[styles.categoryCard, { backgroundColor: theme.card, borderRadius: 40, overflow: 'hidden' }]}>
                                    <LinearGradient
                                        colors={getGradientColors(cat)}
                                        style={StyleSheet.absoluteFill}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    />
                                    <CategoryPillDesign />
                                    <View style={styles.iconCircle}>
                                        <Ionicons name={iconName} size={24} color="white" />
                                    </View>
                                    <Text style={[styles.categoryTitle, { color: 'white' }]}>{cat}</Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
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
                {allFavorites.slice(0, 4).map((item) => {
                    const isArtist = item.id === 'Artist' || item.type === 'Artist' || ((item.params as any)?.type === 'artist');
                    return (
                        <TouchableOpacity
                            key={item.id}
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
                                    styles.favoriteCard,
                                    {
                                        borderRadius: 16,
                                        overflow: 'hidden',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        width: '100%',
                                        height: 150,
                                        alignSelf: 'center',
                                        borderWidth: 1,
                                        borderColor: theme.cardBorder
                                    }
                                ]}
                            >
                                <LinearGradient
                                    colors={getGradientColors(item.id)}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                {item.id === 'liked' ? (
                                    <>
                                        <View style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                                        <View style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                                    </>
                                ) : (
                                    <CardDesign />
                                )}
                                <View style={{ alignItems: 'center', zIndex: 1, justifyContent: 'center', flex: 1, paddingHorizontal: isArtist ? 10 : 0 }}>
                                    {(item as any).image ? (
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
                                                uri={(item as any).image}
                                                id={item.id}
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
                                    <MarqueeText text={item.name} style={[styles.favoriteName, { color: 'white', fontWeight: 'bold' }]} />

                                    {/* Playlist Tag Badge */}
                                    {item.type === 'Playlist' && item.id !== 'liked' && (
                                        <View style={styles.playlistTag}>
                                            <Text style={styles.playlistTagText}>PLAYLIST</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Listening History Section */}
            <View style={styles.sectionHeaderContainer}>
                <Ionicons name="time-outline" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 0 }]}>Listening History</Text>
            </View>
            <View style={styles.historyGrid}>
                {dynamicHistory.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.historyCardWrapper}
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
                        <View style={[
                            styles.historyCard,
                            {
                                borderRadius: 50,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: theme.cardBorder
                            }
                        ]}>
                            <LinearGradient
                                colors={getGradientColors(item.id)}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <CardDesign />
                            <HistoryCardDesign />
                            <View style={{
                                backgroundColor: 'transparent',
                                width: 50,
                                height: 50,
                                borderRadius: 25,
                                borderWidth: 1.5,
                                borderColor: 'rgba(255,255,255,0.4)',
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 2
                            }}>
                                <Ionicons
                                    name={item.id === 'never_played' ? "ban-outline" : item.id === 'recently_added' ? "time-outline" : "musical-notes-outline"}
                                    size={24}
                                    color="rgba(255,255,255,0.8)"
                                />
                            </View>
                        </View>
                        <View style={styles.historyInfo}>
                            <MarqueeText text={item.name} style={[styles.historyTitle, { color: theme.text }]} />
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    ), [theme, allFavorites, navigation]);

    return (
        <ScreenContainer variant="default">
            <FlatList
                ref={flatListRef}
                data={[]}
                renderItem={null}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={MemoizedHeader}
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
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        marginBottom: 30,
        justifyContent: 'space-between'
    },
    categoryCardWrapper: {
        width: '48%',
        marginBottom: 12
    },
    categoryCard: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
        height: 55,
    },
    iconCircle: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 0
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
        height: 150,
        padding: 0,
        overflow: 'hidden'
    },
    favoriteName: {
        fontSize: 14,
        textAlign: 'center',
    },
    historyGrid: {
        paddingHorizontal: 15,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    historyCardWrapper: {
        width: '33.33%',
        padding: 5,
        alignItems: 'center',
        marginBottom: 15,
    },
    historyCard: {
        width: '100%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayIconContainer: {
        zIndex: 2,
    },
    historyInfo: {
        marginTop: 8,
        width: '100%',
    },
    historyTitle: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
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
