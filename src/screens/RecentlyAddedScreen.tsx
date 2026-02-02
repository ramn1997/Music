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

export const RecentlyAddedScreen = () => {
    const { theme } = useTheme();
    const { songs } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { playSongInPlaylist } = usePlayerContext();

    // Sort songs by dateAdded desc
    const sortedSongs = useMemo(() => {
        return [...songs].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
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
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                <Ionicons name="musical-note" size={20} color={theme.text} />
            </View>
            <View style={styles.songInfo}>
                <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.songDetail, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.artist}
                </Text>
            </View>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : 'Unknown'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Recently Added</Text>
            </View>

            <FlatList
                data={sortedSongs}
                keyExtractor={(item) => item.id}
                renderItem={renderSong}
                contentContainerStyle={styles.listContent}
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
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
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
        fontSize: 12,
    },
    dateText: {
        fontSize: 10,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    }
});
