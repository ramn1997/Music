import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/ThemeContext';

interface Playlist {
    id: string;
    name: string;
    count: number;
    isSpecial: boolean;
}

export const PlaylistsScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme } = useTheme();

    // Initial state only has Liked Songs
    const [playlists, setPlaylists] = useState<Playlist[]>([
        { id: 'liked', name: 'Liked Songs', count: 12, isSpecial: true }
    ]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);

    const handleAddPlaylist = () => {
        if (!newPlaylistName.trim()) return;

        const newPlaylist: Playlist = {
            id: Date.now().toString(),
            name: newPlaylistName.trim(),
            count: 0,
            isSpecial: false
        };

        setPlaylists([...playlists, newPlaylist]);
        setNewPlaylistName('');
        setModalVisible(false);
    };

    const confirmDelete = (playlist: Playlist) => {
        if (playlist.id === 'liked') return;
        setPlaylistToDelete(playlist);
        setDeleteModalVisible(true);
    };

    const handleDeletePlaylist = () => {
        if (playlistToDelete) {
            setPlaylists(prev => prev.filter(p => p.id !== playlistToDelete.id));
            setDeleteModalVisible(false);
            setPlaylistToDelete(null);
        }
    };

    const renderItem = ({ item }: { item: Playlist }) => (
        <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'playlist' })}
            onLongPress={() => confirmDelete(item)}
            delayLongPress={500}
        >
            <GlassCard style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                {!item.isSpecial && (
                    <TouchableOpacity
                        style={styles.deleteOption}
                        onPress={() => confirmDelete(item)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
                <View style={[styles.iconPlaceholder, { backgroundColor: 'transparent' }]}>
                    <Ionicons
                        name={item.id === 'liked' ? "thumbs-up-outline" : "musical-notes"}
                        size={48}
                        color={theme.primary}
                    />
                </View>
                <Text style={[styles.playlistName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.playlistCount, { color: theme.textSecondary }]}>{item.count} Songs</Text>
            </GlassCard>
        </TouchableOpacity>
    );

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Playlists</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <Ionicons name="add-circle" size={32} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={playlists}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
            />

            {/* Create Playlist Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>New Playlist</Text>

                        <TextInput
                            style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                            placeholder="Playlist Name"
                            placeholderTextColor={theme.textSecondary}
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.card }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={{ color: theme.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#18181b' }]}
                                onPress={handleAddPlaylist}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={deleteModalVisible}
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Delete Playlist</Text>
                        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                            Are you sure you want to delete "{playlistToDelete?.name}"?
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.card }]}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={{ color: theme.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#ef4444' }]}
                                onPress={handleDeletePlaylist}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 20,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    listContent: {
        paddingHorizontal: 15, // Gap handling for grid
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between', // Changed from gap to space-between for better 2-col layout
        marginBottom: 15,
    },
    gridItem: {
        width: '48%', // Almost half
    },
    card: {
        padding: 15,
        alignItems: 'center',
        height: 160,
        justifyContent: 'center',
        borderWidth: 1,
    },
    iconPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    playlistName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
        textAlign: 'center'
    },
    playlistCount: {
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center'
    },
    input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        marginBottom: 20
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    deleteOption: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        padding: 4,
        zIndex: 10,
    }
});
