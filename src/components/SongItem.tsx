import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
    onLongPress?: (item: Song) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
}

const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const SongItem = React.memo(({ item, index, isCurrent, theme, onPress, onOpenOptions, onLongPress, isSelectionMode, isSelected }: SongItemProps) => {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.songItem,
                {
                    backgroundColor: isSelected ? theme.primary + '15' : 'transparent',
                    opacity: pressed ? 0.8 : 1
                }
            ]}
            android_ripple={{ color: theme.primary + '10' }}
            onPress={() => onPress(item)}
            onLongPress={() => onLongPress && onLongPress(item)}
            delayLongPress={400}
        >
            {isSelectionMode && (
                <View style={styles.selectionIndicator}>
                    <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={isSelected ? theme.primary : theme.textSecondary}
                    />
                </View>
            )}
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
                <Text
                    numberOfLines={1}
                    style={[
                        styles.songTitle,
                        {
                            color: isCurrent ? theme.primary : theme.text,
                            fontFamily: isCurrent ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold'
                        }
                    ]}
                >
                    {item.title}
                </Text>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.songArtist,
                        {
                            color: theme.textSecondary,
                            fontFamily: 'PlusJakartaSans_500Medium'
                        }
                    ]}
                >
                    {item.artist}{item.album && item.album !== 'Unknown Album' ? ` • ${item.album}` : ''}
                </Text>
            </View>
            <View style={styles.rightSection}>
                <Text style={[styles.songDuration, { color: theme.textSecondary }]}>{formatDuration(item.duration)}</Text>
                <Pressable
                    style={styles.moreButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        onOpenOptions(item);
                    }}
                    hitSlop={8}
                >
                    <Ionicons name="ellipsis-vertical" size={18} color={theme.textSecondary} />
                </Pressable>
            </View>
        </Pressable>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.title === nextProps.item.title &&
        prevProps.item.artist === nextProps.item.artist &&
        prevProps.item.coverImage === nextProps.item.coverImage &&
        prevProps.isCurrent === nextProps.isCurrent &&
        prevProps.isSelectionMode === nextProps.isSelectionMode &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.theme === nextProps.theme
    );
});

const styles = StyleSheet.create({
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 72,
    },
    selectionIndicator: {
        marginRight: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        marginRight: 16,
    },
    songIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    iconPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 12,
        overflow: 'hidden',
    },
    songInfo: {
        flex: 1,
        marginRight: 12,
    },
    songTitle: {
        fontSize: 15,
        letterSpacing: 0.1,
        marginBottom: 2,
    },
    songArtist: {
        fontSize: 12,
        letterSpacing: 0.2,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    songDuration: {
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginRight: 12,
        letterSpacing: 0.4,
    },
    moreButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
