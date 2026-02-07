import React, { useState, useEffect } from 'react';
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
import { LyricsModal } from '../components/LyricsModal';
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
    const [lyricsModalVisible, setLyricsModalVisible] = useState(false);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    useEffect(() => {
        fetchMusic();
    }, [fetchMusic]);

    const filteredSongs = songs.filter(s =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.artist.toLowerCase().includes(query.toLowerCase()) ||
        (s.album && s.album.toLowerCase().includes(query.toLowerCase()))
    );

    const handlePlaySong = React.useCallback((index: number) => {
        playSongInPlaylist(filteredSongs, index, "Search Results");
        navigation.navigate('Player', { trackIndex: index });
    }, [filteredSongs, playSongInPlaylist, navigation]);


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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
                data={query ? filteredSongs : []}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ListFooterComponent={<View style={{ height: 100 }} />}
                ListEmptyComponent={
                    query ? (
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No results found.</Text>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="musical-notes-outline" size={80} color={theme.textSecondary + '40'} />
                            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Find your favorite music</Text>
                        </View>
                    )
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
                onShowLyrics={() => {
                    setOptionsModalVisible(false);
                    setTimeout(() => setLyricsModalVisible(true), 100);
                }}
            />

            <EditSongModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                song={selectedSong}
                onSave={updateSongMetadata}
            />

            <LyricsModal
                visible={lyricsModalVisible}
                onClose={() => setLyricsModalVisible(false)}
                song={selectedSong}
            />
            <AddToPlaylistModal
                visible={playlistModalVisible}
                onClose={() => setPlaylistModalVisible(false)}
                song={selectedSong}
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
    emptyState: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center'
    }
});
