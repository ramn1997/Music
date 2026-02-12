import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusicImage } from './MusicImage';

import { Song } from '../hooks/useLocalMusic';

interface SongItemProps {
    item: Song;
    index: number;
    isCurrent: boolean;
    theme: any;
    onPress: (item: Song) => void;
    onOpenOptions: (item: Song) => void;
}

const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const SongItem = React.memo(({ item, index, isCurrent, theme, onPress, onOpenOptions }: SongItemProps) => {
    return (
        <TouchableOpacity
            style={styles.songItem}
            onPress={() => onPress(item)}
        >
            <View style={styles.iconContainer}>
                <MusicImage
                    uri={item.coverImage}
                    id={item.id}
                    assetUri={item.uri}
                    style={styles.songIcon}
                    iconSize={21}
                    containerStyle={[styles.iconPlaceholder, { backgroundColor: theme.card }]}
                />
            </View>
            <View style={styles.songInfo}>
                {isCurrent ? (
                    <>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.songTitle, { color: theme.text }]}>
                            {item.title}
                        </Text>
                        <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={[styles.songArtist, { color: theme.textSecondary }]}
                        >
                            {`${item.artist}${item.album && item.album !== 'Unknown Album' ? ` • ${item.album}` : ''}`}
                        </Text>
                    </>
                ) : (
                    <>
                        <Text numberOfLines={1} style={[styles.songTitle, { color: theme.text }]}>{item.title}</Text>
                        <Text numberOfLines={1} style={[styles.songArtist, { color: theme.textSecondary }]}>
                            {item.artist}{item.album && item.album !== 'Unknown Album' ? ` • ${item.album}` : ''}
                        </Text>
                    </>
                )}
            </View>
            <Text style={[styles.songDuration, { color: theme.textSecondary }]}>{formatDuration(item.duration)}</Text>

            <TouchableOpacity
                style={styles.moreButton}
                onPress={(e) => {
                    e.stopPropagation();
                    onOpenOptions(item);
                }}
            >
                <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 70, // Fixed height for direct virtualization benefit
    },
    iconContainer: {
        width: 45,
        height: 45,
        marginRight: 15,
    },
    songIcon: {
        width: 45,
        height: 45,
        borderRadius: 12,
    },
    iconPlaceholder: {
        width: 45,
        height: 45,
        borderRadius: 12,
        overflow: 'hidden',
    },
    songInfo: {
        flex: 1,
        marginRight: 10,
    },
    songTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    songArtist: {
        fontSize: 13,
    },
    songDuration: {
        fontSize: 12,
        marginRight: 10,
    },
    moreButton: {
        padding: 5,
    },
});
