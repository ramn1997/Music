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
                    <View style={[styles.container, { backgroundColor: theme.card }]}>
                        <View style={styles.handleBarContainer}>
                            <View style={[styles.handleBar, { backgroundColor: theme.textSecondary, opacity: 0.2 }]} />
                        </View>

                        <View style={styles.header}>
                            <Text style={[styles.title, { color: theme.text }]}>Add to Playlist</Text>
                            <TouchableOpacity onPress={onClose} style={styles.headerCloseButton}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.songCard}>
                            <View style={[styles.songCardIcon, { backgroundColor: theme.primary + '15' }]}>
                                <Ionicons name="musical-notes" size={18} color={theme.primary} />
                            </View>
                            <Text style={[styles.songTitle, { color: theme.textSecondary }]} numberOfLines={1}>
                                {songs.length === 1 ? songs[0].title : `${songs.length} songs selected`}
                            </Text>
                        </View>

                        {isCreating ? (
                            <View style={styles.createContainer}>
                                <View style={styles.createCard}>
                                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Playlist Name</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text }]}
                                        value={newPlaylistName}
                                        onChangeText={setNewPlaylistName}
                                        placeholder="My Favorite Tracks"
                                        placeholderTextColor={theme.textSecondary + '60'}
                                        autoFocus
                                    />
                                </View>
                                <View style={styles.createActions}>
                                    <TouchableOpacity
                                        onPress={() => setIsCreating(false)}
                                        style={styles.cancelButton}
                                    >
                                        <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCreatePlaylist}
                                        style={[styles.createBtn, { backgroundColor: theme.primary }]}
                                    >
                                        <Text style={[styles.createBtnText, { color: '#fff' }]}>Create Playlist</Text>
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
                                        style={styles.playlistItem}
                                        onPress={() => setIsCreating(true)}
                                    >
                                        <View style={[styles.playlistIcon, { backgroundColor: theme.primary + '10' }]}>
                                            <Ionicons name="add" size={26} color={theme.primary} />
                                        </View>
                                        <View style={styles.playlistInfo}>
                                            <Text style={[styles.playlistName, { color: theme.primary, fontFamily: 'PlusJakartaSans_700Bold' }]}>Create New Playlist</Text>
                                            <Text style={[styles.songCount, { color: theme.textSecondary }]}>Create a fresh collection</Text>
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
                                        style={styles.playlistItem}
                                        onPress={() => handleAddToPlaylist(item.id)}
                                    >
                                        <View style={[styles.playlistIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                            <Ionicons name="musical-note" size={22} color={theme.text} />
                                        </View>
                                        <View style={styles.playlistInfo}>
                                            <Text style={[styles.playlistName, { color: theme.text }]}>{item.name}</Text>
                                            <Text style={[styles.songCount, { color: theme.textSecondary }]}>
                                                {item.songs.length} {item.songs.length === 1 ? 'song' : 'songs'}
                                            </Text>
                                        </View>
                                        <Ionicons name="add-circle-outline" size={24} color={theme.textSecondary} />
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
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    container: {
        maxHeight: SCREEN_HEIGHT * 0.8,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    handleBarContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 12,
    },
    handleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingBottom: 15,
        position: 'relative',
    },
    title: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    headerCloseButton: {
        position: 'absolute',
        right: 16,
        top: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    songCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginVertical: 10,
        padding: 14,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        gap: 12,
    },
    songCardIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    songTitle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    playlistIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    playlistInfo: {
        flex: 1,
    },
    playlistName: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    songCount: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginTop: 2,
        opacity: 0.6,
    },
    createContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    createCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 20,
        padding: 18,
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.5,
    },
    input: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        paddingVertical: 0,
    },
    createActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    cancelButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    cancelText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    createBtn: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        minWidth: 140,
        alignItems: 'center',
    },
    createBtnText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
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
        fontFamily: 'PlusJakartaSans_400Regular',
    },
});
