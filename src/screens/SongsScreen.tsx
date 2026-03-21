import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Pressable, Dimensions } from 'react-native';
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

const { width } = Dimensions.get('window');

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
        }, 150);
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
        onScroll: (event) => {},
    });

    // Material 3 Colors
    const onSurface = theme.text;
    const onSurfaceVariant = theme.textSecondary;
    const surfaceContainer = theme.card;
    const primaryContainer = theme.primary + '18';
    const onPrimaryContainer = theme.primary;

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
            {/* Material 3 Header */}
            <View style={[styles.header, { paddingTop: isEmbedded ? 0 : 16 }]}>
                {!isEmbedded ? (
                    isSelectionMode ? (
                        <View style={styles.headerContent}>
                            <TouchableOpacity onPress={cancelSelection} style={styles.iconButton}>
                                <Ionicons name="close" size={24} color={onSurface} />
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: onSurface, flex: 1, marginLeft: 16 }]}>{selectedSongIds.size} selected</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (selectedSongIds.size > 0) {
                                        const selected = songs.filter(s => selectedSongIds.has(s.id));
                                        setSongsToAddToPlaylist(selected);
                                        setPlaylistModalVisible(true);
                                    }
                                }}
                                style={styles.iconButton}
                            >
                                <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.headerContent}>
                            <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.iconButton}>
                                <Ionicons name="arrow-back" size={24} color={onSurface} />
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: onSurface, marginLeft: 16 }]}>All Songs</Text>
                        </View>
                    )
                ) : (
                    <View style={{ flex: 1 }} />
                )}
            </View>

            {/* Material 3 Search Bar & Filter */}
            <View style={styles.searchRow}>
                <View style={[styles.searchContainer, { backgroundColor: surfaceContainer, borderColor: theme.cardBorder }]}>
                    <Ionicons name="search" size={20} color={onSurfaceVariant} style={{ marginRight: 12 }} />
                    <TextInput
                        style={[styles.searchInput, { color: onSurface }]}
                        placeholder="Search songs..."
                        placeholderTextColor={onSurfaceVariant + '80'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        selectionColor={theme.primary}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={onSurfaceVariant} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    onPress={() => setSortModalVisible(true)}
                    style={[styles.filterButton, { backgroundColor: surfaceContainer, borderColor: theme.cardBorder }]}
                >
                    <Ionicons name="filter" size={20} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {/* Material 3 Action Buttons */}
            <View style={styles.mainActions}>
                <Pressable
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    style={[styles.primaryAction, { backgroundColor: theme.primary }]}
                    onPress={() => {
                        if (filteredSongs.length > 0) {
                            playSongInPlaylist(filteredSongs, 0, "All Songs");
                            navigation.navigate('Player', { trackIndex: 0 });
                        }
                    }}
                >
                    <Ionicons name="play" size={18} color={theme.textOnPrimary} />
                    <Text style={[styles.actionLabel, { color: theme.textOnPrimary }]}>Play All</Text>
                </Pressable>

                <Pressable
                    android_ripple={{ color: theme.primary + '20' }}
                    style={[styles.secondaryAction, { backgroundColor: primaryContainer, borderColor: theme.primary + '40' }]}
                    onPress={() => {
                        if (filteredSongs.length > 0) {
                            const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
                            playSongInPlaylist(shuffled, 0, "Shuffle Play");
                            navigation.navigate('Player', { trackIndex: 0 });
                        }
                    }}
                >
                    <Ionicons name="shuffle" size={18} color={theme.primary} />
                    <Text style={[styles.actionLabel, { color: theme.primary }]}>Shuffle</Text>
                </Pressable>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Text style={[styles.loadingText, { color: onSurfaceVariant }]}>Loading Songs...</Text>
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
                        overrideItemLayout={(layout: any) => { layout.size = 70; }}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        drawDistance={250}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="musical-notes-outline" size={48} color={onSurfaceVariant + '40'} />
                                <Text style={{ color: onSurfaceVariant, marginTop: 16, fontFamily: 'PlusJakartaSans_500Medium' }}>
                                    No songs found
                                </Text>
                            </View>
                        }
                        showsVerticalScrollIndicator={false}
                    />

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

                    <EditSongModal
                        visible={editModalVisible}
                        onClose={() => setEditModalVisible(false)}
                        song={selectedSong}
                        onSave={updateSongMetadata}
                    />

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

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.2,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        padding: 0,
    },
    filterButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    mainActions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 12,
    },
    primaryAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        borderRadius: 22,
        gap: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    secondaryAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        borderRadius: 22,
        gap: 8,
        borderWidth: 1,
    },
    actionLabel: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: 0.1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    listContent: {
        paddingBottom: 220,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        opacity: 0.6,
    },
});
