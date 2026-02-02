import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';
import { useLocalMusic, Song } from '../hooks/useLocalMusic';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Playlist'>;

export const PlaylistScreen = ({ route, navigation }: Props) => {
    const { id, name, type } = route.params;
    const { songs, loading, fetchMusic } = useLocalMusic();
    const { theme } = useTheme();
    const [displaySongs, setDisplaySongs] = useState<Song[]>([]);

    useEffect(() => {
        fetchMusic();
    }, [fetchMusic]);

    useEffect(() => {
        let sorted = [...songs];
        if (type === 'most_played') {
            sorted.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        } else if (type === 'recently_played') {
            sorted.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
        } else if (type === 'never_played') {
            sorted = sorted.filter(s => (s.playCount || 0) === 0);
        }
        setDisplaySongs(sorted);
    }, [songs, type]);

    const renderSong = ({ item, index }: { item: Song; index: number }) => (
        <TouchableOpacity
            style={styles.songItem}
            onPress={() => navigation.navigate('Player', { trackIndex: songs.findIndex(s => s.id === item.id), playlistId: id })}
        >
            <View style={styles.songIndex}>
                <Text style={[styles.indexText, { color: theme.textSecondary }]}>{index + 1}</Text>
            </View>
            <View style={styles.songInfo}>
                <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.songArtist, { color: theme.textSecondary }]} numberOfLines={1}>{item.artist}</Text>
            </View>
            <Text style={[styles.songDuration, { color: theme.textSecondary }]}>{formatDuration(item.duration)}</Text>
            <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{name}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading Music...</Text>
                </View>
            ) : (
                <FlatList
                    data={displaySongs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSong}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ color: theme.textSecondary }}>No songs found in this playlist.</Text>
                        </View>
                    }
                    ListHeaderComponent={
                        <View style={styles.playlistHeader}>
                            <GlassCard style={styles.playlistArtCard}>
                                <Ionicons name="musical-notes" size={60} color={theme.primary} />
                            </GlassCard>
                            <Text style={[styles.playlistName, { color: theme.text }]}>{name}</Text>
                            <Text style={[styles.playlistCount, { color: theme.textSecondary }]}>{displaySongs.length} Songs</Text>
                            <TouchableOpacity style={[styles.playAllButton, { backgroundColor: theme.primary }]}>
                                <Ionicons name="play" size={24} color={theme.background} />
                                <Text style={[styles.playAllText, { color: theme.background }]}>Play All</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </ScreenContainer>
    );
};

const formatDuration = (millis: number) => {
    if (!millis) return "0:00";
    const minutes = Math.floor(millis / 1000 / 60);
    const seconds = Math.floor((millis / 1000) % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 16
    },
    listContent: {
        paddingBottom: 40,
    },
    playlistHeader: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    playlistArtCard: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.05)'
    },
    playlistName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 5,
    },
    playlistCount: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 20,
    },
    playAllButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 30,
        alignItems: 'center',
        gap: 10,
    },
    playAllText: {
        color: colors.background,
        fontWeight: 'bold',
        fontSize: 16,
    },
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    songIndex: {
        width: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    songInfo: {
        flex: 1,
        marginLeft: 10,
    },
    songTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    songArtist: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    songDuration: {
        color: colors.textSecondary,
        fontSize: 14,
        marginRight: 10,
    },
    moreButton: {
        padding: 5,
    },
});
