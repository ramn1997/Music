import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalMusic, Song } from '../hooks/useLocalMusic';
import { ScreenContainer } from '../components/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/ThemeContext';

import { usePlayerContext } from '../hooks/PlayerContext';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { SongItem } from '../components/SongItem';
import { SongOptionsMenu } from '../components/SongOptionsMenu';
import { EditSongModal } from '../components/EditSongModal';

import { AddToPlaylistModal } from '../components/AddToPlaylistModal';

export const SearchScreen = () => {
    const [query, setQuery] = useState('');
    const { songs, fetchMusic } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme } = useTheme();
    const { playSongInPlaylist, currentSong } = usePlayerContext();
    const { playlists, addToPlaylist, updateSongMetadata } = useMusicLibrary();

    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);

    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [recentSearches, setRecentSearches] = useState<Song[]>([]);

    useEffect(() => {
        loadRecentSearches();
    }, []);

    const loadRecentSearches = async () => {
        try {
            const saved = await AsyncStorage.getItem('recentSearches');
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load recent searches');
        }
    };

    const saveSearch = async (song: Song) => {
        try {
            const updated = [song, ...recentSearches.filter(s => s.id !== song.id)].slice(0, 10);
            setRecentSearches(updated);
            await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save search');
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

    const removeRecentSearch = async (songId: string) => {
        try {
            const updated = recentSearches.filter(s => s.id !== songId);
            setRecentSearches(updated);
            await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to remove search');
        }
    };

    useEffect(() => {
        fetchMusic();
    }, [fetchMusic]);

    const trimmedQuery = query.trim().toLowerCase();
    const filteredSongs = trimmedQuery
        ? songs.filter(s => {
            const title = (s.title ?? '').toLowerCase();
            const artist = (s.artist ?? '').toLowerCase();
            const album = (s.album ?? '').toLowerCase();
            return (
                title.includes(trimmedQuery) ||
                artist.includes(trimmedQuery) ||
                album.includes(trimmedQuery)
            );
        })
        : [];

    const handlePlaySong = React.useCallback((song: Song) => {
        saveSearch(song);
        // If searching, find in filtered list. If clicking recent, find in all songs or just play it as single
        const contextList = query ? filteredSongs : [song];
        const index = query ? filteredSongs.findIndex(s => s.id === song.id) : 0;

        if (index !== -1) {
            playSongInPlaylist(contextList, index, query ? "Search Results" : "Recent Search");
            navigation.navigate('Player', { trackIndex: index });
        } else if (!query) {
            // Fallback for recent item if not in current filter context (shouldn't happen with logic above but for safety)
            playSongInPlaylist([song], 0, "Recent Search");
            navigation.navigate('Player');
        }
    }, [filteredSongs, playSongInPlaylist, navigation, query]);


    const onOpenOptions = React.useCallback((item: Song) => {
        setSelectedSong(item);
        setOptionsModalVisible(true);
    }, []);

    const renderItem = ({ item, index }: { item: Song, index: number }) => (
        <SongItem
            item={item}
            index={index}
            isCurrent={currentSong?.id === item.id}
            theme={theme}
            onPress={handlePlaySong}
            onOpenOptions={onOpenOptions}
        />
    );

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Search</Text>
            </View>

            <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
                <Ionicons name="search" size={18} color={theme.textSecondary} />
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Artists, Songs, or Albums"
                    placeholderTextColor={theme.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')}>
                        <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={query ? filteredSongs : recentSearches}
                keyExtractor={item => item.id}
                renderItem={({ item, index }) => (
                    query ? (
                        renderItem({ item, index })
                    ) : (
                        <View style={styles.recentItemContainer}>
                            <View style={{ flex: 1 }}>
                                <SongItem
                                    item={item}
                                    index={index}
                                    isCurrent={false}
                                    theme={theme}
                                    onPress={() => handlePlaySong(item)}
                                    onOpenOptions={onOpenOptions}
                                />
                            </View>
                            <TouchableOpacity onPress={() => removeRecentSearch(item.id)} style={styles.removeButton}>
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )
                )}
                ListHeaderComponent={
                    !query && recentSearches.length > 0 ? (
                        <View style={styles.recentHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Searches</Text>
                            <TouchableOpacity onPress={clearRecentSearches}>
                                <Text style={[styles.clearText, { color: theme.primary }]}>Clear All</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
                ListFooterComponent={<View style={{ height: 100 }} />}
                ListEmptyComponent={
                    !query && recentSearches.length === 0 ? (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="search" size={80} color={theme.textSecondary + '40'} />
                            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Search for songs, artists, or albums</Text>
                        </View>
                    ) : query && filteredSongs.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No results found.</Text>
                    ) : null
                }
            />

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
    container: { flex: 1 },
    safeArea: { flex: 1, paddingHorizontal: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 20,
    },
    backButton: {
        marginRight: 15,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    searchBar: {
        flexDirection: 'row',
        borderRadius: 25,
        paddingHorizontal: 15,
        alignItems: 'center',
        marginBottom: 20,
        marginHorizontal: 20,
        height: 50,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        height: '100%',
        paddingVertical: 0,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginRight: 15
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '500'
    },
    resultSubtitle: {
        fontSize: 14
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
        opacity: 0.7
    },
    placeholderText: {
        fontSize: 16,
        marginTop: 20
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
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
        marginTop: 10
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    clearText: {
        fontSize: 14,
        fontWeight: '600'
    },
    recentItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 15
    },
    removeButton: {
        padding: 10
    }
});
