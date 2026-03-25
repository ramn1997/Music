import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, FlatList } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAnimatedFlashList } from '../components/SafeAnimatedFlashList';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/ThemeContext';
import { useLibraryStore } from '../store/useLibraryStore';
import { MusicImage } from '../components/MusicImage';
import { MarqueeText } from '../components/MarqueeText';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { PlaylistCollage } from '../components/PlaylistCollage';

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

const CardDesign = () => null;


export const PlaylistsScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme } = useTheme();
    const likedSongs = useLibraryStore(state => state.likedSongs);
    const userPlaylists = useLibraryStore(state => state.playlists);
    const createPlaylist = useLibraryStore(state => state.createPlaylist);
    const deletePlaylist = useLibraryStore(state => state.deletePlaylist);

    const [modalVisible, setModalVisible] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [playlistToDelete, setPlaylistToDelete] = useState<any | null>(null);
    const [isNavigated, setIsNavigated] = useState(false);

    React.useEffect(() => {
        const interaction = require('react-native').InteractionManager.runAfterInteractions(() => {
            setIsNavigated(true);
        });
        return () => interaction.cancel();
    }, []);

    const displayPlaylists = React.useMemo(() => {
        if (!isNavigated) return [];
        return [
            {
                id: 'liked',
                name: 'Liked Songs',
                count: likedSongs.length,
                isSpecial: true,
                coverImage: likedSongs[0]?.coverImage,
                assetUri: likedSongs[0]?.uri,
                songs: likedSongs
            },
            ...userPlaylists.map(p => ({
                id: p.id,
                name: p.name,
                count: p.songs.length,
                isSpecial: false,
                coverImage: p.songs[0]?.coverImage,
                assetUri: p.songs[0]?.uri,
                songs: p.songs
            }))
        ];
    }, [likedSongs, userPlaylists, isNavigated]);



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

    const { width, height } = require('react-native').useWindowDimensions();
    const isLandscape = width > height;
    const numColumns = isLandscape ? 4 : 2;
    const containerWidth = isLandscape ? width - 180 : width;
    const itemWidth = (containerWidth - 30 - (16 * (numColumns - 1))) / numColumns;

    const renderItem = React.useCallback(({ item }: { item: any }) => {
        return (
            <View style={{ flex: 1, paddingHorizontal: 10, marginBottom: 28 }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'playlist' })}
                    onLongPress={() => confirmDelete(item)}
                    delayLongPress={500}
                    style={{
                        backgroundColor: theme.card,
                        borderRadius: 24,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: theme.cardBorder,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 5,
                    }}
                >
                    <View style={{
                        width: '100%',
                        aspectRatio: 1,
                        borderRadius: 18,
                        overflow: 'hidden',
                        marginBottom: 14,
                        backgroundColor: 'rgba(0,0,0,0.1)',
                    }}>
                        <PlaylistCollage
                            songs={item.songs}
                            size={itemWidth - 20}
                            width={itemWidth - 20}
                            iconSize={32}
                            showIcon={false}
                            iconName={item.id === 'liked' ? "heart" : "musical-notes"}
                            gradientColors={getGradientColors(item.id)}
                            showBubbles={false}
                            borderRadius={12}
                            opacity={0.9}
                            overlayColor="rgba(0,0,0,0.15)"
                        />
                    </View>

                    <View style={{ paddingHorizontal: 4, paddingBottom: 6 }}>
                        <Text
                            numberOfLines={1}
                            style={{
                                color: theme.text,
                                fontSize: 16,
                                fontFamily: 'PlusJakartaSans_800ExtraBold',
                                textAlign: 'left',
                                letterSpacing: -0.3
                            }}
                        >
                            {item.name}
                        </Text>
                        <Text style={{
                            color: theme.textSecondary,
                            fontSize: 12,
                            marginTop: 2,
                            fontFamily: 'PlusJakartaSans_600SemiBold',
                            opacity: 0.6
                        }}>
                            {item.count} {item.count === 1 ? 'song' : 'songs'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    }, [theme, navigation, confirmDelete, itemWidth]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            // Bypass JS bridge tracking for smooth scrolling
        },
    });

    return (
        <ScreenContainer variant="default">
            <View style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Playlists</Text>
                    <TouchableOpacity
                        onPress={() => setModalVisible(true)}
                        style={[styles.createHeaderButton, { backgroundColor: theme.primary }]}
                    >
                        <Ionicons name="add" size={16} color={theme.textOnPrimary} />
                        <Text style={{ color: theme.textOnPrimary, fontWeight: 'bold', marginLeft: 4, fontSize: 13 }}>New Playlist</Text>
                    </TouchableOpacity>
                </View>

                <SafeAnimatedFlashList
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    data={displayPlaylists}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderItem}
                    key={numColumns} // Force remount on column change
                    numColumns={numColumns}
                    estimatedItemSize={220}
                    drawDistance={250}
                    contentContainerStyle={styles.listContent}
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
                    <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                        <View style={[styles.modalContent, { backgroundColor: theme.menuBackground, borderColor: theme.cardBorder }]}>
                            <TouchableOpacity
                                style={styles.headerCloseButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>

                            <Text style={[styles.modalTitle, { color: theme.text }]}>New Playlist</Text>

                            <View style={[styles.createCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1 }]}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Playlist Name</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Summer Hits 2026"
                                    placeholderTextColor={theme.textSecondary + '80'}
                                    value={newPlaylistName}
                                    onChangeText={setNewPlaylistName}
                                    autoFocus
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: theme.primary }]}
                                    onPress={handleAddPlaylist}
                                >
                                    <Text style={[styles.modalButtonText, { color: theme.textOnPrimary }]}>Create Playlist</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    visible={deleteModalVisible}
                    title="Delete Playlist"
                    message={`Are you sure you want to delete "${playlistToDelete?.name}"? This action cannot be undone.`}
                    onConfirm={handleDeletePlaylist}
                    onCancel={() => setDeleteModalVisible(false)}
                    confirmText="Delete"
                    isDestructive={true}
                />
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
    createHeaderButton: {
        flexDirection: 'row',
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_700Bold',
        flex: 1,
        letterSpacing: -1,
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
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 36,
        padding: 24,
        borderWidth: 1,
        position: 'relative',
    },
    headerCloseButton: {
        position: 'absolute',
        right: 16,
        top: 16,
        zIndex: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 24,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    createCard: {
        borderRadius: 20,
        padding: 18,
        marginBottom: 24,
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
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    modalButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
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
