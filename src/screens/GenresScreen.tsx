import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAnimatedFlashList } from '../components/SafeAnimatedFlashList';
import { Ionicons } from '@expo/vector-icons';
import { SortOptionsModal, SortOption } from '../components/SortOptionsModal';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLibraryStore } from '../store/useLibraryStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { GenreListItem } from '../components/GenreListItem';

export const GenresScreen = ({ isEmbedded }: { isEmbedded?: boolean }) => {
    const { theme } = useTheme();
    const songs = useLibraryStore(state => state.songs);
    const loading = useLibraryStore(state => state.loading);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [layoutMode, setLayoutMode] = useState<'grid2' | 'grid3' | 'list'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('az');
    const [sortModalVisible, setSortModalVisible] = useState(false);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 150);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const [isNavigated, setIsNavigated] = useState(false);
    React.useEffect(() => {
        const interaction = require('react-native').InteractionManager.runAfterInteractions(() => {
            setIsNavigated(true);
        });
        return () => interaction.cancel();
    }, []);

    // Group songs by genre
    const allGenres = useMemo(() => {
        if (!isNavigated) return [];
        const map = new Map();
        songs.forEach(song => {
            const genreName = song.genre || 'Unknown Genre';
            if (!map.has(genreName)) {
                map.set(genreName, {
                    id: genreName,
                    name: genreName,
                    count: 0,
                    duration: 0,
                    songs: []
                });
            }
            const entry = map.get(genreName);
            entry.count++;
            entry.duration += (song.duration || 0);
            if (entry.songs.length < 4) {
                entry.songs.push(song);
            }
        });
        return Array.from(map.values());
    }, [songs, isNavigated]);

    const genres = useMemo(() => {
        if (!isNavigated) return [];
        const query = debouncedQuery.trim().toLowerCase();
        const filtered = query
            ? allGenres.filter(g => g.name.toLowerCase().includes(query))
            : allGenres;

        const sorted = [...filtered].sort((a, b) => {
            if (sortOption === 'duration') {
                return (b.duration || 0) - (a.duration || 0);
            }
            const aIsUnknown = a.name === 'Unknown Genre';
            const bIsUnknown = b.name === 'Unknown Genre';
            if (aIsUnknown && !bIsUnknown) return 1;
            if (!aIsUnknown && bIsUnknown) return -1;

            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        if (sortOption === 'za') {
            return sorted.reverse();
        }

        return sorted;
    }, [allGenres, debouncedQuery, isNavigated, sortOption]);


    const renderItem = React.useCallback(({ item }: { item: any }) => {
        return (
            <GenreListItem
                item={item}
                layoutMode={layoutMode}
                onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'genre' })}
            />
        );
    }, [navigation, layoutMode]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            // Bypass JS thread
        },
    });

    const content = (
        <View style={{ flex: 1, position: 'relative' }}>
            <SortOptionsModal
                visible={sortModalVisible}
                onClose={() => setSortModalVisible(false)}
                currentSort={sortOption}
                onSelect={setSortOption}
                options={[
                    { label: 'A-Z', value: 'az', icon: 'text' },
                    { label: 'Z-A', value: 'za', icon: 'text' },
                    { label: 'Duration', value: 'duration', icon: 'time-outline' },
                ]}
            />
            <View style={[styles.header, { marginVertical: 0, paddingVertical: 10, paddingTop: isEmbedded ? 0 : 20 }]}>
                {!isEmbedded ? (
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Genres</Text>
                    </View>
                ) : <View style={{ flex: 1 }} />}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 10, marginTop: isEmbedded ? 10 : 0 }}>
                <View style={[styles.searchContainer, { backgroundColor: theme.card, flex: 1, marginRight: 10, marginHorizontal: 0, marginVertical: 0, borderWidth: 1, borderColor: theme.cardBorder }]}>
                    <Ionicons name="search" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search genres..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity onPress={() => setSortModalVisible(true)} style={styles.layoutButton}>
                    <Ionicons name="options-outline" size={22} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
                <SafeAnimatedFlashList
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    key={layoutMode}
                    data={genres}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderItem}
                    numColumns={layoutMode === 'list' ? 1 : (layoutMode === 'grid3' ? 3 : 2)}
                    estimatedItemSize={150}
                    drawDistance={250}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.textSecondary }}>No genres found.</Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    );

    if (isEmbedded) return content;

    return (
        <ScreenContainer variant="default">
            {content}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginVertical: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    backButton: {
        padding: 4
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    layoutButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 38,
        borderRadius: 19,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
        height: '100%',
        paddingVertical: 0,
    },
    listContent: {
        paddingHorizontal: 15,
        paddingBottom: 150,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    }
});
