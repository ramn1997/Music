import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Song } from '../store/useLibraryStore';

import { RootStackParamList } from '../types/navigation';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MusicImage } from '../components/MusicImage';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { FlashList } from '@shopify/flash-list';

import { SongItem } from '../components/SongItem';
import { SongOptionsMenu } from '../components/SongOptionsMenu';
import { EditSongModal } from '../components/EditSongModal';

import { PlayingIndicator } from '../components/PlayingIndicator';
import { MarqueeText } from '../components/MarqueeText';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { SortOptionsModal, SortOption } from '../components/SortOptionsModal';


import { SafeAnimatedFlashList } from '../components/SafeAnimatedFlashList';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';

// Removed top-level creation to prevent initialization race conditions


export const SongsScreen = ({ isEmbedded }: { isEmbedded?: boolean }) => {
    const songs = useLibraryStore(state => state.songs);
    const loading = useLibraryStore(state => state.loading);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const playSongInPlaylist = usePlayerStore(state => state.playSongInPlaylist);
    const addToQueue = usePlayerStore(state => state.addToQueue);
    const addNext = usePlayerStore(state => state.addNext);
    const currentSong = usePlayerStore(state => state.currentTrack);
    const { theme, themeType } = useTheme();

    const playlists = useLibraryStore(state => state.playlists);
    const addToPlaylist = useLibraryStore(state => state.addToPlaylist);
    const updateSongMetadata = useLibraryStore(state => state.updateSongMetadata);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);

    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [songsToAddToPlaylist, setSongsToAddToPlaylist] = useState<Song[]>([]);
    const [sortOption, setSortOption] = useState<SortOption>('az');
    const [sortModalVisible, setSortModalVisible] = useState(false);
    const flatListRef = React.useRef<any>(null);
    const filteredSongsRef = React.useRef<Song[]>([]);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 150); // fast debounce to preserve responsiveness without killing thread
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedSongIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);

        setSelectedSongIds(newSet);
        if (newSet.size === 0) setIsSelectionMode(false);
    };

    const cancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedSongIds(new Set());
    };

    // Performance fix: Prevents UI stagger during screen navigation transitions
    const [isNavigated, setIsNavigated] = useState(false);
    React.useEffect(() => {
        const interaction = require('react-native').InteractionManager.runAfterInteractions(() => {
            setIsNavigated(true);
        });
        return () => interaction.cancel();
    }, []);

    const preSortedSongs = useLibraryStore(state => state.sortedSongs);

    const sortedSongs = React.useMemo(() => {
        if (!isNavigated) return [];
        if (sortOption === 'az') return preSortedSongs;

        let result = [...preSortedSongs];
        if (sortOption === 'za') {
            return result.reverse();
        } else if (sortOption === 'duration') {
            return result.sort((a, b) => (b.duration || 0) - (a.duration || 0));
        }
        return result;
    }, [preSortedSongs, sortOption, isNavigated]);



    const filteredSongs = React.useMemo(() => {
        if (!isNavigated) return [];
        let result = sortedSongs;
        if (debouncedQuery) {
            const query = debouncedQuery.toLowerCase();
            result = sortedSongs.filter(song =>
                (song.title && song.title.toLowerCase().includes(query)) ||
                (song.artist && song.artist.toLowerCase().includes(query))
            );
        }

        filteredSongsRef.current = result;
        return result;
    }, [sortedSongs, debouncedQuery, isNavigated]);

    const handlePlaySong = React.useCallback((song: Song) => {
        const index = filteredSongsRef.current.findIndex(s => s.id === song.id);
        if (index !== -1) {
            playSongInPlaylist(filteredSongsRef.current, index, "All Songs");
            navigation.navigate('Player', { trackIndex: index });
        }
    }, [playSongInPlaylist, navigation]);


    const onOpenOptions = React.useCallback((item: Song) => {
        setSelectedSong(item);
        setOptionsModalVisible(true);
    }, []);



    const callbacks = React.useRef({
        toggleSelection,
        handlePlaySong,
        onOpenOptions,
        setIsSelectionMode,
        setSelectedSongIds
    });
    callbacks.current = {
        toggleSelection,
        handlePlaySong,
        onOpenOptions,
        setIsSelectionMode,
        setSelectedSongIds
    };

    const renderSong = React.useCallback(({ item, index, extraData }: { item: Song; index: number, extraData?: any }) => {
        const d = extraData || {};
        return (
            <SongItem
                item={item}
                index={index}
                isCurrent={d.currentSongId === item.id}
                theme={d.theme}
                onPress={(song) => {
                    if (d.isSelectionMode) callbacks.current.toggleSelection(song.id);
                    else callbacks.current.handlePlaySong(song);
                }}
                onLongPress={(song) => {
                    if (!d.isSelectionMode) {
                        callbacks.current.setIsSelectionMode(true);
                        callbacks.current.setSelectedSongIds(new Set([song.id]));
                    } else {
                        callbacks.current.toggleSelection(song.id);
                    }
                }}
                isSelectionMode={d.isSelectionMode}
                isSelected={d.selectedSongIds.has(item.id)}
                onOpenOptions={callbacks.current.onOpenOptions}
            />
        );
    }, []);



    const extraData = React.useMemo(() => ({
        currentSongId: currentSong?.id,
        isSelectionMode,
        selectedSongIds,
        themeType,
        theme
    }), [currentSong?.id, isSelectionMode, selectedSongIds, themeType, theme]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            // Empty body bypasses the JS bridge tracking
        },
    });

    const content = (
        <>
            <SortOptionsModal
                visible={sortModalVisible}
                onClose={() => setSortModalVisible(false)}
                currentSort={sortOption}
                onSelect={setSortOption}
                options={[
                    { label: 'A-Z', value: 'az', icon: 'text' },
                    { label: 'Z-A', value: 'za', icon: 'text' },
                    { label: 'Duration', value: 'duration', icon: 'time-outline' },
                ]}
            />
            {/* Header */}
            <View style={[styles.header, { marginVertical: 0, paddingVertical: 10, paddingTop: isEmbedded ? 0 : 20 }]}>
                {!isEmbedded ? (
                    isSelectionMode ? (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity onPress={cancelSelection} style={styles.backButton}>
                                    <Ionicons name="close" size={24} color={theme.text} />
                                </TouchableOpacity>
                                <Text style={[styles.headerTitle, { color: theme.text }]}>{selectedSongIds.size} Selected</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    if (selectedSongIds.size > 0) {
                                        const selected = songs.filter(s => selectedSongIds.has(s.id));
                                        setSongsToAddToPlaylist(selected);
                                        setPlaylistModalVisible(true);
                                    }
                                }}
                                style={{ padding: 8 }}
                            >
                                <Ionicons name="add-circle" size={28} color={theme.primary} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={styles.headerLeft}>
                                <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                                </TouchableOpacity>
                                <Text style={[styles.headerTitle, { color: theme.text }]}>All Songs</Text>
                            </View>
                        </>
                    )
                ) : (
                    <View style={{ flex: 1 }} />
                )}
            </View>

            {/* Search Bar & Sort */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 10 }}>
                <View style={[styles.searchContainer, { backgroundColor: theme.card, flex: 1, marginRight: 10, marginHorizontal: 0, marginVertical: 0, borderWidth: 1, borderColor: theme.cardBorder }]}>
                    <Ionicons name="search" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search songs..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity onPress={() => setSortModalVisible(true)} style={styles.sortButton}>
                    <Ionicons name="options-outline" size={22} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {/* Action Buttons: Play All & Shuffle */}
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.primary, marginRight: 12 }]}
                    onPress={() => {
                        if (filteredSongs.length > 0) {
                            playSongInPlaylist(filteredSongs, 0, "All Songs");
                            navigation.navigate('Player', { trackIndex: 0 });
                        }
                    }}
                >
                    <Ionicons name="play" size={14} color={theme.textOnPrimary} />
                    <Text style={[styles.actionButtonText, { color: theme.textOnPrimary }]}>Play All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.primary, borderWidth: 1.5, opacity: 1 }]}
                    onPress={() => {
                        if (filteredSongs.length > 0) {
                            const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
                            playSongInPlaylist(shuffled, 0, "Shuffle Play");
                            navigation.navigate('Player', { trackIndex: 0 });
                        }
                    }}
                >
                    <Ionicons name="shuffle" size={14} color={theme.primary} />
                    <Text style={[styles.actionButtonText, { color: theme.text }]}>Shuffle</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading Songs...</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <SafeAnimatedFlashList
                        onScroll={scrollHandler}
                        scrollEventThrottle={16}
                        ref={flatListRef}
                        data={filteredSongs}
                        keyExtractor={(item: any) => item.id}
                        renderItem={renderSong}
                        extraData={extraData}
                        estimatedItemSize={70}
                        overrideItemLayout={(layout: any) => {
                            layout.size = 70;
                        }}
                        initialScrollIndex={0}
                        initialNumToRender={30}
                        maxToRenderPerBatch={30}
                        drawDistance={250} // Use default draw distance to prevent performance bottleneck
                        getItemType={() => 'song'}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Text style={{ color: theme.textSecondary }}>No songs found.</Text>
                            </View>
                        }
                        showsVerticalScrollIndicator={false}
                    />



                    {/* Options Modal - Dropdown Style Replaced with Bottom Sheet */}
                    <SongOptionsMenu
                        visible={optionsModalVisible}
                        onClose={() => setOptionsModalVisible(false)}
                        song={selectedSong}
                        onRequestPlaylistAdd={() => {
                            setOptionsModalVisible(false);
                            if (selectedSong) setSongsToAddToPlaylist([selectedSong]);
                            setTimeout(() => setPlaylistModalVisible(true), 100);
                        }}
                        onEditDetails={() => {
                            setOptionsModalVisible(false);
                            setTimeout(() => setEditModalVisible(true), 100);
                        }}
                    />

                    {/* Edit Song Modal */}
                    <EditSongModal
                        visible={editModalVisible}
                        onClose={() => setEditModalVisible(false)}
                        song={selectedSong}
                        onSave={updateSongMetadata}
                    />



                    {/* Add to Playlist Modal */}
                    <AddToPlaylistModal
                        visible={playlistModalVisible}
                        onClose={() => {
                            setPlaylistModalVisible(false);
                            setSongsToAddToPlaylist([]);
                        }}
                        songs={songsToAddToPlaylist}
                    />
                </View>
            )}
        </>
    );

    if (isEmbedded) {
        return <View style={{ flex: 1 }}>{content}</View>;
    }

    return (
        <ScreenContainer variant="default">
            {content}
        </ScreenContainer>
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        fontSize: 16
    },
    listContent: {
        paddingBottom: 150,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        paddingHorizontal: 12,
        height: 34,
        borderRadius: 17,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        height: '100%',
        paddingVertical: 0, // Fix cross-platform vertical alignment
    },
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    iconContainer: {
        marginRight: 15,
    },
    iconPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    songIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
    },
    songInfo: {
        flex: 1,
    },
    songTitle: {
        fontSize: 14, // Reduced from 16
        fontWeight: '500',
        marginBottom: 4,
    },
    songArtist: {
        fontSize: 12, // Reduced from 14
    },
    songDuration: {
        fontSize: 12, // Reduced from 14
        marginRight: 10,
    },
    moreButton: {
        padding: 5,
    },
    // Modal Styles
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
    playlistName: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1
    },
    songCount: {
        fontSize: 12
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
    playingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8
    },
    sortButton: {
        width: 34,
        height: 34,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingLeft: 20,
        paddingRight: 20,
        marginBottom: 15,
    },
    actionButton: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        borderRadius: 16, // Pill shape
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    }
});
