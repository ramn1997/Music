import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLocalMusic, Song } from '../hooks/useLocalMusic';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { usePlayerContext } from '../hooks/PlayerContext';

export const MostPlayedScreen = () => {
    const { theme } = useTheme();
    const { songs } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { playSongInPlaylist } = usePlayerContext();

    // Sort songs by playCount desc
    const sortedSongs = useMemo(() => {
        return [...songs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    }, [songs]);

    const handlePlaySong = (index: number) => {
        playSongInPlaylist(sortedSongs, index);
        navigation.navigate('Player', { trackIndex: index });
    };

    const renderSong = ({ item, index }: { item: Song; index: number }) => (
        <TouchableOpacity
            style={styles.songItem}
            onPress={() => handlePlaySong(index)}
        >
            <View style={styles.rankContainer}>
                <Text style={[styles.rankText, { color: index < 3 ? theme.primary : theme.textSecondary }]}>
                    {index + 1}
                </Text>
            </View>
            <View style={styles.songInfo}>
                <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.songDetail, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.artist}
                </Text>
            </View>
            <View style={styles.playCountBadge}>
                <Ionicons name="play" size={10} color={theme.textSecondary} />
                <Text style={[styles.playCountText, { color: theme.textSecondary }]}>{item.playCount || 0}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Most Played</Text>
            </View>

            <FlatList
                data={sortedSongs}
                keyExtractor={(item) => item.id}
                renderItem={renderSong}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: theme.textSecondary }}>No most played songs yet.</Text>
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
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    rankContainer: {
        width: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    rankText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    songInfo: {
        flex: 1,
    },
    songTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    songDetail: {
        fontSize: 14,
    },
    playCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    playCountText: {
        fontSize: 12
    },
    center: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    }
});
