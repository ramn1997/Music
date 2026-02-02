import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLocalMusic } from '../hooks/useLocalMusic';
import { GlassCard } from '../components/GlassCard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

export const AlbumsScreen = () => {
    const { theme } = useTheme();
    const { songs } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    // Group songs by album
    const albums = useMemo(() => {
        const map = new Map();
        songs.forEach(song => {
            const albumName = song.album || 'Unknown Album';
            if (!map.has(albumName)) {
                map.set(albumName, {
                    id: albumName,
                    name: albumName,
                    artist: song.artist,
                    count: 0
                });
            }
            map.get(albumName).count++;
        });
        return Array.from(map.values());
    }, [songs]);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'album' })}
        >
            <GlassCard style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={[styles.iconPlaceholder, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <Ionicons name="disc" size={32} color={theme.primary} />
                </View>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>{item.artist}</Text>
                <Text style={[styles.count, { color: theme.textSecondary }]}>{item.count} Songs</Text>
            </GlassCard>
        </TouchableOpacity>
    );

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Albums</Text>
            </View>

            <FlatList
                data={albums}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: theme.textSecondary }}>No albums found.</Text>
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
        paddingHorizontal: 15,
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    gridItem: {
        width: '48%',
    },
    card: {
        padding: 15,
        alignItems: 'center',
        height: 180,
        justifyContent: 'center',
    },
    iconPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 12,
        marginBottom: 2,
        textAlign: 'center'
    },
    count: {
        fontSize: 10,
        textAlign: 'center'
    },
    center: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    }
});
