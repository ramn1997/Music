import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTheme } from '../hooks/ThemeContext';
import { useLibraryStore } from '../store/useLibraryStore';
import { MusicImage } from '../components/MusicImage';
import { PlayingIndicator } from '../components/PlayingIndicator';
import { ScreenContainer } from '../components/ScreenContainer';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { SongOptionsMenu } from '../components/SongOptionsMenu';
import { EditSongModal } from '../components/EditSongModal';
import { Song } from '../hooks/MusicLibraryContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Queue'>;

export const QueueScreen = ({ navigation }: Props) => {
    const currentSong = usePlayerStore(state => state.currentTrack);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const playlist = usePlayerStore(state => state.playlist);
    const currentIndex = usePlayerStore(state => state.currentIndex);
    const playSongInPlaylist = usePlayerStore(state => state.playSongInPlaylist);
    const moveTrack = usePlayerStore(state => state.moveTrack);
    const playlistName = usePlayerStore(state => state.playlistName);
    const isShuffleOn = usePlayerStore(state => state.isShuffleOn);
    const toggleShuffle = usePlayerStore(state => state.toggleShuffle);
    const removeFromQueue = usePlayerStore(state => state.removeFromQueue);

    const { theme } = useTheme();
    const updateSongMetadata = useLibraryStore(state => state.updateSongMetadata);

    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [selectedQueueItem, setSelectedQueueItem] = useState<{ song: Song, index: number } | null>(null);
    const [queueOptionsVisible, setQueueOptionsVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [activeModalSong, setActiveModalSong] = useState<Song | null>(null);

    const listRef = useRef<any>(null);

    const scrollToCurrent = useCallback(() => {
        if (currentIndex === -1 || playlist.length === 0 || !listRef.current) return;

        const timer = setTimeout(() => {
            try {
                if (listRef.current && currentIndex >= 0 && currentIndex < playlist.length) {
                    listRef.current.scrollToOffset({
                        offset: Math.max(0, currentIndex * 68 - 200),
                        animated: true
                    });
                }
            } catch (err) {
                console.log('[QueueScreen] Scroll failed', err);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [currentIndex, playlist.length]);

    useFocusEffect(
        useCallback(() => {
            const cleanUp = scrollToCurrent();
            return () => {
                if (typeof cleanUp === 'function') cleanUp();
            };
        }, [scrollToCurrent])
    );

    const handleAddQueueToPlaylist = () => {
        setPlaylistModalVisible(true);
    };

    const renderItem = useCallback(({ item, getIndex, drag, isActive }: RenderItemParams<Song>) => {
        const index = getIndex();
        const isCurrent = index === currentIndex;
        return (
            <ScaleDecorator>
                <TouchableOpacity
                    onLongPress={drag}
                    disabled={isActive}
                    activeOpacity={1}
                    style={[
                        styles.queueItem,
                        isCurrent && { backgroundColor: theme.primary + '15' },
                        isActive && {
                            backgroundColor: theme.card,
                            elevation: 8,
                            zIndex: 100,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4.65,
                            transform: [{ scale: 1.02 }]
                        }
                    ]}
                >
                    <View style={styles.dragHandle} onTouchStart={drag}>
                        <Ionicons name="reorder-two-outline" size={24} color={theme.textSecondary + '60'} />
                    </View>

                    <TouchableOpacity
                        style={styles.itemMain}
                        onPress={() => playSongInPlaylist(playlist, index!, playlistName)}
                    >
                        <View style={styles.artworkContainer}>
                            <MusicImage
                                uri={item.coverImage}
                                id={item.id}
                                style={styles.artwork}
                                iconSize={20}
                            />
                            {isCurrent && isPlaying && (
                                <View style={styles.playingOverlay}>
                                    <PlayingIndicator color="white" size={14} isPlaying={true} />
                                </View>
                            )}
                        </View>
                        <View style={styles.info}>
                            <Text style={[styles.title, { color: isCurrent ? theme.primary : theme.text }]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text style={[styles.artist, { color: theme.textSecondary }]} numberOfLines={1}>
                                {item.artist}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionsButton}
                        onPress={() => {
                            setSelectedQueueItem({ song: item, index: index! });
                            setQueueOptionsVisible(true);
                        }}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    }, [currentIndex, isPlaying, theme, playlist, playlistName, playSongInPlaylist]);

    return (
        <ScreenContainer variant="default">
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Queue</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={toggleShuffle} style={styles.headerActionBtn}>
                            <Ionicons name="shuffle" size={24} color={isShuffleOn ? theme.primary : theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleAddQueueToPlaylist} style={styles.headerActionBtn}>
                            <Ionicons name="add-circle-outline" size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <DraggableFlatList
                    ref={listRef}
                    data={playlist}
                    onDragEnd={({ from, to }) => moveTrack(from, to)}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    getItemLayout={(data, index) => ({
                        length: 68,
                        offset: 68 * index,
                        index
                    })}
                />

                <SongOptionsMenu
                    visible={queueOptionsVisible}
                    onClose={() => setQueueOptionsVisible(false)}
                    song={selectedQueueItem?.song || null}
                    onRequestPlaylistAdd={() => { setActiveModalSong(selectedQueueItem?.song || null); setQueueOptionsVisible(false); setTimeout(() => setPlaylistModalVisible(true), 100); }}
                    onRemoveFromQueue={() => { if (selectedQueueItem) removeFromQueue(selectedQueueItem.index); }}
                    onEditDetails={() => { setActiveModalSong(selectedQueueItem?.song || null); setQueueOptionsVisible(false); setTimeout(() => setEditModalVisible(true), 100); }}
                />

                <EditSongModal
                    visible={editModalVisible}
                    onClose={() => setEditModalVisible(false)}
                    song={activeModalSong}
                    onSave={updateSongMetadata}
                />

                <AddToPlaylistModal
                    visible={playlistModalVisible}
                    onClose={() => setPlaylistModalVisible(false)}
                    songs={activeModalSong ? [activeModalSong] : playlist}
                />
            </SafeAreaView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        justifyContent: 'space-between',
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerActionBtn: { padding: 10 },
    listContent: { paddingHorizontal: 15, paddingBottom: 40 },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        paddingHorizontal: 10,
        marginBottom: 5,
    },
    dragHandle: {
        paddingRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    artworkContainer: { position: 'relative' },
    artwork: { width: 48, height: 48, borderRadius: 8 },
    playingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    info: { flex: 1, marginLeft: 12 },
    title: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' },
    artist: { fontSize: 14, marginTop: 2, fontFamily: 'PlusJakartaSans_400Regular' },
    optionsButton: { padding: 10 },
});
