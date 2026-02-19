import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    withSpring,
    useSharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { MarqueeText } from '../components/MarqueeText';
import { MusicImage } from '../components/MusicImage';
import { useArtistImage } from '../hooks/useArtistImage';
import { useTheme } from '../hooks/ThemeContext';
import { useMusicLibrary, Song } from '../hooks/MusicLibraryContext';
import { GlassCard } from '../components/GlassCard';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const HISTORY_ITEMS = [
    { id: 'recently_played', name: 'Recently Played', type: 'History', screen: 'Playlist', params: { id: 'recently', name: 'Recently Played', type: 'recently_played' } },
    { id: 'recently_added', name: 'Recently Added', type: 'Smart Playlist', screen: 'Playlist', params: { id: 'recently_added', name: 'Recently Added', type: 'recently_added' } },
    { id: 'never_played', name: 'Never Played', type: 'Smart Playlist', screen: 'Playlist', params: { id: 'never', name: 'Never Played', type: 'never_played' } },
];

const FAVORITES = [
    { id: 'most_played', name: 'Most Played', type: 'Smart Playlist', screen: 'Playlist', params: { id: 'most', name: 'Most Played', type: 'most_played' } },
    { id: 'liked', name: 'Liked Songs', type: 'Playlist', screen: 'Playlist', params: { id: 'liked', name: 'Liked Songs', type: 'playlist' } },
];

const CATEGORIES = ['Songs', 'Albums', 'Artists'];

const getGradientColors = (id: string): [string, string] => {
    switch (id) {
        case 'Songs': return ['#0f172a', '#1e3a8a'];
        case 'Albums': return ['#4a044e', '#701a75'];
        case 'Artists': return ['#7c2d12', '#9a3412'];
        case 'Genres': return ['#064e3b', '#065f46'];
        case 'Years': return ['#1e293b', '#64748b'];
        case 'most_played': return ['#2e1065', '#5b21b6'];
        case 'liked': return ['#881337', '#be123c'];
        case 'recently_played': return ['#422006', '#854d0e'];
        case 'recently_added': return ['#172554', '#1d4ed8'];
        case 'never_played': return ['#020617', '#334155'];
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

const SongHistoryItem = React.memo(({ song }: { song: Song }) => (
    <View style={styles.songHistoryItem}>
        <View style={[styles.songThumb, { backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="musical-note" size={14} color="rgba(255,255,255,0.5)" />
        </View>
        <View style={styles.songHistoryInfo}>
            <Text style={[styles.songHistoryTitle, { color: 'white' }]} numberOfLines={1}>{song.title}</Text>
            <Text style={[styles.songHistoryArtist, { color: 'rgba(255,255,255,0.5)' }]} numberOfLines={1}>
                {song.artist}
            </Text>
        </View>
    </View>
));

const BigHistoryCard = React.memo(({ item, categorySongs, totalSongs, navigation }: { item: any, categorySongs: Song[], totalSongs: number, navigation: any }) => {
    const gradientColors = React.useMemo(() => getGradientColors(item.id), [item.id]);
    const cardBgColor = gradientColors[0];
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const iconName = React.useMemo(() => {
        if (item.id === 'never_played') return "ban";
        if (item.id === 'recently_added') return "time";
        return "play";
    }, [item.id]);

    return (
        <View style={styles.cardContainer}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPressIn={() => scale.value = withSpring(0.96)}
                onPressOut={() => scale.value = withSpring(1)}
                onPress={() => {
                    navigation.navigate('Playlist', {
                        id: item.params.id,
                        name: item.params.name,
                        type: item.params.type as any
                    });
                }}
            >
                <GlassCard
                    intensity={15}
                    style={[styles.bigHistoryCard, { backgroundColor: cardBgColor, borderColor: 'rgba(255,255,255,0.1)' }]}
                    contentStyle={{ padding: 0 }}
                >
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
                    <Animated.View style={[animatedStyle, { flex: 1, padding: 16 }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.gridContainer}>
                                <LinearGradient
                                    colors={gradientColors}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                <CardDesign />
                                <View style={styles.iconContainer}>
                                    <View style={styles.historyIconCircle}>
                                        <Ionicons
                                            name={iconName}
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

                        <View style={styles.songsList}>
                            {categorySongs.length > 0 ? categorySongs.map(song => (
                                <SongHistoryItem key={song.id} song={song} />
                            )) : (
                                <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No songs found</Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </GlassCard>
            </TouchableOpacity>
        </View>
    );
});

const FavoriteItemCard = React.memo(({ item, theme, navigation }: { item: any, theme: any, navigation: any }) => {
    const isArtist = item.type === 'Artist' || (item.params as any)?.type === 'artist';
    const artistImage = useArtistImage(isArtist ? item.name : '');
    const displayImage = isArtist ? artistImage : item.image;

    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <TouchableOpacity
            style={styles.favoriteItemWrapper}
            activeOpacity={0.9}
            onPressIn={() => scale.value = withSpring(0.95)}
            onPressOut={() => scale.value = withSpring(1)}
            onPress={() => {
                navigation.navigate('Playlist', {
                    id: (item.params as any).id,
                    name: (item.params as any).name,
                    type: (item.params as any).type
                });
            }}
        >
            <Animated.View style={[animatedStyle, { flex: 1 }]}>
                <View
                    style={[
                        {
                            width: '100%',
                            height: 160,
                            alignSelf: 'center',
                            justifyContent: 'center',
                            alignItems: 'center',
                        },
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
                    <View style={{ alignItems: 'center', zIndex: 1, justifyContent: 'center', flex: 1, width: '100%', paddingHorizontal: 10 }}>
                        {isArtist ? (
                            <View style={[
                                styles.iconCircle,
                                {
                                    marginBottom: 10,
                                    width: 105,
                                    height: 105,
                                    borderRadius: 52.5,
                                    overflow: 'hidden',
                                    borderWidth: 3,
                                    borderColor: 'white',
                                    backgroundColor: theme.card,
                                    elevation: 8,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 6,
                                }
                            ]}>
                                <MusicImage
                                    uri={displayImage}
                                    id={item.id}
                                    assetUri={(item as any).assetUri}
                                    style={StyleSheet.absoluteFill}
                                    iconSize={50}
                                    iconName="person"
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
                                    marginTop: isArtist ? 4 : 0,
                                    width: '100%',
                                    paddingHorizontal: 4
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
            </Animated.View>
        </TouchableOpacity >
    );
});

const CategoryPill = ({ cat, navigation }: { cat: string, navigation: any }) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    let iconName: any = 'musical-notes';
    if (cat === 'Albums') iconName = 'disc';
    if (cat === 'Artists') iconName = 'person';
    if (cat === 'Genres') iconName = 'pricetags';
    if (cat === 'Years') iconName = 'calendar';

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPressIn={() => scale.value = withSpring(0.92)}
            onPressOut={() => scale.value = withSpring(1)}
            onPress={() => navigation.navigate(cat as any)}
        >
            <Animated.View style={[
                animatedStyle,
                styles.categoryPill,
                {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    elevation: 5,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                }
            ]}>
                <LinearGradient
                    colors={getGradientColors(cat)}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <CategoryPillDesign />
                <Ionicons name={iconName} size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={[styles.categoryPillTitle, { color: 'white' }]}>{cat}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

export const HomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme } = useTheme();
    const { songs, likedSongs, playlists, favoriteArtists, favoriteAlbums, favoriteGenres } = useMusicLibrary();
    const flatListRef = useRef<FlatList>(null);
    const isFocused = useIsFocused();

    // Hooks for Header Animations
    const settingsScale = useSharedValue(1);
    const seeAllScale = useSharedValue(1);

    const settingsAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: settingsScale.value }]
    }));

    const seeAllAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: seeAllScale.value }]
    }));

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



    // Indexing for faster lookups
    const libraryIndex = useMemo(() => {
        const artists = new Map<string, Song>();
        const albums = new Map<string, Song>();
        const genres = new Map<string, Song>();

        // Iterate backwards to get latest songs as thumbnails if multiple exist
        for (let i = songs.length - 1; i >= 0; i--) {
            const s = songs[i];
            if (s.artist) artists.set(s.artist, s);
            if (s.album) albums.set(s.album, s);
            if (s.genre) genres.set(s.genre, s);
        }

        return { artists, albums, genres };
    }, [songs]);

    const allFavorites = useMemo(() => {
        const base = [...FAVORITES, ...favoritedPlaylists, ...favArtists, ...favAlbums];
        return base.map(item => {
            let matchingSong: Song | undefined;
            const type = (item.params as any)?.type;
            const name = item.name;

            if (type === 'artist') matchingSong = libraryIndex.artists.get(name);
            else if (type === 'album') matchingSong = libraryIndex.albums.get(name);
            else if (type === 'playlist') {
                const pl = playlists.find(p => p.id === item.id);
                matchingSong = pl?.songs[0];
            } else if (item.id === 'liked') {
                matchingSong = undefined;
            }

            const isArtistType = type === 'artist';
            return {
                ...item,
                image: (item.id === 'liked' || isArtistType) ? undefined : (matchingSong?.coverImage || (item as any).image),
                assetUri: isArtistType ? undefined : matchingSong?.uri
            };
        });
    }, [favoritedPlaylists, favArtists, favAlbums, songs, libraryIndex, playlists, likedSongs]);

    const historyData = useMemo(() => {
        // Return early if no songs
        if (songs.length === 0) {
            return {
                recently_played: { songs: [], total: 0 },
                recently_added: { songs: [], total: 0 },
                never_played: { songs: [], total: 0 }
            };
        }

        let neverPlayedCount = 0;
        // Arrays to hold top 3 items, kept sorted descending
        const topPlayed: Song[] = [];
        const topAdded: Song[] = [];
        const topNever: Song[] = [];
        let playedCount = 0;

        const insertSorted = (arr: Song[], item: Song, prop: 'lastPlayed' | 'dateAdded') => {
            const val = item[prop] || 0;
            // Find insertion point
            let i = 0;
            while (i < arr.length && (arr[i][prop] || 0) > val) {
                i++;
            }
            if (i < 3) {
                arr.splice(i, 0, item);
                if (arr.length > 3) arr.pop();
            }
        };

        // Single Pass O(N)
        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];

            // 1. Recently Played - Check both lastPlayed and playHistory
            // Some contexts might update playHistory but not lastPlayed immediately, or vice versa
            let lastPlayedTime = song.lastPlayed || 0;
            if (song.playHistory && song.playHistory.length > 0) {
                const historyLast = song.playHistory[song.playHistory.length - 1];
                if (historyLast > lastPlayedTime) {
                    lastPlayedTime = historyLast;
                }
            }

            if (lastPlayedTime > 0) {
                playedCount++;
                // Create a temp object for sorting to ensure we use the effective lastPlayedTime
                // This doesn't mutate the original song, just uses the calculated time for sorting
                const songWithEffectiveTime = { ...song, lastPlayed: lastPlayedTime };
                insertSorted(topPlayed, songWithEffectiveTime, 'lastPlayed');
            }

            // 2. Recently Added
            insertSorted(topAdded, song, 'dateAdded');

            // 3. Never Played
            if (!song.playCount && !song.lastPlayed && (!song.playHistory || song.playHistory.length === 0)) {
                neverPlayedCount++;
                if (topNever.length < 3) topNever.push(song);
            }
        }

        return {
            recently_played: { songs: topPlayed, total: playedCount },
            recently_added: { songs: topAdded, total: songs.length },
            never_played: { songs: topNever, total: neverPlayedCount }
        };
    }, [songs]);

    const dynamicHistory = useMemo(() => {
        return HISTORY_ITEMS.map(item => ({
            ...item,
            data: (historyData as any)[item.id] || { songs: [], total: 0 }
        }));
    }, [historyData]);

    const renderHeader = () => {
        return (
            <View style={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Image
                        source={require('../../assets/discicon.png')}
                        style={{ width: 34, height: 34, borderRadius: 8 }}
                    />
                    <View style={{ marginLeft: 10 }}>
                        <Text style={[styles.appName, { color: theme.text }]}>Music</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Settings')}
                        onPressIn={() => settingsScale.value = withSpring(0.85)}
                        onPressOut={() => settingsScale.value = withSpring(1)}
                        style={styles.iconButton}
                        activeOpacity={0.7}
                    >
                        <Animated.View style={settingsAnimatedStyle}>
                            <Ionicons name="settings-outline" size={24} color={theme.text} />
                        </Animated.View>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 70, marginBottom: 20, marginTop: 10 }}>
                    <View style={styles.categoryPills}>
                        {CATEGORIES.map((cat) => (
                            <CategoryPill key={cat} cat={cat} navigation={navigation} />
                        ))}
                    </View>
                </View>

                <View style={[styles.sectionHeaderContainer, { paddingRight: 20 }]}>
                    <Ionicons name="heart" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 0 }]}>Your Favorites</Text>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Favorites')}
                        onPressIn={() => seeAllScale.value = withSpring(0.9)}
                        onPressOut={() => seeAllScale.value = withSpring(1)}
                        activeOpacity={0.7}
                    >
                        <Animated.View style={seeAllAnimatedStyle}>
                            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>See All</Text>
                        </Animated.View>
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
                        removeClippedSubviews={true}
                    >
                        {dynamicHistory.map((item) => (
                            <BigHistoryCard
                                key={item.id}
                                item={item}
                                categorySongs={item.data.songs}
                                totalSongs={item.data.total}
                                navigation={navigation}
                            />
                        ))}
                        <View style={{ width: 20 }} />
                    </ScrollView>
                </View>
            </View>
        );
    };

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
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        height: 40,
        minWidth: 90,
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
        borderRadius: 35,
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
    headerText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
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
