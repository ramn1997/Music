import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Song } from '../hooks/useLocalMusic';
import { usePlayerContext } from '../hooks/PlayerContext';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { useTheme } from '../hooks/ThemeContext';
import { Image } from 'react-native';
import { MusicImage } from './MusicImage';

interface SongOptionsMenuProps {
    visible: boolean;
    onClose: () => void;
    song: Song | null;
    onRequestPlaylistAdd: () => void;
    onRemoveFromPlaylist?: () => void;
    onRemoveFromQueue?: () => void;
    onEditDetails?: () => void;
}

export const SongOptionsMenu: React.FC<SongOptionsMenuProps> = ({
    visible,
    onClose,
    song,
    onRequestPlaylistAdd,
    onRemoveFromPlaylist,
    onRemoveFromQueue,
    onEditDetails
}) => {
    const { theme } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { addToQueue, addNext } = usePlayerContext();
    const { toggleLike, isLiked } = useMusicLibrary();

    if (!song) return null;

    const isFav = isLiked(song.id);

    const handleAction = (action: () => void) => {
        action();
        onClose();
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this song: ${song.title} by ${song.artist}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const menuItems = [
        {
            icon: 'play-skip-forward-outline',
            label: 'Play Next',
            action: () => addNext(song)
        },
        {
            icon: 'add-circle-outline',
            label: 'Add to playlist',
            action: onRequestPlaylistAdd,
            hasSubmenu: true
        },
        ...(onRemoveFromQueue ? [{
            icon: 'trash-outline',
            label: 'Remove from queue',
            action: onRemoveFromQueue,
            color: '#ef4444'
        }] : []),
        ...(onRemoveFromPlaylist ? [{
            icon: 'trash-outline',
            label: 'Remove from playlist',
            action: onRemoveFromPlaylist
        }] : []),
        {
            icon: isFav ? 'heart' : 'heart-outline',
            label: isFav ? 'Remove from Liked Songs' : 'Add to Liked Songs',
            action: () => toggleLike(song),
            color: isFav ? '#ef4444' : theme.text
        },
        {
            icon: 'list-outline',
            label: 'Add to queue',
            action: () => addToQueue(song)
        },
        {
            icon: 'person-outline',
            label: 'Go to artist',
            action: () => navigation.navigate('Playlist', { id: song.artist, name: song.artist, type: 'artist' }),
        },
        {
            icon: 'disc-outline',
            label: 'Go to album',
            action: () => navigation.navigate('Playlist', { id: song.albumId || song.album || 'unknown', name: song.album || 'Unknown', type: 'album' })
        },

        ...(onEditDetails ? [{
            icon: 'create-outline',
            label: 'Edit Details',
            action: onEditDetails
        }] : []),
        {
            icon: 'share-outline',
            label: 'Share',
            action: handleShare,
        }
    ];

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: theme.textSecondary, opacity: 0.2 }]} />
                    </View>

                    {/* Header with Song Info */}
                    <View style={styles.header}>
                        <View style={styles.artWrapper}>
                            <MusicImage
                                uri={song.coverImage}
                                id={song.id}
                                style={styles.art}
                                iconSize={24}
                            />
                        </View>
                        <View style={styles.songMeta}>
                            <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>{song.title}</Text>
                            <Text style={[styles.songArtist, { color: theme.textSecondary }]} numberOfLines={1}>
                                {song.artist} • {song.album || 'Unknown Album'}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.textSecondary + '10' }]} />

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.menuItem}
                                onPress={() => handleAction(item.action)}
                            >
                                <Ionicons
                                    name={item.icon as any}
                                    size={24}
                                    color={item.color || theme.text}
                                    style={styles.icon}
                                />
                                <Text style={[styles.menuText, { color: theme.text }]}>{item.label}</Text>
                                {item.hasSubmenu && (
                                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} style={styles.chevron} />
                                )}
                            </TouchableOpacity>
                        ))}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        paddingBottom: 40,
        backgroundColor: '#000',
        borderWidth: 1,
        borderBottomWidth: 0,
        maxHeight: '85%',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    artWrapper: {
        width: 60,
        height: 60,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    art: {
        width: '100%',
        height: '100%',
    },
    songMeta: {
        alignItems: 'center',
        width: '100%',
    },
    songTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    songArtist: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
        textAlign: 'center',
        opacity: 0.6,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    icon: {
        marginRight: 16,
        width: 24,
    },
    menuText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        flex: 1,
    },
    chevron: {
        opacity: 0.3,
    }
});
