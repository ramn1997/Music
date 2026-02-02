import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLocalMusic, Song } from '../hooks/useLocalMusic';
import { RootStackParamList } from '../types/navigation';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { usePlayerContext } from '../hooks/PlayerContext';

export const SongsScreen = () => {
    const { songs, loading, fetchMusic } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { playSongInPlaylist } = usePlayerContext();
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchMusic();
    }, [fetchMusic]);

    const handlePlaySong = (index: number) => {
        playSongInPlaylist(songs, index);
        navigation.navigate('Player', { trackIndex: index });
    };

    const filteredSongs = songs.filter(song =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderSong = ({ item, index }: { item: Song; index: number }) => (
        <TouchableOpacity
            style={styles.songItem}
            onPress={() => handlePlaySong(index)}
        >
            <View style={styles.iconContainer}>
                {item.coverImage ? (
                    <Image source={{ uri: item.coverImage }} style={styles.artwork} />
                ) : (
                    <Ionicons name="musical-note" size={24} color={theme.primary} />
                )}
            </View>
            <View style={styles.songInfo}>
                <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.songDetail, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.artist}
                </Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>All Songs</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
                    <Ionicons name="search" size={18} color={theme.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search songs..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="swap-vertical" size={18} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="options-outline" size={18} color={theme.text} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View>
            ) : (
                <FlatList
                    data={filteredSongs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSong}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.textSecondary, marginTop: 50, textAlign: 'center' }}>
                                No music files found matching your search.
                            </Text>
                        </View>
                    }
                />
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1, paddingHorizontal: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
        paddingHorizontal: 20,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 30, // Increased to reduce width
        marginBottom: 20,
        gap: 15,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 2, // Even more compact
        borderRadius: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14, // Slightly smaller text
    },
    actionButton: {
        width: 32, // Reduced to match new height
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        color: colors.textSecondary
    },
    listContent: {
        paddingBottom: 100, // Space for bottom tab
    },
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    songInfo: {
        flex: 1,
        marginLeft: 15,
    },
    songTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    songDetail: {
        fontSize: 14,
    },
    metadataRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    metadataText: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    moreButton: {
        padding: 10
    }
});
