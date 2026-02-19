import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Dimensions, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { Song } from '../hooks/useLocalMusic';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddToPlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    songs: Song[];
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
    visible,
    onClose,
    songs
}) => {
    const { theme } = useTheme();
    const { playlists, addToPlaylist, createPlaylist } = useMusicLibrary();
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const handleAddToPlaylist = async (playlistId: string) => {
        if (songs.length > 0) {
            await addToPlaylist(playlistId, songs);
            onClose();
        }
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        await createPlaylist(newPlaylistName, songs);
        setNewPlaylistName('');
        setIsCreating(false);
        onClose();
    };

    if (songs.length === 0) return null;

    const filteredPlaylists = playlists.filter(p => !p.isSpecial && p.id !== 'liked');

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={[styles.container, { backgroundColor: theme.background }]}>
                        <View style={styles.handleBarContainer}>
                            <View style={[styles.handleBar, { backgroundColor: theme.cardBorder }]} />
                        </View>

                        <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
                            <Text style={[styles.title, { color: theme.text }]}>Add to Playlist</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.songCard}>
                            <Ionicons name="musical-notes" size={20} color={theme.primary} />
                            <Text style={[styles.songTitle, { color: theme.textSecondary }]} numberOfLines={1}>
                                {songs.length === 1 ? songs[0].title : `${songs.length} songs selected`}
                            </Text>
                        </View>

                        {isCreating ? (
                            <View style={{ padding: 20 }}>
                                <Text style={{ color: theme.text, marginBottom: 10 }}>Playlist Name</Text>
                                <TextInput
                                    style={{
                                        backgroundColor: theme.card,
                                        color: theme.text,
                                        padding: 12,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: theme.cardBorder,
                                        marginBottom: 20
                                    }}
                                    value={newPlaylistName}
                                    onChangeText={setNewPlaylistName}
                                    placeholder="My Playlist"
                                    placeholderTextColor={theme.textSecondary}
                                    autoFocus
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                                    <TouchableOpacity
                                        onPress={() => setIsCreating(false)}
                                        style={{ padding: 10 }}
                                    >
                                        <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCreatePlaylist}
                                        style={{ backgroundColor: theme.primary, padding: 10, borderRadius: 8 }}
                                    >
                                        <Text style={{ color: theme.background, fontWeight: 'bold' }}>Create</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (

                            <FlatList
                                data={filteredPlaylists}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.listContent}
                                ListHeaderComponent={() => (
                                    <TouchableOpacity
                                        style={[styles.playlistItem, { borderBottomColor: theme.cardBorder }]}
                                        onPress={() => setIsCreating(true)}
                                    >
                                        <View style={[styles.playlistIcon, { backgroundColor: theme.card, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.textSecondary }]}>
                                            <Ionicons name="add" size={24} color={theme.text} />
                                        </View>
                                        <View style={styles.playlistInfo}>
                                            <Text style={[styles.playlistName, { color: theme.text }]}>Create New Playlist</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="add-circle-outline" size={60} color={theme.cardBorder} />
                                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                            No playlists found. Create one above!
                                        </Text>
                                    </View>
                                )}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.playlistItem, { borderBottomColor: theme.cardBorder }]}
                                        onPress={() => handleAddToPlaylist(item.id)}
                                    >
                                        <View style={[styles.playlistIcon, { backgroundColor: theme.card }]}>
                                            <Ionicons name="list" size={22} color={theme.primary} />
                                        </View>
                                        <View style={styles.playlistInfo}>
                                            <Text style={[styles.playlistName, { color: theme.text }]}>{item.name}</Text>
                                            <Text style={[styles.songCount, { color: theme.textSecondary }]}>
                                                {item.songs.length} songs
                                            </Text>
                                        </View>
                                        <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
                                    </TouchableOpacity>
                                )}
                            />
                        )}

                    </View>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </Modal >
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        maxHeight: SCREEN_HEIGHT * 0.7,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 40, // Increased padding to avoid system navigation
    },
    handleBarContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    handleBar: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    songCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        marginVertical: 15,
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        gap: 10,
    },
    songTitle: {
        fontSize: 14,
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    playlistIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    playlistInfo: {
        flex: 1,
    },
    playlistName: {
        fontSize: 16,
        fontWeight: '600',
    },
    songCount: {
        fontSize: 12,
        marginTop: 2,
    },
    emptyState: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 15,
        fontSize: 14,
    },
});
