import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    withSpring,
    useSharedValue,
    useAnimatedStyle,
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
import { BlurView } from 'expo-blur';
import { SongsScreen } from './SongsScreen';
import { AlbumsScreen } from './AlbumsScreen';
import { ArtistsScreen } from './ArtistsScreen';

const TABS = ['Overview', 'Songs', 'Albums', 'Artists'];

const FAVORITES = [
    { id: 'most_played', name: 'Most Played', type: 'Smart Playlist', screen: 'Playlist', params: { id: 'most', name: 'Most Played', type: 'most_played' } },
    { id: 'liked', name: 'Liked Songs', type: 'Playlist', screen: 'Playlist', params: { id: 'liked', name: 'Liked Songs', type: 'playlist' } },
];

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

const HistoryCardDesign = () => (
    <>
        <View style={{ position: 'absolute', top: -15, right: -15, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View style={{ position: 'absolute', bottom: -5, left: -5, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)' }} />
    </>
);

const SmartPlaylistCard = ({
    item,
    onPress,
    onPlayPress,
    onShufflePress
}: {
    item: any,
    onPress: () => void,
    onPlayPress?: () => void,
    onShufflePress?: () => void
}) => {
    return (
        <TouchableOpacity style={styles.historyCard} onPress={onPress} activeOpacity={0.9}>
            <View style={[styles.historyImageContainer, { backgroundColor: item.color, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
                <HistoryCardDesign />
                <Ionicons name={item.icon || "musical-notes"} size={48} color="#fff" style={{ zIndex: 1 }} />
            </View>
            <View style={[styles.historyInfoContainer, { backgroundColor: item.cardColor || '#1a1a1a' }]}>
                <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>

                <View style={styles.historyStatsRow}>
                    <View style={styles.historyActionGroup}>
                        <TouchableOpacity
                            style={styles.historyActionBtn}
                            onPress={(e) => { e.stopPropagation(); onPlayPress?.(); }}
                        >
                            <Ionicons name="play" size={16} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.historyActionBtn, { marginLeft: 8 }]}
                            onPress={(e) => { e.stopPropagation(); onShufflePress?.(); }}
                        >
                            <Ionicons name="shuffle" size={16} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.historyStatGroup}>
                        <Text style={styles.historyStatText}>{item.count}</Text>
                        <Ionicons name="musical-notes-outline" size={10} color="#fff" />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const TopSongItem = ({ song, isPlaying, onPress, appTheme }: { song: Song, isPlaying: boolean, onPress: () => void, appTheme: any }) => {
    return (
        <TouchableOpacity style={styles.topSongItem} onPress={onPress}>
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
                    {song.playCount ? `${song.playCount.toLocaleString()} Played` : song.artist}
                </Text>
            </View>
            <TouchableOpacity style={styles.topSongMenuBtn}>
                <Ionicons name="ellipsis-horizontal" size={20} color={appTheme.text} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const TopArtistCard = ({ artist, appTheme, onPress }: any) => {
    const artistImage = useArtistImage(artist.name);

    return (
        <TouchableOpacity style={styles.topArtistCard} onPress={onPress}>
            <View style={styles.topArtistImageContainer}>
                <MusicImage
                    uri={artistImage || (artist.songs[0]?.coverImage)}
                    id={artist.name}
                    style={StyleSheet.absoluteFill}
                    iconSize={40}
                    iconName="person"
                />
            </View>
            <Text style={[styles.topArtistName, { color: appTheme.text }]} numberOfLines={1}>
                {artist.name}
            </Text>
            <Text style={[styles.topArtistSub, { color: appTheme.textSecondary }]} numberOfLines={1}>
                {artist.playedSongsCount} Songs
            </Text>
        </TouchableOpacity>
    );
};

export const HomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme: appTheme } = useTheme();
    const {
        songs,
        likedSongs,
        playlists,
        favoriteArtists,
        favoriteAlbums,
        topArtists,
        recentlyPlayed,
        recentlyAdded,
        neverPlayed
    } = useMusicLibrary();
    const { playSongInPlaylist, currentSong, isPlaying } = usePlayerContext();
    const [activeTab, setActiveTab] = useState('Overview');

    // Handle tab reset when home button is pressed
    useEffect(() => {
        const unsubscribe = (navigation.getParent() as any)?.addListener('tabPress', (e: any) => {
            // Check if we are already focused and the target is this tab
            const isFocused = navigation.isFocused();
            if (isFocused) {
                setActiveTab('Overview');
            }
        });

        return unsubscribe;
    }, [navigation]);

    const listeningHistoryPlaylists = useMemo(() => {
        return [
            {
                id: 'recently_played',
                title: 'Recently Played',
                type: 'recently_played',
                coverSong: recentlyPlayed[0],
                count: recentlyPlayed.length,
                color: '#1a140a',
                cardColor: '#2b2112',
                icon: 'time'
            },
            {
                id: 'recently_added',
                title: 'Recently Added',
                type: 'recently_added',
                coverSong: recentlyAdded[0],
                count: recentlyAdded.length,
                color: '#0a0f1f',
                cardColor: '#161d33',
                icon: 'add-circle'
            },
            {
                id: 'never_played',
                title: 'Never Played',
                type: 'never_played',
                coverSong: neverPlayed[0],
                count: neverPlayed.length,
                color: '#0a0a0a',
                cardColor: '#1a1a1a',
                icon: 'close-circle'
            }
        ];
    }, [recentlyPlayed, recentlyAdded, neverPlayed]);

    const topSongs = useMemo(() => {
        return [...songs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 10);
    }, [songs]);



    const handleTabPress = (tab: string) => {
        setActiveTab(tab);
    };

    const renderHeader = () => {
        return (
            <View>
                {/* Discovery Header */}
                <View style={styles.header}>
                    <View style={styles.headerTitleGroup}>
                        <Image source={require('../../assets/discicon.png')} style={styles.headerLogo} />
                        <Text style={[styles.appNameTitle, { color: appTheme.text }]}>Music</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings' as any)} style={styles.searchButton}>
                        <Ionicons name="settings" size={24} color={appTheme.text} />
                    </TouchableOpacity>
                </View>

                {/* Custom Tabs */}
                <View style={styles.tabsContainer}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => handleTabPress(tab)}
                                style={styles.tabItem}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: isActive ? appTheme.text : appTheme.textSecondary }
                                ]}>
                                    {tab}
                                </Text>
                                {isActive && <View style={[styles.activeIndicator, { backgroundColor: appTheme.primary }]} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderOverviewContent = () => {
        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                {/* Listening History */}
                <View style={[styles.sectionHeader, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Listening History</Text>
                    </View>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                    style={{ marginBottom: 10 }}
                >
                    {listeningHistoryPlaylists.map((item) => {
                        const getPlaylistSongs = () => {
                            if (item.type === 'recently_played') {
                                return recentlyPlayed;
                            }
                            if (item.type === 'recently_added') {
                                return recentlyAdded;
                            }
                            if (item.type === 'never_played') {
                                return neverPlayed;
                            }
                            return [];
                        };

                        const shuffleArray = (array: Song[]) => {
                            const shuffled = [...array];
                            for (let i = shuffled.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                            }
                            return shuffled;
                        };

                        return (
                            <SmartPlaylistCard
                                key={item.id}
                                item={item}
                                onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.title, type: item.type as any })}
                                onPlayPress={() => {
                                    const playlistSongs = getPlaylistSongs();
                                    if (playlistSongs.length > 0) {
                                        playSongInPlaylist(playlistSongs, 0, item.title);
                                    }
                                }}
                                onShufflePress={() => {
                                    const playlistSongs = getPlaylistSongs();
                                    if (playlistSongs.length > 0) {
                                        const shuffled = shuffleArray(playlistSongs);
                                        // If shuffle mode is already on, the player might shuffle it again.
                                        // But manually shuffling the list and playing index 0 is the most direct way.
                                        playSongInPlaylist(shuffled, 0, `${item.title} (Shuffled)`);
                                    }
                                }}
                            />
                        );
                    })}
                </ScrollView>

                {/* Top Songs */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Top Songs</Text>
                </View>

                <View style={styles.topSongsContainer}>
                    {topSongs.map((song, index) => (
                        <TopSongItem
                            key={song.id}
                            song={song}
                            isPlaying={currentSong?.id === song.id && isPlaying}
                            appTheme={appTheme}
                            onPress={() => playSongInPlaylist(topSongs, index, 'Top Songs')}
                        />
                    ))}
                </View>

                {/* Top Artists (Horizontal) */}
                {topArtists.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Top Artists</Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 25 }}
                        >
                            {topArtists.map((artist) => (
                                <TopArtistCard
                                    key={artist.name}
                                    artist={artist}
                                    appTheme={appTheme}
                                    onPress={() => navigation.navigate('Playlist', { id: artist.name, name: artist.name, type: 'artist' })}
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
            {activeTab === 'Overview' && renderOverviewContent()}
            {activeTab === 'Songs' && <SongsScreen isEmbedded={true} />}
            {activeTab === 'Albums' && <AlbumsScreen isEmbedded={true} />}
            {activeTab === 'Artists' && <ArtistsScreen isEmbedded={true} />}
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
        width: 34,
        height: 34,
        borderRadius: 8,
        marginRight: 12,
    },
    appNameTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    searchButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 30,
        gap: 24,
    },
    tabItem: {
        alignItems: 'center',
        position: 'relative',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -6,
        width: '100%',
        height: 3,
        // backgroundColor set inline
        borderRadius: 2,
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
        backgroundColor: '#4E5370', // Fallback color
    },
    historyImageContainer: {
        height: '65%',
        width: '100%',
        backgroundColor: '#333',
    },
    historyInfoContainer: {
        height: '35%',
        padding: 12,
        justifyContent: 'center',
    },
    historyTitle: {
        color: '#fff',
        fontWeight: 'bold',
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
    historyStatGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyStatText: {
        color: '#fff',
        fontSize: 10,
        opacity: 0.8,
        marginLeft: 4,
        marginRight: 4,
    },
    historyStatDivider: {
        width: 1,
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 4,
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
    iconCircle: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
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
    },
    topSongsContainer: {
        paddingHorizontal: 20,
        gap: 16,
        marginBottom: 30,
    },
    topSongItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topSongImageContainer: {
        width: 48,
        height: 48,
        borderRadius: 10,
        overflow: 'hidden',
        marginRight: 14,
        position: 'relative',
    },
    playingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topSongInfo: {
        flex: 1,
    },
    topSongTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    topSongSubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    topSongMenuBtn: {
        padding: 8,
    },
    topArtistCard: {
        width: 110,
        alignItems: 'center',
        marginRight: 20,
    },
    topArtistImageContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: 'hidden',
        marginBottom: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    topArtistName: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        width: '100%',
    },
    topArtistSub: {
        fontSize: 11,
        opacity: 0.6,
        marginTop: 2,
    }
});
