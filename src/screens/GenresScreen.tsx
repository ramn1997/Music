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

export const GenresScreen = () => {
    const { theme } = useTheme();
    const { songs } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    // Group songs by genre
    const genres = useMemo(() => {
        const map = new Map();
        songs.forEach(song => {
            const genreName = song.genre || 'Unknown Genre';
            if (!map.has(genreName)) {
                map.set(genreName, {
                    id: genreName,
                    name: genreName,
                    count: 0
                });
            }
            map.get(genreName).count++;
        });
        return Array.from(map.values());
    }, [songs]);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'genre' })}
        >
            <GlassCard style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={[styles.iconPlaceholder, { backgroundColor: theme.secondary }]}>
                    <Ionicons name="pricetags" size={28} color="#fff" />
                </View>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
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
                <Text style={[styles.headerTitle, { color: theme.text }]}>Genres</Text>
            </View>

            <FlatList
                data={genres}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: theme.textSecondary }}>No genres found.</Text>
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
        height: 140,
        justifyContent: 'center',
    },
    iconPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        textAlign: 'center'
    },
    count: {
        fontSize: 12,
        textAlign: 'center'
    },
    center: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    }
});
