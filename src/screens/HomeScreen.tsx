import React, { useMemo, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    withSpring,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { MusicImage } from '../components/MusicImage';
import { MarqueeText } from '../components/MarqueeText';
import { useArtistImage } from '../hooks/useArtistImage';
import { useTheme } from '../hooks/ThemeContext';
import { useMusicLibrary, Song } from '../hooks/MusicLibraryContext';
import { usePlayerContext } from '../hooks/PlayerContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { FlashList } from '@shopify/flash-list';
import { SongItem } from '../components/SongItem';
import { SongOptionsMenu } from '../components/SongOptionsMenu';
import { EditSongModal } from '../components/EditSongModal';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { useHomeSettings } from '../hooks/HomeSettingsContext';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import { PlaylistCollage } from '../components/PlaylistCollage';

const FlashListAny = FlashList as any;

const COLLECTIONS = [
    { id: 'liked', name: 'Liked Songs', icon: 'heart', params: { id: 'liked', name: 'Liked Songs', type: 'playlist' } },
    { id: 'most_played', name: 'Most Played', icon: 'refresh', params: { id: 'most_played', name: 'Most Played', type: 'most_played' } },
];

const FAVORITES_LIST = [
    { id: 'liked', name: 'Liked Songs', icon: 'heart', params: { id: 'liked', name: 'Liked Songs', type: 'playlist' } },
    { id: 'most_played', name: 'Most Played', icon: 'refresh', params: { id: 'most_played', name: 'Most Played', type: 'most_played' } },
];

const PLAYLISTS_LIST = [
    { id: 'playlists', name: 'Playlists', icon: 'library', params: { id: 'Playlists', name: 'Playlists', type: 'playlist' } },
];

const getGradientColors = (id: string): [string, string] => {
    switch (id) {
        case 'Songs': return ['#0f172a', '#1e3a8a'];
        case 'Albums': return ['#4a044e', '#701a75'];
        case 'Artists': return ['#7c2d12', '#9a3412'];
        case 'Genres': return ['#064e3b', '#065f46'];
        case 'Years': return ['#1e293b', '#64748b'];
        case 'most_played': return ['#3b0764', '#581c87'];
        case 'liked': return ['#4c0519', '#881337'];
        case 'recently_played': return ['rgba(66, 32, 6, 0.5)', 'rgba(133, 77, 14, 0.35)'];
        case 'recently_added': return ['rgba(23, 37, 84, 0.5)', 'rgba(29, 78, 216, 0.35)'];
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

const HistoryCardDesign = () => null;

const FavoriteItemCard = React.memo(({ item, theme, navigation, isHorizontal, isListView, onPlayPress }: { item: any, theme: any, navigation: any, isHorizontal?: boolean, isListView?: boolean, onPlayPress?: (item: any) => void }) => {
    const isArtist = item.type === 'Artist' || (item.params as any)?.type === 'artist';
    const artistImage = useArtistImage(isArtist ? item.name : '');
    const displayImage = isArtist ? artistImage : item.image;

    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    if (isHorizontal) {
        return (
            <TouchableOpacity
                style={styles.favoriteItemWrapper}
                activeOpacity={0.9}
                onPressIn={() => scale.value = withSpring(0.95)}
                onPressOut={() => scale.value = withSpring(1)}
                onPress={() => {
                    const p = item.params as any;
                    navigation.navigate('Playlist', {
                        id: p.id,
                        name: p.name,
                        type: p.type
                    });
                }}
            >
                <Animated.View style={[animatedStyle, { flex: 1 }]}>
                    <View style={styles.favVerticalCard}>
                        <View style={[
                            styles.favVerticalImageContainer,
                            { backgroundColor: 'rgba(255,255,255,0.05)' },
                            isArtist && { borderRadius: 60, transform: [{ scale: 0.95 }] }
                        ]}>
                            {isArtist ? (
                                <MusicImage
                                    uri={displayImage}
                                    id={item.id}
                                    assetUri={(item as any).assetUri}
                                    style={StyleSheet.absoluteFill}
                                    iconSize={40}
                                    iconName="person"
                                />
                            ) : (
                                <PlaylistCollage
                                    songs={item.songs || []}
                                    size={140}
                                    iconSize={36}
                                    iconName={item.id === 'liked' ? "heart" : (item.type === 'Album' ? "disc" : "musical-notes")}
                                    borderRadius={12}
                                    showBubbles={false}
                                    gradientColors={getGradientColors(item.id)}
                                    forceSingleImage={item.type === 'Album'}
                                />
                            )}
                        </View>
                        <View style={styles.favVerticalInfo}>
                            <Text style={[styles.favVerticalTitle, { color: theme.text }]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={[styles.favVerticalSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                {isArtist ? 'Artist' : (item.type || 'Library')}
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        );
    }

    if (isListView) {
        return (
            <TouchableOpacity
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: 'rgba(255,255,255,0.05)'
                }}
                activeOpacity={0.7}
                onPress={() => {
                    const p = item.params as any;
                    if (item.id === 'Songs') return navigation.navigate('Songs');
                    if (item.id === 'Albums') return navigation.navigate('Albums');
                    if (item.id === 'Artists') return navigation.navigate('Artists');
                    if (item.id === 'playlists') return navigation.navigate('Playlists' as any);

                    navigation.navigate('Playlist', {
                        id: p.id,
                        name: p.name,
                        type: p.type
                    });
                }}
            >
                <View style={{ marginRight: 15 }}>
                    {isArtist ? (
                        <View style={{ width: 45, height: 45, borderRadius: 22.5, overflow: 'hidden', backgroundColor: theme.card }}>
                            <MusicImage
                                uri={displayImage}
                                id={item.id}
                                assetUri={(item as any).assetUri}
                                style={StyleSheet.absoluteFill}
                                iconSize={24}
                                iconName="person"
                            />
                        </View>
                    ) : (
                        <PlaylistCollage
                            songs={item.songs || []}
                            size={45}
                            iconSize={20}
                            iconName={
                                item.icon || (
                                    item.id === 'most_played' ? "refresh" :
                                        item.id === 'liked' ? "heart" :
                                            (item.params as any)?.type === 'album' ? "disc" :
                                                (item.params as any)?.type === 'genre' ? "pricetags" :
                                                    "musical-notes"
                                ) as any
                            }
                            borderRadius={10}
                            showBubbles={false}
                            gradientColors={getGradientColors(item.id)}
                        />
                    )}
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500', marginBottom: 4 }} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }} numberOfLines={1}>
                        {isArtist ? 'Artist' : (item.id === 'liked' ? 'Favorites' :
                            item.id === 'most_played' ? 'Smart Playlist' :
                                ['Songs', 'Albums', 'Artists', 'Genres'].includes(item.id) ? 'Library' : (item.type || 'Playlist'))}
                    </Text>
                </View>
                <TouchableOpacity
                    style={{ padding: 10, marginRight: -5 }}
                    onPress={(e) => {
                        e.stopPropagation();
                        onPlayPress?.(item);
                    }}
                >
                    <Ionicons name="play" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={styles.favoriteItemWrapperGrid}
            activeOpacity={0.9}
            onPressIn={() => scale.value = withSpring(0.95)}
            onPressOut={() => scale.value = withSpring(1)}
            onPress={() => {
                const p = item.params as any;
                if (item.id === 'Songs') return navigation.navigate('Songs');
                if (item.id === 'Albums') return navigation.navigate('Albums');
                if (item.id === 'Artists') return navigation.navigate('Artists');
                if (item.id === 'playlists') return navigation.navigate('Playlists' as any);

                navigation.navigate('Playlist', {
                    id: p.id,
                    name: p.name,
                    type: p.type
                });
            }}
        >
            <Animated.View style={[animatedStyle, { flex: 1 }]}>
                <View
                    style={[
                        {
                            width: '100%',
                            height: 65,
                            alignSelf: 'center',
                            justifyContent: 'center',
                            alignItems: 'center',
                        },
                        !isArtist && [
                            styles.favoriteCard,
                            {
                                borderRadius: 14,
                                overflow: 'hidden',
                                backgroundColor: 'rgba(255,255,255,0.06)'
                            }
                        ]
                    ]}
                >
                    {!isArtist && (
                        <LinearGradient
                            colors={getGradientColors(item.id)}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                    )}
                    {!isArtist && (
                        item.id === 'liked' ? (
                            <>
                                <View style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                            </>
                        ) : (
                            <View style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        )
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 1, flex: 1, width: '100%', paddingHorizontal: 12 }}>
                        {isArtist ? (
                            <View style={[
                                styles.iconCircle,
                                {
                                    width: 45,
                                    height: 45,
                                    borderRadius: 22.5,
                                    overflow: 'hidden',
                                    borderWidth: 2,
                                    borderColor: 'white',
                                    backgroundColor: theme.card,
                                    marginRight: 10
                                }
                            ]}>
                                <MusicImage
                                    uri={displayImage}
                                    id={item.id}
                                    assetUri={(item as any).assetUri}
                                    style={StyleSheet.absoluteFill}
                                    iconSize={24}
                                    iconName="person"
                                />
                            </View>
                        ) : (
                            <View style={{ marginRight: 10 }}>
                                <PlaylistCollage
                                    songs={item.songs || []}
                                    size={40}
                                    iconSize={18}
                                    iconName={
                                        item.icon || (
                                            item.id === 'most_played' ? "refresh" :
                                                item.id === 'liked' ? "heart" :
                                                    (item.params as any)?.type === 'album' ? "disc" :
                                                        (item.params as any)?.type === 'genre' ? "pricetags" :
                                                            "musical-notes"
                                        ) as any
                                    }
                                    borderRadius={8}
                                    showBubbles={false}
                                    gradientColors={getGradientColors(item.id)}
                                />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <MarqueeText
                                text={item.name}
                                style={[
                                    styles.favoriteName,
                                    {
                                        color: isArtist ? theme.text : 'white',
                                        fontWeight: 'bold',
                                        fontSize: 14,
                                        textAlign: 'left',
                                        width: '100%'
                                    }
                                ]}
                            />
                            {!isArtist && (
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '500' }}>
                                    {item.id === 'liked' ? 'Favorites' :
                                        item.id === 'most_played' ? 'Smart Playlist' :
                                            ['Songs', 'Albums', 'Artists', 'Genres'].includes(item.id) ? 'Library' : (item.type || 'Playlist')}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
            </Animated.View>
        </TouchableOpacity >
    );
});

const SmartPlaylistCard = React.memo(({
    item,
    onPress,
    onPlayPress,
    onShufflePress,
    isSmall = false
}: {
    item: any,
    onPress: (item: any) => void,
    onPlayPress?: (item: any) => void,
    onShufflePress?: (item: any) => void,
    isSmall?: boolean
}) => {
    const cardSize = isSmall ? 140 : 160;

    return (
        <TouchableOpacity
            style={{
                width: cardSize,
                height: cardSize,
                borderRadius: 16,
                overflow: 'hidden',
                marginRight: 15,
                backgroundColor: 'rgba(255,255,255,0.05)',
                justifyContent: 'flex-end'
            }}
            onPress={() => onPress(item)}
            activeOpacity={0.9}
        >
            <View style={StyleSheet.absoluteFill}>
                <PlaylistCollage
                    songs={item.songs || []}
                    collageSongs={item.collageSongs}
                    size={cardSize}
                    width={cardSize}
                    iconSize={isSmall ? 28 : 38}
                    iconName={item.icon || "musical-notes"}
                    borderRadius={0}
                    opacity={0.8}
                    showBubbles={false}
                />
            </View>

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: cardSize * 0.6,
                }}
            />

            <View style={{
                position: 'absolute',
                top: 8,
                right: 8,
                flexDirection: 'row',
                gap: 6
            }}>
                <TouchableOpacity
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onPress={(e) => { e.stopPropagation(); onPlayPress?.(item); }}
                >
                    <Ionicons name="play" size={14} color="#fff" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
            </View>

            <View style={{ padding: 12 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 2 }} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }} numberOfLines={1}>
                    {item.count || (item.songs?.length ?? 0)} songs
                </Text>
            </View>
        </TouchableOpacity>
    );
});

const TopSongItem = React.memo(({ song, index, isPlaying, onPress, appTheme }: { song: Song, index: number, isPlaying: boolean, onPress: (index: number) => void, appTheme: any }) => {
    return (
        <TouchableOpacity style={styles.topSongItem} onPress={() => onPress(index)}>
            <View style={styles.topSongImageContainer}>
                <MusicImage
                    uri={song.coverImage}
                    id={song.id}
                    style={StyleSheet.absoluteFill}
                    iconSize={20}
                />
                {isPlaying && (
                    <View style={styles.playingOverlay}>
                        <Ionicons name="play" size={16} color="#fff" />
                    </View>
                )}
            </View>
            <View style={styles.topSongInfo}>
                <Text style={[styles.topSongTitle, { color: appTheme.text }]} numberOfLines={1}>{song.title}</Text>
                <Text style={[styles.topSongSubtitle, { color: appTheme.textSecondary }]} numberOfLines={1}>
                    {song.artist}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

const TopArtistCard = React.memo(({ artist, appTheme, onPress, customImage }: any) => {
    if (!artist) return null;
    const artistImage = useArtistImage(artist.name);

    return (
        <TouchableOpacity style={styles.topArtistCard} onPress={() => onPress(artist)}>
            <View style={styles.topArtistImageContainer}>
                <MusicImage
                    uri={customImage || artistImage || artist.coverImage}
                    id={artist.name || 'unknown_artist'}
                    style={StyleSheet.absoluteFill}
                    iconSize={40}
                    iconName="person"
                />
            </View>
            <Text style={[styles.topArtistName, { color: appTheme?.text || '#fff' }]} numberOfLines={1}>
                {artist.name}
            </Text>
            <Text style={[styles.topArtistSub, { color: appTheme?.textSecondary || '#aaa' }]} numberOfLines={1}>
                {artist.songCount || 0} Songs
            </Text>
        </TouchableOpacity>
    );
});

export const HomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme: appTheme, themeType } = useTheme();
    const {
        songs,
        loading,
        savedFolders,
        topArtists,
        recentlyPlayed,
        recentlyAdded,
        neverPlayed,
        artistMetadata,
        incrementPlayCount,
        updateSongMetadata,
        playlists,
        favoriteArtists,
        favoriteAlbums,
        favoriteGenres,
        favoriteSpecialPlaylists,
        likedSongs
    } = useMusicLibrary();
    const { playSongInPlaylist, currentSong, isPlaying } = usePlayerContext();
    const { sectionVisibility } = useHomeSettings();

    const allFavorites = useMemo(() => {
        const favAlbumsSet = new Set(favoriteAlbums || []);
        const favGenresSet = new Set(favoriteGenres || []);
        const favArtistsSet = new Set(favoriteArtists || []);

        const albumSongsMap = new Map<string, Song[]>();
        const genreSongsMap = new Map<string, Song[]>();
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

        // Items from library, excluding Liked/Most Played as they are now in Collections grid
        return [...favoritedPlaylists, ...favArtists, ...favAlbums, ...favGenres];
    }, [playlists, favoriteArtists, favoriteAlbums, favoriteGenres, songs]);

    const homePlaylists = useMemo(() => {
        return PLAYLISTS_LIST.filter(item => {
            if (item.id === 'playlists') return sectionVisibility.playlists;
            return true;
        });
    }, [sectionVisibility.playlists]);

    const displayUserPlaylists = useMemo(() => {
        const PLAYLIST_COLORS = ['#4c1d95', '#1e3a8a', '#064e3b', '#7c2d12', '#4a044e', '#1e293b'];
        const getPlaylistColor = (id: string) => {
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return PLAYLIST_COLORS[hash % PLAYLIST_COLORS.length];
        };

        return (playlists || []).map(p => ({
            id: p.id,
            title: p.name,
            type: 'playlist',
            collageSongs: p.songs.slice(0, 4),
            coverSong: p.songs[0],
            songs: p.songs,
            count: p.songs.length,
            color: getPlaylistColor(p.id),
            cardColor: 'rgba(255,255,255,0.05)',
            icon: 'musical-notes'
        }));
    }, [playlists]);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [deferredQuery, setDeferredQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState<Song[]>([]);

    // Modal States
    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    const searchInputRef = useRef<TextInput>(null);

    const sortedMostPlayed = useMemo(() => {
        const played: Song[] = [];
        for (const s of (songs || [])) {
            if ((s.playCount || 0) > 0) played.push(s);
        }
        played.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        return played.slice(0, 50);
    }, [songs]);

    const sortedTopSongs = useMemo(() => {
        const played: Song[] = [];
        const unplayed: Song[] = [];
        for (const s of (songs || [])) {
            if ((s.playCount || 0) > 0) played.push(s);
            else if (unplayed.length < 10) unplayed.push(s);
        }
        played.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        return [...played, ...unplayed].slice(0, 10);
    }, [songs]);

    const collectionsWithSongs = useMemo(() => {
        return COLLECTIONS.map(item => {
            if (item.id === 'liked') return { ...item, songs: likedSongs || [] };
            if (item.id === 'most_played') {
                return { ...item, songs: sortedMostPlayed };
            }
            return { ...item, songs: [] };
        });
    }, [sortedMostPlayed, likedSongs]);

    useEffect(() => {
        const timer = setTimeout(() => setDeferredQuery(searchQuery), 150);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        loadRecentSearches();
    }, []);

    const loadRecentSearches = async () => {
        try {
            const saved = await AsyncStorage.getItem('recentSearches');
            if (saved) setRecentSearches(JSON.parse(saved));
        } catch (e) {
            console.error('Failed to load recent searches');
        }
    };

    const handleVoiceCommand = (command: string) => {
        setSearchQuery(command);
        setIsSearchFocused(true);
    };

    const { isListening, startListening, stopListening, error: voiceError } = useVoiceCommand(handleVoiceCommand);

    const saveSearch = async (song: Song) => {
        try {
            const updated = [song, ...recentSearches.filter(s => s.id !== song.id)].slice(0, 10);
            setRecentSearches(updated);
            await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save search');
        }
    };

    const removeRecentSearch = async (songId: string) => {
        try {
            const updated = recentSearches.filter(s => s.id !== songId);
            setRecentSearches(updated);
            await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to remove recent search');
        }
    };

    const clearRecentSearches = async () => {
        try {
            setRecentSearches([]);
            await AsyncStorage.removeItem('recentSearches');
        } catch (e) {
            console.error('Failed to clear searches');
        }
    };

    const filteredSongs = useMemo(() => {
        const trimmed = deferredQuery.trim().toLowerCase();
        if (!trimmed) return [];

        return songs.filter(s => {
            const title = (s.title ?? '').toLowerCase();
            const artist = (s.artist ?? '').toLowerCase();
            const album = (s.album ?? '').toLowerCase();
            return title.includes(trimmed) || artist.includes(trimmed) || album.includes(trimmed);
        });
    }, [songs, deferredQuery]);

    const handlePlaySong = React.useCallback((song: Song) => {
        // 1. Start playback IMMEDIATELY with just this song — no delay
        playSongInPlaylist([song], 0, "Search Results");
        navigation.navigate('Player', { trackIndex: 0 });
        Keyboard.dismiss();
        setIsSearchFocused(false);

        // 2. Run all non-blocking tasks in background after navigation
        setTimeout(() => {
            // Save to recent searches (async storage, non-blocking)
            saveSearch(song);
            // Increment play count (async storage)
            incrementPlayCount(song.id);

            // 3. If there's a search query, expand the queue to the full filtered results
            if (deferredQuery.trim() && filteredSongs.length > 1) {
                const index = filteredSongs.findIndex(s => s.id === song.id);
                if (index !== -1) {
                    playSongInPlaylist(filteredSongs, index, "Search Results");
                }
            }
        }, 300);
    }, [filteredSongs, playSongInPlaylist, navigation, incrementPlayCount, deferredQuery, saveSearch]);

    const onOpenOptions = React.useCallback((item: Song) => {
        setSelectedSong(item);
        setOptionsModalVisible(true);
    }, []);

    const listeningHistoryPlaylists = useMemo(() => {
        return [
            {
                id: 'recently_played',
                title: 'Recently Played',
                type: 'recently_played',
                collageSongs: recentlyPlayed.slice(0, 4),
                coverSong: recentlyPlayed[0],
                songs: recentlyPlayed,
                count: recentlyPlayed.length,
                color: '#1a140a',
                cardColor: '#2b2112',
                icon: 'time'
            },
            {
                id: 'recently_added',
                title: 'Recently Added',
                type: 'recently_added',
                collageSongs: recentlyAdded.slice(0, 4),
                coverSong: recentlyAdded[0],
                songs: recentlyAdded,
                count: recentlyAdded.length,
                color: '#0a0f1f',
                cardColor: '#161d33',
                icon: 'add-circle'
            },
            {
                id: 'never_played',
                title: 'Never Played',
                type: 'never_played',
                collageSongs: neverPlayed.slice(0, 4),
                coverSong: neverPlayed[0],
                songs: neverPlayed,
                count: neverPlayed.length,
                color: '#0a0a0a',
                cardColor: '#1a1a1a',
                icon: 'close-circle'
            }
        ];
    }, [recentlyPlayed, recentlyAdded, neverPlayed]);

    const topSongs = useMemo(() => {
        return sortedTopSongs;
    }, [sortedTopSongs]);

    const displayTopArtists = useMemo(() => {
        if (topArtists && topArtists.length > 0) {
            return topArtists.slice(0, 10);
        }
        if (songs && songs.length > 0) {
            const artistMap = new Map<string, { name: string, songCount: number, coverImage?: string }>();
            for (let i = 0; i < songs.length; i++) {
                const song = songs[i];
                if (!song.artist || song.artist === 'Unknown Artist') continue;
                const existing = artistMap.get(song.artist);
                if (existing) {
                    existing.songCount += 1;
                } else {
                    artistMap.set(song.artist, { name: song.artist, songCount: 1, coverImage: song.coverImage });
                }
            }
            return Array.from(artistMap.values()).sort((a, b) => b.songCount - a.songCount).slice(0, 10);
        }
        return [];
    }, [topArtists, songs]);

    const handleClearSearch = () => {
        setSearchQuery('');
        setDeferredQuery('');
        setIsSearchFocused(false);
        Keyboard.dismiss();
    };

    const handleTopSongPress = React.useCallback((index: number) => {
        if (topSongs && topSongs.length > index) {
            playSongInPlaylist(topSongs, index, 'Top Songs');
        }
    }, [topSongs, playSongInPlaylist]);

    const handleTopArtistPress = React.useCallback((artist: any) => {
        navigation.navigate('Playlist', { id: artist.name, name: artist.name, type: 'artist' });
    }, [navigation]);

    const handleSmartPlaylistPress = React.useCallback((item: any) => {
        navigation.navigate('Playlist', { id: item.id, name: item.title, type: item.type as any });
    }, [navigation]);

    const handleSmartPlaylistPlay = React.useCallback((item: any) => {
        let plSongs: Song[] = [];
        if (item.type === 'recently_played') plSongs = recentlyPlayed;
        else if (item.type === 'recently_added') plSongs = recentlyAdded;
        else if (item.type === 'never_played') plSongs = neverPlayed;
        else if (item.type === 'playlist') plSongs = item.songs;

        if (plSongs.length > 0) playSongInPlaylist(plSongs, 0, item.title);
    }, [recentlyPlayed, recentlyAdded, neverPlayed, playSongInPlaylist]);

    const handleSmartPlaylistShuffle = React.useCallback((item: any) => {
        let plSongs: Song[] = [];
        if (item.type === 'recently_played') plSongs = recentlyPlayed;
        else if (item.type === 'recently_added') plSongs = recentlyAdded;
        else if (item.type === 'never_played') plSongs = neverPlayed;
        else if (item.type === 'playlist') plSongs = item.songs;

        if (plSongs.length > 0) {
            const shuffled = [...plSongs].sort(() => Math.random() - 0.5);
            playSongInPlaylist(shuffled, 0, `${item.title} (Shuffled)`);
            navigation.navigate('Player', { trackIndex: 0 });
        }
    }, [recentlyPlayed, recentlyAdded, neverPlayed, playSongInPlaylist, navigation]);


    const renderHeader = () => {
        return (
            <View>
                <View style={styles.header}>
                    <View style={styles.headerTitleGroup}>
                        <View>
                            <Image source={require('../../assets/discicon.png')} style={styles.headerLogo} />
                        </View>
                        <Text style={[styles.appNameTitle, { color: appTheme.text }]}>Music</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Settings')}
                            style={styles.settingsButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="settings-outline" size={24} color={appTheme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.searchBar, { backgroundColor: appTheme.card, borderColor: appTheme.cardBorder, borderWidth: 1 }]}>
                    <Ionicons name="search" size={20} color={appTheme.textSecondary} />
                    <TextInput
                        ref={searchInputRef}
                        style={[styles.searchInput, { color: appTheme.text }]}
                        placeholder={isListening ? "Listening..." : "Search artists, songs, or albums"}
                        placeholderTextColor={isListening ? appTheme.primary : appTheme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setIsSearchFocused(true)}
                        autoCorrect={false}
                    />
                    {(searchQuery.length > 0 || isSearchFocused) ? (
                        <TouchableOpacity onPress={handleClearSearch}>
                            <Ionicons name="close-circle" size={20} color={appTheme.textSecondary} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={isListening ? stopListening : startListening}>
                            <Ionicons
                                name={isListening ? "mic" : "mic-outline"}
                                size={20}
                                color={isListening ? '#ef4444' : appTheme.textSecondary}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const renderOverviewContent = () => {
        if (!loading && savedFolders.length === 0) {
            return (
                <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyStateIconWrap}>
                        <Ionicons name="folder-open-outline" size={72} color={appTheme.primary} />
                    </View>
                    <Text style={[styles.emptyStateTitle, { color: appTheme.text }]}>No Music Yet</Text>
                    <Text style={[styles.emptyStateSubtitle, { color: appTheme.textSecondary }]}>Add music by selecting a folder from Settings</Text>
                </View>
            );
        }

        // Show search results if query exists
        if (searchQuery.trim().length > 0) {
            return (
                <FlashListAny
                    data={filteredSongs}
                    keyExtractor={(item: Song) => item.id}
                    renderItem={({ item, index }: { item: Song, index: number }) => (
                        <SongItem
                            item={item}
                            index={index}
                            isCurrent={currentSong?.id === item.id}
                            theme={appTheme}
                            onPress={handlePlaySong}
                            onOpenOptions={onOpenOptions}
                        />
                    )}
                    estimatedItemSize={70}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="search-outline" size={48} color={appTheme.textSecondary} style={{ marginTop: 60, opacity: 0.3 }} />
                            <Text style={{ color: appTheme.textSecondary, marginTop: 10 }}>No results for "{searchQuery}"</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 150 }}
                />
            );
        }

        // Show recent searches if bar is focused but empty
        if (isSearchFocused && recentSearches.length > 0) {
            return (
                <FlashListAny
                    data={recentSearches}
                    keyExtractor={(item: Song) => `recent-${item.id}`}
                    renderItem={({ item, index }: { item: Song, index: number }) => (
                        <View style={styles.recentItemContainer}>
                            <View style={{ flex: 1 }}>
                                <SongItem
                                    item={item}
                                    index={index}
                                    isCurrent={false}
                                    theme={appTheme}
                                    onPress={handlePlaySong}
                                    onOpenOptions={onOpenOptions}
                                />
                            </View>
                            <TouchableOpacity onPress={() => removeRecentSearch(item.id)} style={styles.removeRecentBtn}>
                                <Ionicons name="close" size={20} color={appTheme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListHeaderComponent={
                        <View style={styles.recentHeader}>
                            <Text style={[styles.recentTitle, { color: appTheme.text }]}>Recent Searches</Text>
                            <TouchableOpacity onPress={clearRecentSearches}>
                                <Text style={[styles.clearText, { color: appTheme.primary }]}>Clear All</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    estimatedItemSize={70}
                    contentContainerStyle={{ paddingBottom: 150 }}
                />
            );
        }



        // Default overview
        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                {sectionVisibility.collections && (
                    <>
                        <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                            <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Your Collections</Text>
                        </View>

                        <View style={styles.favoritesGrid}>
                            {collectionsWithSongs.map((item) => (
                                <FavoriteItemCard key={item.id} item={item} theme={appTheme} navigation={navigation} />
                            ))}
                        </View>
                    </>
                )}

                {sectionVisibility.favorites && allFavorites.length > 0 && (
                    <>
                        <View style={[styles.sectionHeader, { marginBottom: 12, marginTop: 10 }]}>
                            <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Favorites</Text>
                        </View>

                        <View
                            style={{ paddingHorizontal: 20, paddingBottom: 5 }}
                        >
                            {allFavorites.map((item) => (
                                <FavoriteItemCard
                                    key={item.id}
                                    item={item}
                                    theme={appTheme}
                                    navigation={navigation}
                                    isListView
                                    onPlayPress={(favItem) => {
                                        let playSongs: any[] = [];
                                        if (favItem.type === 'Artist') {
                                            playSongs = songs.filter((s: any) => s.artist === favItem.name);
                                        } else {
                                            playSongs = favItem.songs || [];
                                        }
                                        if (playSongs.length > 0) {
                                            playSongInPlaylist(playSongs, 0, favItem.name);
                                            navigation.navigate('Player', { trackIndex: 0 });
                                        }
                                    }}
                                />
                            ))}
                        </View>
                    </>
                )}

                {sectionVisibility.playlists && displayUserPlaylists.length > 0 && (
                    <>
                        <View style={[styles.sectionHeader, { marginBottom: 12, marginTop: 10 }]}>
                            <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Playlists</Text>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 15 }}
                            decelerationRate="fast"
                        >
                            {displayUserPlaylists.map((item) => (
                                <SmartPlaylistCard
                                    key={item.id}
                                    item={item}
                                    isSmall
                                    onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.title, type: 'playlist' })}
                                    onPlayPress={handleSmartPlaylistPlay}
                                    onShufflePress={handleSmartPlaylistShuffle}
                                />
                            ))}
                        </ScrollView>
                    </>
                )}
                {sectionVisibility.history && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Listening History</Text>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                            style={{ marginBottom: 10 }}
                            decelerationRate="fast"
                        >
                            {listeningHistoryPlaylists.map((item) => (
                                <SmartPlaylistCard
                                    key={item.id}
                                    item={item}
                                    onPress={handleSmartPlaylistPress}
                                    onPlayPress={handleSmartPlaylistPlay}
                                    onShufflePress={handleSmartPlaylistShuffle}
                                />
                            ))}
                        </ScrollView>
                    </>
                )}

                {sectionVisibility.topSongs && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Top Songs</Text>
                        </View>

                        <View style={styles.topSongsContainer}>
                            {topSongs.map((song, index) => (
                                <TopSongItem
                                    key={song.id}
                                    song={song}
                                    index={index}
                                    isPlaying={currentSong?.id === song.id && isPlaying}
                                    appTheme={appTheme}
                                    onPress={handleTopSongPress}
                                />
                            ))}
                        </View>
                    </>
                )}

                {sectionVisibility.topArtists && displayTopArtists.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Top Artists</Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 25 }}
                            decelerationRate="fast"
                        >
                            {displayTopArtists.map((artist) => (
                                <TopArtistCard
                                    key={artist.name}
                                    artist={artist}
                                    appTheme={appTheme}
                                    customImage={artistMetadata[artist.name]?.coverImage}
                                    onPress={handleTopArtistPress}
                                />
                            ))}
                        </ScrollView>
                    </>
                )}

            </ScrollView>
        );
    };

    return (
        <ScreenContainer variant="default">
            {renderHeader()}
            {renderOverviewContent()}

            <SongOptionsMenu
                visible={optionsModalVisible}
                onClose={() => setOptionsModalVisible(false)}
                song={selectedSong}
                onRequestPlaylistAdd={() => {
                    setOptionsModalVisible(false);
                    setTimeout(() => setPlaylistModalVisible(true), 100);
                }}
                onEditDetails={() => {
                    setOptionsModalVisible(false);
                    setTimeout(() => setEditModalVisible(true), 100);
                }}
            />

            <EditSongModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                song={selectedSong}
                onSave={updateSongMetadata}
            />

            <AddToPlaylistModal
                visible={playlistModalVisible}
                onClose={() => setPlaylistModalVisible(false)}
                songs={selectedSong ? [selectedSong] : []}
            />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 20,
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLogo: {
        width: 32,
        height: 32,
        borderRadius: 8,
        marginRight: 10,
    },
    logoGlow: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    appNameTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    settingsButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    identifyButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    identifyGlow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    searchBar: {
        flexDirection: 'row',
        height: 50,
        borderRadius: 25,
        marginHorizontal: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        paddingVertical: 0,
        height: '100%',
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    favoritesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    historyCard: {
        width: 150,
        height: 220,
        borderRadius: 20,
        overflow: 'hidden',
        marginRight: 15,
    },
    historyCardSmall: {
        width: 130,
        height: 180,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 15,
    },
    historyImageContainer: {
        height: '65%',
        width: '100%',
    },
    historyInfoContainer: {
        height: '35%',
        padding: 12,
        justifyContent: 'center',
    },
    historyTitle: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        marginBottom: 8,
    },
    historyStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    historyActionGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    favoriteItemWrapper: {
        width: 140,
        marginRight: 18,
    },
    favVerticalCard: {
        width: '100%',
        alignItems: 'center',
    },
    favVerticalImageContainer: {
        width: 140,
        height: 140,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 8,
    },
    favVerticalInfo: {
        width: '100%',
        alignItems: 'center',
    },
    favVerticalTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        width: '100%',
    },
    favVerticalSub: {
        fontSize: 11,
        opacity: 0.6,
        marginTop: 2,
    },
    favoriteItemWrapperGrid: {
        width: '48%',
        marginBottom: 15,
    },
    favoriteCard: {
        width: '100%',
        height: 65,
        padding: 0,
        overflow: 'hidden'
    },
    favoriteName: {
        fontSize: 14,
    },
    iconCircle: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    topSongsContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    topSongItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    topSongImageContainer: {
        width: 45,
        height: 45,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 12,
    },
    topSongInfo: {
        flex: 1,
    },
    topSongTitle: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    topSongSubtitle: {
        fontSize: 13,
        opacity: 0.7,
    },
    playingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topArtistCard: {
        width: 100,
        marginRight: 20,
        alignItems: 'center',
    },
    topArtistImageContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: 'hidden',
        marginBottom: 10,
    },
    topArtistName: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
        textAlign: 'center',
    },
    topArtistSub: {
        fontSize: 12,
        opacity: 0.7,
        textAlign: 'center',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 100,
    },
    emptyStateIconWrap: {
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 10,
    },
    emptyStateSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
        marginTop: 10,
    },
    recentTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    clearText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    recentItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 10,
    },
    removeRecentBtn: {
        padding: 10,
    }
});
