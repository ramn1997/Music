import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';
import { useLocalMusic, Song } from '../hooks/useLocalMusic';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { usePlayerContext } from '../hooks/PlayerContext';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { SongOptionsMenu } from '../components/SongOptionsMenu';
import { SongItem } from '../components/SongItem';
import { FlashList } from '@shopify/flash-list';
import { EditSongModal } from '../components/EditSongModal';
import { LyricsModal } from '../components/LyricsModal';
import { PlaylistOptionsMenu } from '../components/PlaylistOptionsMenu';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { MarqueeText } from '../components/MarqueeText';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { MusicImage } from '../components/MusicImage';
import { useArtistImage } from '../hooks/useArtistImage';
const FlashListAny = FlashList as any;

type Props = NativeStackScreenProps<RootStackParamList, 'Playlist'>;

const AnimatedLikedBackground = () => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.1);
    const rotate = useSharedValue(0);

    useEffect(() => {
        scale.value = withRepeat(withTiming(1.3, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
        opacity.value = withRepeat(withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
        rotate.value = withRepeat(withTiming(10, { duration: 3000, easing: Easing.inOut(Easing.ease) }), -1, true);
    }, []);

    const style1 = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value
    }));

    const style2 = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotate.value}deg` }, { scale: 1.1 }] as any
    }));

    return (
        <>
            <Animated.View style={[style1, { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'white' }]} />
            <Animated.View style={[style2, { position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        </>
    );
};

const ArtistProfileImage = ({ uri, name, primaryColor, cardColor }: { uri?: string, name: string, primaryColor: string, cardColor: string }) => {
    return (
        <View style={{ width: 140, height: 140, justifyContent: 'center', alignItems: 'center' }}>

            <View style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                borderWidth: 3,
                borderColor: 'white',
                overflow: 'hidden',
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
            }}>
                <MusicImage
                    uri={uri}
                    id={name}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    iconSize={80}
                />
            </View>
        </View>
    );
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

export const PlaylistScreen = ({ route, navigation }: Props) => {
    const { id, name } = route.params;
    const type = route.params.type as any;
    const { songs, loading } = useLocalMusic();
    const { likedSongs, playlists, addToPlaylist, toggleLike, removeFromPlaylist, deletePlaylist, togglePlaylistFavorite, toggleFavoriteArtist, isFavoriteArtist, toggleFavoriteAlbum, isFavoriteAlbum, toggleFavoriteGenre, isFavoriteGenre, updateSongMetadata } = useMusicLibrary();
    const { playSongInPlaylist, addToQueue, addNext } = usePlayerContext();
    const { theme } = useTheme();
    const [displaySongs, setDisplaySongs] = useState<Song[]>([]);

    // Artist info from internet
    const [artistInfo, setArtistInfo] = useState<{
        image: string | null;
        bio: string | null;
        listeners: string | null;
    } | null>(null);
    const [loadingArtistInfo, setLoadingArtistInfo] = useState(false);
    const deezerArtistImage = useArtistImage(type === 'artist' ? name : '');


    // Fetch artist info when type is 'artist'
    useEffect(() => {
        if (type === 'artist' && name) {
            const fetchArtistInfo = async () => {
                setLoadingArtistInfo(true);
                try {
                    // Using Last.fm API (free, no key required for basic info)
                    const response = await fetch(
                        `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=b25b959554ed76058ac220b7b2e0a026&format=json`
                    );
                    const data = await response.json();

                    if (data.artist) {
                        const imageUrl = data.artist.image?.find((img: any) => img.size === 'extralarge')?.['#text'] ||
                            data.artist.image?.find((img: any) => img.size === 'large')?.['#text'] ||
                            null;
                        const bio = data.artist.bio?.summary?.replace(/<[^>]*>/g, '').split(' Read more')[0] || null;
                        const listeners = data.artist.stats?.listeners || null;

                        setArtistInfo({
                            image: imageUrl && imageUrl !== '' ? imageUrl : null,
                            bio: bio,
                            listeners: listeners
                        });
                    }
                } catch (error) {
                    console.log('Could not fetch artist info (offline or API error)');
                    setArtistInfo(null);
                } finally {
                    setLoadingArtistInfo(false);
                }
            };

            fetchArtistInfo();
        }
    }, [type, name]);

    // Modal State
    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [lyricsModalVisible, setLyricsModalVisible] = useState(false);
    const [sortOrder, setSortOrder] = useState<'recent' | 'asc' | 'desc'>('recent');
    const [viewMode, setViewMode] = useState<'songs' | 'albums' | 'artists'>('songs');

    // Reset view mode to songs when navigating to a new playlist/artist/album
    useEffect(() => {
        setViewMode('songs');
    }, [id, type]);

    const currentPlaylist = playlists.find(p => p.id === id);
    const isPlaylistFavorite = currentPlaylist?.isFavorite || false;

    // Get gradient colors for header if applicable (matches HomeScreen)
    const getPlaylistGradientColors = (playlistId: string): [string, string] => {
        switch (playlistId) {
            case 'Songs': return ['#0f172a', '#1e3a8a'];
            case 'Albums': return ['#4a044e', '#701a75'];
            case 'Artists': return ['#7c2d12', '#9a3412'];
            case 'Genres': return ['#064e3b', '#065f46'];
            case 'most_played': return ['#2e1065', '#5b21b6'];
            case 'liked': return ['#881337', '#be123c'];
            case 'recently_played': return ['#422006', '#854d0e'];
            case 'recently_added': return ['#172554', '#1d4ed8'];
            case 'never_played': return ['#020617', '#334155'];
            default: {
                const hash = playlistId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
    const gradientColors = getPlaylistGradientColors(id);
    const [playlistOptionsVisible, setPlaylistOptionsVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    useEffect(() => {
        let filtered = [...songs];

        // Filter based on type
        if (id === 'liked') {
            filtered = [...likedSongs];
        } else if (type === 'artist') {
            filtered = filtered.filter(s => (s.artist || 'Unknown Artist') === name);
        } else if (type === 'album') {
            filtered = filtered.filter(s => (s.album || 'Unknown Album') === name);
        } else if (type === 'genre') {
            filtered = filtered.filter(s => (s.genre || 'Unknown Genre') === name);
        } else if (type === 'year') {
            filtered = filtered.filter(s => (s.year || 'Unknown Year') === name);
        } else if (type === 'most_played') {
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            filtered = filtered.filter(s => {
                const playsToday = s.playHistory?.filter(t => t > oneDayAgo).length || 0;
                return playsToday > 2;
            });
            filtered.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        } else if (type === 'recently_played') {
            filtered = filtered.filter(s => s.lastPlayed).sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
        } else if (type === 'recently_added' || (id === 'recently_added')) {
            filtered.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
        } else if (type === 'never_played') {
            // Songs not played in the last week (or never played)
            const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            filtered = filtered.filter(s => !s.lastPlayed || s.lastPlayed < oneWeekAgo);
            // Sort by date added (newest 'ignored' songs first)
            filtered.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
        } else if (type === 'playlist') {
            const pl = playlists.find(p => p.id === id);
            if (pl) filtered = [...pl.songs];
            else filtered = [];
        }

        // Apply sorting
        if (sortOrder === 'recent') {
            filtered.sort((a, b) => {
                // If it's a playlist or liked songs, use the time it was ADDED to that list
                if (type === 'playlist' || id === 'liked') {
                    const timeA = a.addedToPlaylistAt || a.dateAdded || 0;
                    const timeB = b.addedToPlaylistAt || b.dateAdded || 0;
                    return timeB - timeA;
                }
                // Otherwise use the file's modification date
                return (b.dateAdded || 0) - (a.dateAdded || 0);
            });
        } else if (sortOrder === 'asc') {
            filtered.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
        } else if (sortOrder === 'desc') {
            filtered.sort((a, b) => b.title.toLowerCase().localeCompare(a.title.toLowerCase()));
        } else {
            // Fallback default sort (A-Z) if not special and not recent
            if (!['most_played', 'recently_played', 'recently_added', 'never_played'].includes(type || '') && id !== 'liked' && type !== 'playlist') {
                filtered.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
            }
        }

        setDisplaySongs(filtered);
        if (type === 'playlist' && id !== 'liked') {
            // viewMode handled by dedicated effect now
        }
    }, [songs, type, name, id, likedSongs, playlists, sortOrder]);

    const handlePlaySong = React.useCallback((song: Song) => {
        const index = displaySongs.findIndex(s => s.id === song.id);
        if (index !== -1) {
            playSongInPlaylist(displaySongs, index, name);
            navigation.navigate('Player', { trackIndex: index });
        }
    }, [displaySongs, name, playSongInPlaylist, navigation]);


    const onOpenOptions = React.useCallback((item: Song) => {
        setSelectedSong(item);
        setOptionsModalVisible(true);
    }, []);

    const renderSong = React.useCallback(({ item, index }: { item: Song; index: number }) => (
        <SongItem
            item={item}
            index={index}
            isCurrent={false}
            theme={theme}
            onPress={handlePlaySong}
            onOpenOptions={onOpenOptions}
        />
    ), [theme, handlePlaySong, onOpenOptions]);



    const groupedContent = React.useMemo(() => {
        if (viewMode === 'albums') {
            const albums = new Map<string, { name: string, count: number, id: string }>();
            displaySongs.forEach(song => {
                const key = song.album || 'Unknown Album';
                const existing = albums.get(key) || { name: key, count: 0, id: song.albumId || key };
                existing.count++;
                albums.set(key, existing);
            });
            return Array.from(albums.values());
        } else if (viewMode === 'artists') {
            const artists = new Map<string, { name: string, count: number }>();
            displaySongs.forEach(song => {
                const key = song.artist || 'Unknown Artist';
                const existing = artists.get(key) || { name: key, count: 0 };
                existing.count++;
                artists.set(key, existing);
            });
            return Array.from(artists.values());
        }
        return [];
    }, [displaySongs, viewMode]);

    const renderAlbumItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.songItem}
            onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'album' })}
        >
            <View style={[styles.playlistIcon, { backgroundColor: theme.card, marginRight: 15 }]}>
                <Ionicons name="disc" size={24} color={theme.primary} />
            </View>
            <View style={styles.songInfo}>
                <MarqueeText text={item.name} style={[styles.songTitle, { color: theme.text }]} />
                <Text style={[styles.songArtist, { color: theme.textSecondary }]} numberOfLines={1}>{item.count} Songs</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
    );

    const renderArtistItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.songItem}
            onPress={() => navigation.navigate('Playlist', { id: item.name, name: item.name, type: 'artist' })}
        >
            <View style={[styles.playlistIcon, { backgroundColor: theme.card, marginRight: 15 }]}>
                <Ionicons name="person" size={24} color={theme.primary} />
            </View>
            <View style={styles.songInfo}>
                <MarqueeText text={item.name} style={[styles.songTitle, { color: theme.text }]} />
                <Text style={[styles.songArtist, { color: theme.textSecondary }]} numberOfLines={1}>{item.count} Songs</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <ScreenContainer variant="default">
            <View style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    {/* Clean header for specific playlists */}
                    {(!['playlist', 'most_played', 'recently_played', 'recently_added', 'never_played', 'album', 'artist', 'genre'].includes(type || '') && id !== 'liked') ? (
                        <Text style={[styles.headerTitle, { color: theme.text }]}>{name}</Text>
                    ) : null}
                    <View style={{ width: 40 }} />
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading Music...</Text>
                    </View>
                ) : (
                    <>
                        <FlashListAny
                            data={(viewMode === 'songs' ? displaySongs : groupedContent) as any[]}
                            keyExtractor={(item, index) => (item as any).id || (item as any).name || String(index)}
                            renderItem={viewMode === 'songs' ? renderSong : (viewMode === 'albums' ? renderAlbumItem : renderArtistItem)}
                            contentContainerStyle={styles.listContent}
                            estimatedItemSize={70}
                            getItemType={(item) => viewMode === 'songs' ? 'song' : 'item'}
                            drawDistance={500}
                            removeClippedSubviews={true}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', marginTop: 50 }}>
                                    <Text style={{ color: theme.textSecondary }}>No {viewMode} found in this playlist.</Text>
                                </View>
                            }
                            ListHeaderComponent={
                                <View style={styles.playlistHeader}>
                                    <View style={[
                                        styles.playlistArtCard,
                                        { backgroundColor: theme.card, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder },
                                        (type === 'recently_played' || type === 'recently_added' || type === 'never_played' || type === 'artist') && { borderRadius: 90 }
                                    ]}>
                                        <LinearGradient
                                            colors={gradientColors as [string, string]}
                                            style={StyleSheet.absoluteFill}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        />

                                        {/* Design Elements based on ID/Type */}
                                        <CardDesign />

                                        {/* Skewed design for history items */}
                                        {(type === 'recently_played' || type === 'recently_added' || type === 'never_played') && <HistoryCardDesign />}

                                        {id === 'liked' && <AnimatedLikedBackground />}

                                        {type === 'artist' && (
                                            <View style={StyleSheet.absoluteFill}>
                                                <Image
                                                    source={{ uri: deezerArtistImage || artistInfo?.image || undefined }}
                                                    style={StyleSheet.absoluteFill}
                                                    resizeMode="cover"
                                                />
                                                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                                                <LinearGradient
                                                    colors={['transparent', 'rgba(0,0,0,0.5)']}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                            </View>
                                        )}

                                        <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                            {/* Priority 1: Listening History ALWAYS use icons to match HomeScreen */}
                                            {(type === 'recently_played' || type === 'recently_added' || type === 'never_played') ? (
                                                <View style={{
                                                    backgroundColor: 'transparent',
                                                    width: 120,
                                                    height: 120,
                                                    borderRadius: 60,
                                                    borderWidth: 2,
                                                    borderColor: 'rgba(255,255,255,0.2)',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 4 },
                                                    shadowOpacity: 0.1,
                                                    shadowRadius: 8,
                                                }}>
                                                    <Ionicons
                                                        name={
                                                            type === 'never_played' ? "ban-outline" :
                                                                type === 'recently_added' ? "time-outline" :
                                                                    "musical-notes-outline"
                                                        }
                                                        size={70}
                                                        color="white"
                                                    />
                                                </View>
                                            ) : type === 'artist' ? (
                                                <ArtistProfileImage
                                                    uri={deezerArtistImage || artistInfo?.image || undefined}
                                                    name={name}
                                                    primaryColor={theme.primary}
                                                    cardColor={theme.card}
                                                />
                                            ) : type === 'album' && displaySongs[0] ? (
                                                <MusicImage
                                                    uri={displaySongs[0].coverImage}
                                                    id={displaySongs[0].id}
                                                    assetUri={displaySongs[0].uri}
                                                    style={{ width: '100%', height: '100%', borderRadius: 12 }}
                                                    resizeMode="cover"
                                                    iconSize={80}
                                                />
                                            ) : (
                                                <Ionicons
                                                    name={
                                                        id === 'liked' ? 'heart' :
                                                            id === 'most_played' ? 'refresh' :
                                                                type === 'never_played' ? 'ban-outline' :
                                                                    type === 'recently_added' ? 'time-outline' :
                                                                        type === 'artist' ? 'person' :
                                                                            type === 'album' ? 'disc' :
                                                                                type === 'year' ? 'calendar' :
                                                                                    'musical-notes-outline'
                                                    }
                                                    size={80}
                                                    color="white"
                                                />
                                            )}
                                        </View>
                                    </View>
                                    <Text style={[
                                        styles.playlistName,
                                        {
                                            color: theme.text,
                                            fontSize: type === 'artist' ? 32 : 28,
                                            letterSpacing: type === 'artist' ? 0.5 : 0
                                        }
                                    ]}>{name}</Text>

                                    {/* Artist Info Section */}
                                    {type === 'artist' && artistInfo?.listeners && (
                                        <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                                            {parseInt(artistInfo.listeners).toLocaleString()} listeners on Last.fm
                                        </Text>
                                    )}

                                    <Text style={[styles.playlistCount, { color: theme.textSecondary }]}>{displaySongs.length} Songs</Text>

                                    {/* Artist Bio */}
                                    {type === 'artist' && artistInfo?.bio && (
                                        <Text
                                            style={{
                                                color: theme.textSecondary,
                                                fontSize: 13,
                                                textAlign: 'center',
                                                marginTop: 10,
                                                marginHorizontal: 20,
                                                lineHeight: 18
                                            }}
                                            numberOfLines={4}
                                        >
                                            {artistInfo.bio}
                                        </Text>
                                    )}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15 }}>
                                        <TouchableOpacity
                                            style={[styles.playAllButton, { backgroundColor: theme.primary }]}
                                            onPress={() => {
                                                if (displaySongs.length > 0) {
                                                    handlePlaySong(displaySongs[0]);
                                                }
                                            }}
                                        >
                                            <Ionicons name="play" size={20} color={theme.background} />
                                            <Text style={[styles.playAllText, { color: theme.background }]}>Play All</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.deleteButton, { backgroundColor: 'transparent', borderWidth: 0 }]}
                                            onPress={() => setSortOrder(prev => {
                                                if (prev === 'recent') return 'asc';
                                                if (prev === 'asc') return 'desc';
                                                return 'recent';
                                            })}
                                        >
                                            <Ionicons name="swap-vertical" size={20} color={theme.primary} />
                                        </TouchableOpacity>

                                        {(type === 'playlist' && id !== 'liked') || ['artist', 'album', 'genre'].includes(type || '') ? (
                                            <TouchableOpacity
                                                style={[styles.deleteButton, { backgroundColor: 'transparent', borderWidth: 0 }]}
                                                onPress={() => setPlaylistOptionsVisible(true)}
                                            >
                                                <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    <PlaylistOptionsMenu
                                        visible={playlistOptionsVisible}
                                        onClose={() => setPlaylistOptionsVisible(false)}
                                        playlistName={name}
                                        isFavorite={
                                            type === 'playlist' ? isPlaylistFavorite :
                                                type === 'artist' ? isFavoriteArtist(name) :
                                                    type === 'album' ? isFavoriteAlbum(name) :
                                                        type === 'genre' ? isFavoriteGenre(name) : false
                                        }
                                        onToggleFavorite={
                                            type === 'playlist' ? () => togglePlaylistFavorite(id) :
                                                type === 'artist' ? () => toggleFavoriteArtist(name) :
                                                    type === 'album' ? () => toggleFavoriteAlbum(name) :
                                                        type === 'genre' ? () => toggleFavoriteGenre(name) : undefined
                                        }
                                        onDelete={type === 'playlist' ? () => {
                                            // Wait a bit for menu to close before showing modal
                                            setTimeout(() => {
                                                setDeleteModalVisible(true);
                                            }, 300);
                                        } : undefined}
                                    />

                                    <ConfirmationModal
                                        visible={deleteModalVisible}
                                        title="Delete Playlist"
                                        message={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
                                        confirmText="Delete"
                                        isDestructive={true}
                                        onCancel={() => setDeleteModalVisible(false)}
                                        onConfirm={async () => {
                                            setDeleteModalVisible(false);
                                            await deletePlaylist(id);
                                            navigation.goBack();
                                        }}
                                    />

                                    {/* View Mode Pills - Only for system playlists or generic lists */}
                                    {(type !== 'playlist' || id === 'liked') && (
                                        <View style={styles.pillsContainer}>
                                            {(['songs', 'albums', 'artists'] as const)
                                                .filter(mode => {
                                                    if (type === 'album' && mode === 'albums') return false;
                                                    if (type === 'artist' && mode === 'artists') return false;
                                                    return true;
                                                })
                                                .map((mode) => (
                                                    <TouchableOpacity
                                                        key={mode}
                                                        style={[
                                                            styles.pill,
                                                            { backgroundColor: viewMode === mode ? theme.primary : theme.card },
                                                            { borderColor: theme.cardBorder, borderWidth: 1 }
                                                        ]}
                                                        onPress={() => setViewMode(mode)}
                                                    >
                                                        <Text style={[
                                                            styles.pillText,
                                                            { color: viewMode === mode ? theme.background : theme.text }
                                                        ]}>
                                                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                        </View>
                                    )}
                                </View>
                            }
                            showsVerticalScrollIndicator={false}
                        />

                        {/* Options Modal - Dropdown Style Replaced */}
                        <SongOptionsMenu
                            visible={optionsModalVisible}
                            onClose={() => setOptionsModalVisible(false)}
                            song={selectedSong}
                            onRequestPlaylistAdd={() => {
                                setOptionsModalVisible(false);
                                setTimeout(() => setPlaylistModalVisible(true), 100);
                            }}
                            onRemoveFromPlaylist={
                                (!['artist', 'album', 'genre', 'most_played', 'recently_played', 'never_played'].includes(type || '') && id !== 'liked' && selectedSong)
                                    ? () => removeFromPlaylist(id, selectedSong?.id || '')
                                    : undefined
                            }
                            onEditDetails={() => {
                                setOptionsModalVisible(false);
                                setTimeout(() => setEditModalVisible(true), 100);
                            }}
                            onShowLyrics={() => {
                                setOptionsModalVisible(false);
                                setTimeout(() => setLyricsModalVisible(true), 100);
                            }}
                        />

                        {/* Edit Song Modal */}
                        <EditSongModal
                            visible={editModalVisible}
                            onClose={() => setEditModalVisible(false)}
                            song={selectedSong}
                            onSave={updateSongMetadata}
                        />

                        {/* Lyrics Modal */}
                        <LyricsModal
                            visible={lyricsModalVisible}
                            onClose={() => setLyricsModalVisible(false)}
                            song={selectedSong}
                        />

                        {/* Add to Playlist Modal */}
                        <AddToPlaylistModal
                            visible={playlistModalVisible}
                            onClose={() => setPlaylistModalVisible(false)}
                            song={selectedSong}
                        />
                    </>
                )}
                {/* Confirmation Modal */}
                <ConfirmationModal
                    visible={deleteModalVisible}
                    title="Delete Playlist"
                    message={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    isDestructive={true}
                    onCancel={() => setDeleteModalVisible(false)}
                    onConfirm={async () => {
                        setDeleteModalVisible(false);
                        await deletePlaylist(id);
                        navigation.goBack();
                    }}
                />
            </View>
        </ScreenContainer >
    );
};

const formatDuration = (millis: number) => {
    if (!millis) return "0:00";
    const minutes = Math.floor(millis / 1000 / 60);
    const seconds = Math.floor((millis / 1000) % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 16
    },
    listContent: {
        paddingBottom: 150,
    },
    playlistHeader: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    playlistArtCard: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 30,
    },
    playlistName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 5,
    },
    songCount: {
        fontSize: 12,
    },
    playlistCount: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 20,
    },
    playAllButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 25,
        alignItems: 'center',
        gap: 8,
    },
    playAllText: {
        color: colors.background,
        fontWeight: 'bold',
        fontSize: 14,
    },
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    songIndex: {
        width: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    songInfo: {
        flex: 1,
        marginLeft: 10,
    },
    songTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    songArtist: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    songDuration: {
        color: colors.textSecondary,
        fontSize: 14,
        marginRight: 10,
    },
    moreButton: {
        padding: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)', // More transparent
    },
    playlistModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        maxHeight: '60%',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        elevation: 5
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    playlistIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    // Dropdown Styles
    dropdownMenu: {
        position: 'absolute',
        width: 200,
        padding: 6, // Reduced padding
        borderRadius: 12,
        borderWidth: 1,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10, // Reduced vertical padding
        paddingHorizontal: 10,
    },
    dropdownText: {
        fontSize: 16,
        fontWeight: '500'
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginVertical: 10,
        paddingHorizontal: 15,
        height: 40,
        borderRadius: 20,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
    },
    pillsContainer: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 10
    },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '600'
    },
    deleteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1
    }
});
