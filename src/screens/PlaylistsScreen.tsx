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
    const [layoutMode, setLayoutMode] = useState<'grid2' | 'grid3' | 'list'>('grid3');

    const [modalVisible, setModalVisible] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [playlistToDelete, setPlaylistToDelete] = useState<any | null>(null);

    const displayPlaylists = [
        {
            id: 'liked',
            name: 'Liked Songs',
            count: likedSongs.length,
            isSpecial: true,
            coverImage: likedSongs[0]?.coverImage
        },
        ...userPlaylists.map(p => ({
            id: p.id,
            name: p.name,
            count: p.songs.length,
            isSpecial: false,
            coverImage: p.songs[0]?.coverImage
        }))
    ];

    const toggleLayout = () => {
        if (layoutMode === 'grid3') setLayoutMode('grid2');
        else if (layoutMode === 'grid2') setLayoutMode('list');
        else setLayoutMode('grid3');
    };

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

    const renderItem = React.useCallback(({ item }: { item: any }) => {
        if (layoutMode === 'list') {
            return (
                <TouchableOpacity
                    style={styles.listItem}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'playlist' })}
                    onLongPress={() => confirmDelete(item)}
                >
                    <View style={styles.row}>
                        <View style={[styles.listIconPlaceholder, { backgroundColor: 'transparent' }]}>
                            <LinearGradient
                                colors={getGradientColors(item.id)}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <Ionicons name={item.id === 'liked' ? "heart" : "musical-notes"} size={20} color="white" />
                        </View>
                        <View style={styles.info}>
                            <Text style={[styles.title, { color: theme.text, textAlign: 'left' }]} numberOfLines={1}>{item.name}</Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'left' }]} numberOfLines={1}>{item.count} Songs</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>
            );
        }

        const isGrid3 = layoutMode === 'grid3';
        return (
            <TouchableOpacity
                style={isGrid3 ? styles.gridItem3 : styles.gridItem2}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'playlist' })}
                onLongPress={() => confirmDelete(item)}
                delayLongPress={500}
            >
                <View style={[
                    styles.card,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder, overflow: 'hidden' },
                    { height: isGrid3 ? 140 : 180 }
                ]}>
                    <LinearGradient
                        colors={getGradientColors(item.id)}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <CardDesign />

                    <View style={[
                        styles.iconPlaceholder,
                        {
                            backgroundColor: 'transparent',
                            width: isGrid3 ? 70 : 100,
                            height: isGrid3 ? 70 : 100,
                            borderRadius: isGrid3 ? 35 : 50,
                            overflow: 'hidden',
                            borderWidth: 2,
                            borderColor: 'rgba(255,255,255,0.3)',
                            marginBottom: 8
                        }
                    ]}>
                        {item.coverImage ? (
                            <MusicImage
                                uri={item.coverImage}
                                id={item.id}
                                style={StyleSheet.absoluteFill}
                                iconSize={isGrid3 ? 24 : 36}
                            />
                        ) : (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons
                                    name={item.id === 'liked' ? "heart" : "musical-notes"}
                                    size={isGrid3 ? 32 : 48}
                                    color="white"
                                />
                            </View>
                        )}
                    </View>
                    <MarqueeText
                        text={item.name}
                        style={[styles.playlistName, { color: 'white', fontSize: isGrid3 ? 12 : 16, paddingHorizontal: 5 }]}
                    />
                    <Text style={[styles.playlistCount, { color: 'rgba(255,255,255,0.8)', fontSize: isGrid3 ? 10 : 12 }]}>
                        {item.count} Songs
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }, [theme, navigation, confirmDelete, layoutMode]);

    return (
        <ScreenContainer variant="default">
            <View style={{ flex: 1 }}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Playlists</Text>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={toggleLayout} style={styles.layoutButton}>
                            <Ionicons
                                name={layoutMode === 'grid3' ? "grid" : (layoutMode === 'grid2' ? "apps" : "list")}
                                size={22}
                                color={theme.primary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalVisible(true)}>
                            <Ionicons name="add-circle" size={32} color={theme.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    key={layoutMode}
                    data={displayPlaylists}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    numColumns={layoutMode === 'grid3' ? 3 : (layoutMode === 'grid2' ? 2 : 1)}
                    columnWrapperStyle={layoutMode !== 'list' ? styles.columnWrapper : undefined}
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
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
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
    }
});
