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

export const ArtistsScreen = () => {
    const { theme } = useTheme();
    const { songs } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    // Group songs by artist
    const artists = useMemo(() => {
        const map = new Map();
        songs.forEach(song => {
            const artistName = song.artist || 'Unknown Artist';
            if (!map.has(artistName)) {
                map.set(artistName, {
                    id: artistName,
                    name: artistName,
                    count: 0
                });
            }
            map.get(artistName).count++;
        });
        return Array.from(map.values());
    }, [songs]);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'artist' })}
        >
            <GlassCard style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.row}>
                    <View style={[styles.iconPlaceholder, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                        <Ionicons name="person" size={24} color={theme.primary} />
                    </View>
                    <View style={styles.info}>
                        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.count, { color: theme.textSecondary }]}>{item.count} Songs</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </View>
            </GlassCard>
        </TouchableOpacity>
    );

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Artists</Text>
            </View>

            <FlatList
                data={artists}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: theme.textSecondary }}>No artists found.</Text>
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
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    listItem: {
        marginBottom: 12,
    },
    card: {
        padding: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    count: {
        fontSize: 12,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    }
});
