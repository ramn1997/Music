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
import { LyricsModal } from '../components/LyricsModal';
import { PlayingIndicator } from '../components/PlayingIndicator';
import { MarqueeText } from '../components/MarqueeText';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';


const FlashListAny = FlashList as any;

export const SongsScreen = () => {
    const { songs, loading } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { playSongInPlaylist, addToQueue, addNext, currentSong } = usePlayerContext();
    const { theme } = useTheme();
    const { playlists, addToPlaylist, updateSongMetadata } = useMusicLibrary();
    const [searchQuery, setSearchQuery] = useState('');
    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [lyricsModalVisible, setLyricsModalVisible] = useState(false);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const flatListRef = React.useRef<any>(null); // Using any for generic compatibility with FlashList scroll methods

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

    const handlePlaySong = React.useCallback((index: number) => {
        playSongInPlaylist(filteredSongs, index, "All Songs");
        navigation.navigate('Player', { trackIndex: index });
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
            onPress={handlePlaySong}
            onOpenOptions={onOpenOptions}
        />
    ), [theme, handlePlaySong, onOpenOptions, currentSong?.id]);

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

    return (
        <ScreenContainer variant="default">
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>All Songs</Text>
                <View style={{ width: 40 }} />
            </View>

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
                            setTimeout(() => setPlaylistModalVisible(true), 100);
                        }}
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
                </View>
            )}
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
        paddingBottom: 40,
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
        top: 20,
        bottom: 20,
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
    }
});
