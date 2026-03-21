import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MusicImage } from '../components/MusicImage';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import { useLibraryStore, Song } from '../store/useLibraryStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { usePlayerStore } from '../store/usePlayerStore';
import { SongItem } from '../components/SongItem';

const { width } = Dimensions.get('window');

const FlashListAny = FlashList as any;

export const MostPlayedScreen = () => {
    const { theme } = useTheme();
    const songs = useLibraryStore(state => state.songs);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const playSongInPlaylist = usePlayerStore(state => state.playSongInPlaylist);
    const currentSong = usePlayerStore(state => state.currentTrack);

    // Sort songs by playCount desc
    const sortedSongs = useMemo(() => {
        return [...songs]
            .filter(s => (s.playCount || 0) > 0)
            .sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    }, [songs]);

    const handlePlaySong = (index: number) => {
        playSongInPlaylist(sortedSongs, index, "Most Played");
        navigation.navigate('Player', { trackIndex: index });
    };

    const renderSong = React.useCallback(({ item, index }: { item: Song; index: number }) => (
        <View style={styles.songRow}>
            <View style={styles.rankBadge}>
                <Text style={[
                    styles.rankText,
                    { 
                        color: index < 3 ? theme.primary : theme.textSecondary,
                        fontFamily: index < 3 ? 'PlusJakartaSans_800ExtraBold' : 'PlusJakartaSans_600SemiBold'
                    }
                ]}>
                    {index + 1}
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <SongItem
                    item={item}
                    index={index}
                    isCurrent={currentSong?.id === item.id}
                    theme={theme}
                    onPress={() => handlePlaySong(index)}
                    onOpenOptions={() => {}} // Could add options here
                />
            </View>
            <View style={[styles.playCountContainer, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="play" size={10} color={theme.primary} />
                <Text style={[styles.playCountText, { color: theme.primary }]}>{item.playCount || 0}</Text>
            </View>
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
                <Text style={[styles.headerTitle, { color: onSurface, marginLeft: 16 }]}>Most Played</Text>
            </View>

            <View style={{ flex: 1 }}>
                <FlashListAny
                    data={sortedSongs}
                    keyExtractor={(item: Song) => item.id}
                    renderItem={renderSong}
                    estimatedItemSize={72}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="stats-chart-outline" size={48} color={onSurfaceVariant + '40'} />
                            <Text style={{ color: onSurfaceVariant, marginTop: 16, fontFamily: 'PlusJakartaSans_500Medium' }}>
                                No play data available yet
                            </Text>
                        </View>
                    }
                />
            </View>
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
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rankBadge: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 16,
    },
    playCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 24,
        paddingHorizontal: 8,
        borderRadius: 12,
        gap: 4,
        position: 'absolute',
        right: 60, // Shift left of the ellipsis button if added
    },
    playCountText: {
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        opacity: 0.6,
    },
});
