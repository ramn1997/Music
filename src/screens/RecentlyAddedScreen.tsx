import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity } from 'react-native';
import { MusicImage } from '../components/MusicImage';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLocalMusic } from '../hooks/useLocalMusic';
import { useNavigation } from '@react-navigation/native';
import { usePlayerContext } from '../hooks/PlayerContext';

export const RecentlyAddedScreen = () => {
    const { theme } = useTheme();
    const { songs } = useLocalMusic();
    const navigation = useNavigation<any>();
    const { playSongInPlaylist } = usePlayerContext();

    // Group songs by Date (Newer vs Older)
    const sections = useMemo(() => {
        const sorted = [...songs].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
        const now = Date.now();
        const THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 Days

        const newer = sorted.filter(s => (s.dateAdded || 0) > now - THRESHOLD);
        const older = sorted.filter(s => (s.dateAdded || 0) <= now - THRESHOLD);

        const result = [];
        if (newer.length > 0) result.push({ title: 'Newer', data: newer });
        if (older.length > 0) result.push({ title: 'Older', data: older });

        return result;
    }, [songs]);

    const handlePlaySong = (item: any) => {
        // We need to construct a linear playlist from the sections for the player
        const allSongs = sections.flatMap(s => s.data);
        const index = allSongs.findIndex(s => s.id === item.id);
        if (index !== -1) {
            playSongInPlaylist(allSongs, index);
            navigation.navigate('Player');
        }
    };

    const renderSong = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.songItem}
            onPress={() => handlePlaySong(item)}
        >
            <MusicImage
                uri={item.coverImage}
                id={item.id}
                style={styles.artwork}
                iconSize={20}
                containerStyle={styles.artworkContainer}
            />
            <View style={styles.songInfo}>
                <Text numberOfLines={1} style={[styles.songTitle, { color: theme.text }]}>{item.title}</Text>
                <Text numberOfLines={1} style={[styles.songDetail, { color: theme.textSecondary }]}>{item.artist}</Text>
            </View>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : ''}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Recently Added</Text>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderSong}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
                        <Text style={[styles.sectionHeaderText, { color: theme.primary }]}>{title}</Text>
                    </View>
                )}
                contentContainerStyle={styles.listContent}
                stickySectionHeadersEnabled={false}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: theme.textSecondary }}>No songs found.</Text>
                    </View>
                }
            />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 20,
        gap: 15
    },
    backButton: {
        padding: 4
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 40,
    },
    sectionHeader: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginTop: 10,
    },
    sectionHeaderText: {
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    artwork: {
        width: 44,
        height: 44,
        borderRadius: 8,
    },
    artworkContainer: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginRight: 15,
        backgroundColor: 'rgba(255,255,255,0.05)',
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
    songDetail: {
        fontSize: 13,
    },
    dateText: {
        fontSize: 11,
        opacity: 0.6,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    }
});
