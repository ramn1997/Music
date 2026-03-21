import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Dimensions } from 'react-native';
import { MusicImage } from '../components/MusicImage';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLibraryStore } from '../store/useLibraryStore';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../store/usePlayerStore';
import { SongItem } from '../components/SongItem';

const { width } = Dimensions.get('window');

export const RecentlyAddedScreen = () => {
    const { theme } = useTheme();
    const songs = useLibraryStore(state => state.songs);
    const navigation = useNavigation<any>();
    const playSongInPlaylist = usePlayerStore(state => state.playSongInPlaylist);
    const currentSong = usePlayerStore(state => state.currentTrack);

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

    const handlePlaySong = React.useCallback((item: any) => {
        const allSongs = sections.flatMap(s => s.data);
        const index = allSongs.findIndex(s => s.id === item.id);
        if (index !== -1) {
            playSongInPlaylist(allSongs, index, "Recently Added");
            navigation.navigate('Player');
        }
    }, [sections, playSongInPlaylist, navigation]);

    const renderSong = React.useCallback(({ item, index }: { item: any, index: number }) => (
        <View style={styles.songRow}>
            <View style={{ flex: 1 }}>
                <SongItem
                    item={item}
                    index={index}
                    isCurrent={currentSong?.id === item.id}
                    theme={theme}
                    onPress={() => handlePlaySong(item)}
                    onOpenOptions={() => {}}
                />
            </View>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : ''}
            </Text>
        </View>
    ), [theme, handlePlaySong, currentSong?.id]);

    const onSurface = theme.text;
    const onSurfaceVariant = theme.textSecondary;

    return (
        <ScreenContainer variant="default">
            {/* Material 3 Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color={onSurface} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: onSurface, marginLeft: 16 }]}>Recently Added</Text>
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
                stickySectionHeadersEnabled={true}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="time-outline" size={48} color={onSurfaceVariant + '40'} />
                        <Text style={{ color: onSurfaceVariant, marginTop: 16, fontFamily: 'PlusJakartaSans_500Medium' }}>
                            Your library is empty
                        </Text>
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
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        height: 72,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.2,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 220,
    },
    sectionHeader: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#000', // ScreenContainer will override if needed
    },
    sectionHeaderText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_500Medium',
        position: 'absolute',
        right: 60,
        opacity: 0.6,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        opacity: 0.6,
    },
});
