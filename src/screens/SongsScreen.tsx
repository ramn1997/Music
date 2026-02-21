import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLocalMusic, Song } from '../hooks/useLocalMusic';
import { RootStackParamList } from '../types/navigation';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MusicImage } from '../components/MusicImage';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { usePlayerContext } from '../hooks/PlayerContext';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { FlashList } from '@shopify/flash-list';
import { SongItem } from '../components/SongItem';
import { SongOptionsMenu } from '../components/SongOptionsMenu';
import { EditSongModal } from '../components/EditSongModal';

import { PlayingIndicator } from '../components/PlayingIndicator';
import { MarqueeText } from '../components/MarqueeText';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';


const FlashListAny = FlashList as any;

export const SongsScreen = ({ isEmbedded }: { isEmbedded?: boolean }) => {
    const { songs, loading } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { playSongInPlaylist, addToQueue, addNext, currentSong } = usePlayerContext();
    const { theme } = useTheme();
    const { playlists, addToPlaylist, updateSongMetadata } = useMusicLibrary();
    const [searchQuery, setSearchQuery] = useState('');
    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);

    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [songsToAddToPlaylist, setSongsToAddToPlaylist] = useState<Song[]>([]);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const flatListRef = React.useRef<any>(null);

    // Multi-select state
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

    const filteredSongs = React.useMemo(() => {
        const activeSongs = songs.filter(song =>
            song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return activeSongs.sort((a, b) => {
            const comparison = a.title.localeCompare(b.title);
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [songs, searchQuery, sortOrder]);

    const handlePlaySong = React.useCallback((song: Song) => {
        const index = filteredSongs.findIndex(s => s.id === song.id);
        if (index !== -1) {
            playSongInPlaylist(filteredSongs, index, "All Songs");
            navigation.navigate('Player', { trackIndex: index });
        }
    }, [filteredSongs, playSongInPlaylist, navigation]);


    const onOpenOptions = React.useCallback((item: Song) => {
        setSelectedSong(item);
        setOptionsModalVisible(true);
    }, []);

    const scrollToLetter = (letter: string) => {
        const index = filteredSongs.findIndex(song =>
            song.title.toUpperCase().localeCompare(letter) >= 0
        );
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: true });
        }
    };

    const renderSong = React.useCallback(({ item, index }: { item: Song; index: number }) => (
        <SongItem
            item={item}
            index={index}
            isCurrent={currentSong?.id === item.id}
            theme={theme}
            onPress={(song) => {
                if (isSelectionMode) toggleSelection(song.id);
                else handlePlaySong(song);
            }}
            onLongPress={(song) => {
                if (!isSelectionMode) {
                    setIsSelectionMode(true);
                    setSelectedSongIds(new Set([song.id]));
                } else {
                    toggleSelection(song.id);
                }
            }}
            isSelectionMode={isSelectionMode}
            isSelected={selectedSongIds.has(item.id)}
            onOpenOptions={onOpenOptions}
        />
    ), [theme, handlePlaySong, onOpenOptions, currentSong?.id, isSelectionMode, selectedSongIds]);

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

    const content = (
        <>
            {/* Header */}
            {!isEmbedded && (
                <View style={styles.header}>
                    {isSelectionMode ? (
                        <>
                            <TouchableOpacity onPress={cancelSelection} style={styles.backButton}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>{selectedSongIds.size} Selected</Text>
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
                            <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>All Songs</Text>
                            <View style={{ width: 40 }} />
                        </>
                    )}
                </View>
            )}

            {/* Search Bar & Sort */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 10 }}>
                <View style={[styles.searchContainer, { backgroundColor: theme.card, flex: 1, marginRight: 10, marginHorizontal: 0, marginVertical: 0 }]}>
                    <Ionicons name="search" size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search songs..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity
                    onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    style={styles.sortButton}
                >
                    <Ionicons
                        name="swap-vertical"
                        size={18}
                        color={theme.primary}
                    />
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
                    <Ionicons name="play" size={16} color={theme.textOnPrimary} />
                    <Text style={[styles.actionButtonText, { color: theme.textOnPrimary }]}>Play All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.primary, borderWidth: 1.5 }]}
                    onPress={() => {
                        if (filteredSongs.length > 0) {
                            const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
                            playSongInPlaylist(shuffled, 0, "Shuffle Play");
                            navigation.navigate('Player', { trackIndex: 0 });
                        }
                    }}
                >
                    <Ionicons name="shuffle" size={16} color={theme.primary} />
                    <Text style={[styles.actionButtonText, { color: theme.text }]}>Shuffle</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading Songs...</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <FlashListAny
                        ref={flatListRef}
                        data={filteredSongs}
                        keyExtractor={(item) => item.id}
                        renderItem={renderSong}
                        extraData={[handlePlaySong, isSelectionMode, selectedSongIds]}
                        estimatedItemSize={70}
                        getItemType={() => 'song'}
                        contentContainerStyle={styles.listContent}
                        drawDistance={500}
                        removeClippedSubviews={true}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Text style={{ color: theme.textSecondary }}>No songs found.</Text>
                            </View>
                        }
                        showsVerticalScrollIndicator={false}
                    />

                    {/* Alphabet Filter */}
                    <View style={styles.alphabetContainer}>
                        {alphabet.map((letter) => (
                            <TouchableOpacity
                                key={letter}
                                onPress={() => scrollToLetter(letter)}
                                style={styles.alphabetItem}
                            >
                                <Text style={[styles.alphabetText, { color: theme.primary }]}>{letter}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

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
    alphabetContainer: {
        position: 'absolute',
        right: 2,
        top: 60,
        bottom: 120,
        justifyContent: 'center',
        alignItems: 'center',
        width: 20,
        backgroundColor: 'transparent',
    },
    alphabetItem: {
        paddingVertical: 2,
        width: 20,
        alignItems: 'center',
    },
    alphabetText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    sortButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingLeft: 20,
        paddingRight: 35, // Extra space to avoid alphabet sidebar
        marginBottom: 15,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 38,
        borderRadius: 19, // Pill shape
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 6,
    }
});
