import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/ThemeContext';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { MusicImage } from '../components/MusicImage';
import { MarqueeText } from '../components/MarqueeText';

const getGradientColors = (id: string): [string, string] => {
    switch (id) {
        case 'liked': return ['#881337', '#be123c']; // Deep Rose
        default: {
            // For user playlists, pick a color based on ID length or simple hash
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


export const PlaylistsScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme } = useTheme();
    const { likedSongs, playlists: userPlaylists, createPlaylist, deletePlaylist } = useMusicLibrary();

    const [modalVisible, setModalVisible] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [playlistToDelete, setPlaylistToDelete] = useState<any | null>(null);

    const displayPlaylists = [
        {
            id: 'create_action',
            name: 'Create New Playlist',
            isAction: true
        },
        {
            id: 'liked',
            name: 'Liked Songs',
            count: likedSongs.length,
            isSpecial: true,
            coverImage: likedSongs[0]?.coverImage,
            assetUri: likedSongs[0]?.uri
        },
        ...userPlaylists.map(p => ({
            id: p.id,
            name: p.name,
            count: p.songs.length,
            isSpecial: false,
            coverImage: p.songs[0]?.coverImage,
            assetUri: p.songs[0]?.uri
        }))
    ];



    const handleAddPlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        await createPlaylist(newPlaylistName.trim());
        setNewPlaylistName('');
        setModalVisible(false);
    };

    const confirmDelete = (playlist: any) => {
        if (playlist.id === 'liked') return;
        setPlaylistToDelete(playlist);
        setDeleteModalVisible(true);
    };

    const handleDeletePlaylist = async () => {
        if (playlistToDelete) {
            await deletePlaylist(playlistToDelete.id);
            setDeleteModalVisible(false);
            setPlaylistToDelete(null);
        }
    };

    const itemWidth = (require('react-native').Dimensions.get('window').width - 40 - 20) / 3;

    const renderItem = React.useCallback(({ item }: { item: any }) => {
        if (item.isAction) {
            return (
                <View style={{ width: itemWidth, marginBottom: 15 }}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setModalVisible(true)}
                    >
                        <View style={[
                            styles.cardContainer,
                            {
                                height: 95,
                                width: '100%',
                                borderRadius: 16,
                                overflow: 'hidden',
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderWidth: 1,
                                borderStyle: 'dashed',
                                borderColor: 'rgba(255,255,255,0.2)'
                            }
                        ]}>
                            <Ionicons name="add" size={30} color={theme.primary} />
                            <Text style={[styles.cardTitle, { color: theme.textSecondary, fontSize: 10, marginTop: 4 }]}>
                                {item.name}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View
                style={{
                    width: itemWidth,
                    marginBottom: 15,
                    alignItems: 'stretch'
                }}
            >
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: item.id === 'liked' ? 'playlist' : 'playlist' })}
                    onLongPress={() => confirmDelete(item)}
                    delayLongPress={500}
                >
                    <View style={[
                        styles.cardContainer,
                        {
                            height: 95, // Matching FavoritesScreen Grid3 height
                            width: '100%',
                            borderRadius: 16,
                            overflow: 'hidden',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: theme.card
                        }
                    ]}>
                        <>
                            <LinearGradient
                                colors={getGradientColors(item.id)}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <CardDesign />
                        </>

                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 5, zIndex: 10 }}>
                            <Ionicons
                                name={item.id === 'liked' ? "heart" : item.id === 'recently_played' ? "time" : "musical-notes"}
                                size={30}
                                color="white"
                                style={{ marginBottom: 5 }}
                            />


                            <Text
                                numberOfLines={2}
                                style={[
                                    styles.cardTitle
                                ]}
                            >
                                {item.name}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    }, [theme, navigation, confirmDelete, itemWidth]);

    return (
        <ScreenContainer variant="default">
            <View style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Playlists</Text>
                </View>

                <FlatList
                    data={displayPlaylists}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    numColumns={3}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.listContent}
                    style={{ flex: 1 }}
                    ListEmptyComponent={
                        <View style={{ padding: 50, alignItems: 'center' }}>
                            <Text style={{ color: theme.textSecondary }}>No playlists found</Text>
                        </View>
                    }
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
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>

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
            </View>
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        flex: 1
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    layoutButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center'
    },
    listContent: {
        paddingHorizontal: 15,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'flex-start',
        gap: 12,
        marginBottom: 15,
    },
    gridItem3: {
        flex: 1,
        maxWidth: '31%',
    },
    gridItem2: {
        flex: 1,
        maxWidth: '48%',
    },
    listItem: {
        width: '100%',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listIconPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden'
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 14,
    },
    card: {
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 20,
    },
    iconPlaceholder: {
        borderRadius: 30,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardContainer: {
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    cardTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3
    },
    playlistName: {
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
        padding: 20,
        paddingBottom: 100 // Shift modal up
    },
    modalContent: {
        width: '80%', // Reduced width
        maxWidth: 260,
        borderRadius: 20,
        padding: 15, // Further reduced padding
        borderWidth: 1,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10, // Further reduced margin
        textAlign: 'center'
    },
    input: {
        borderRadius: 12,
        padding: 8,
        fontSize: 14,
        borderWidth: 1,
        marginBottom: 10 // Further reduced margin
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end', // Move to right
    },
    modalButton: {
        width: '30%', // Smaller width
        padding: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    deleteOption: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        padding: 4,
        zIndex: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 5,
        zIndex: 10
    },
    createButtonPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
