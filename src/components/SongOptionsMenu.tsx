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
    onShowLyrics?: () => void;
}

export const SongOptionsMenu: React.FC<SongOptionsMenuProps> = ({
    visible,
    onClose,
    song,
    onRequestPlaylistAdd,
    onRemoveFromPlaylist,
    onRemoveFromQueue,
    onEditDetails,
    onShowLyrics
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
        ...(onShowLyrics ? [{
            icon: 'document-text-outline',
            label: 'Show Lyrics',
            action: onShowLyrics
        }] : []),
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
                <View style={[styles.container, { backgroundColor: theme.menuBackground }]}>
                    {/* Header with Song Info */}
                    <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
                        <View style={styles.songPreview}>
                            <MusicImage
                                uri={song.coverImage}
                                id={song.id}
                                style={styles.art}
                                iconSize={24}
                                containerStyle={[styles.artPlaceholder, { backgroundColor: theme.background }]}
                            />
                            <View style={styles.songMeta}>
                                <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>{song.title}</Text>
                                <Text style={[styles.songArtist, { color: theme.textSecondary }]} numberOfLines={1}>{song.artist}</Text>
                            </View>
                        </View>
                    </View>

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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '85%',
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
    },
    songPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    artPlaceholder: {
        marginRight: 15,
        borderRadius: 8,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center'
    },
    art: {
        width: 50,
        height: 50,
        borderRadius: 8
    },
    songMeta: {
        flex: 1
    },
    songTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4
    },
    songArtist: {
        fontSize: 14
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    icon: {
        marginRight: 20,
        width: 24
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1
    },
    chevron: {
        opacity: 0.5
    }
});
