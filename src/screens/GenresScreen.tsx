import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
const FlashListAny = FlashList as any;
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLocalMusic } from '../hooks/useLocalMusic';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { GenreListItem } from '../components/GenreListItem';

export const GenresScreen = ({ isEmbedded }: { isEmbedded?: boolean }) => {
    const { theme } = useTheme();
    const { songs } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [layoutMode, setLayoutMode] = useState<'grid2' | 'grid3' | 'list'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

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
                    songs: []
                });
            }
            map.get(genreName).count++;
            map.get(genreName).songs.push(song);
        });
        return Array.from(map.values());
    }, [songs, isNavigated]);

    const genres = useMemo(() => {
        if (!isNavigated) return [];
        const filtered = debouncedQuery.trim()
            ? allGenres.filter(g => g.name.toLowerCase().includes(debouncedQuery.toLowerCase().trim()))
            : allGenres;

        return filtered.sort((a, b) => {
            const aIsUnknown = a.name === 'Unknown Genre';
            const bIsUnknown = b.name === 'Unknown Genre';
            if (aIsUnknown && !bIsUnknown) return 1;
            if (!aIsUnknown && bIsUnknown) return -1;

            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
        });
    }, [allGenres, debouncedQuery, isNavigated]);

    const toggleLayout = () => {
        if (layoutMode === 'grid3') setLayoutMode('grid2');
        else if (layoutMode === 'grid2') setLayoutMode('list');
        else setLayoutMode('grid3');
    };

    const renderItem = React.useCallback(({ item }: { item: any }) => {
        return (
            <GenreListItem
                item={item}
                layoutMode={layoutMode}
                onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'genre' })}
            />
        );
    }, [navigation, layoutMode]);

    const content = (
        <View style={{ flex: 1 }}>
            {!isEmbedded && (
                <View style={[styles.header, { marginVertical: 0, paddingVertical: 10, paddingTop: 20 }]}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Genres</Text>
                    </View>

                    <TouchableOpacity onPress={toggleLayout} style={styles.layoutButton}>
                        <Ionicons
                            name={layoutMode === 'grid3' ? "grid" : (layoutMode === 'grid2' ? "apps" : "list")}
                            size={24}
                            color={theme.primary}
                        />
                    </TouchableOpacity>
                </View>
            )}

            <View style={{
                paddingHorizontal: 20,
                marginBottom: 10,
                marginTop: isEmbedded ? 10 : 0
            }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.card,
                    borderRadius: 20,
                    paddingHorizontal: 15,
                    height: 40
                }}>
                    <Ionicons name="search" size={16} color={theme.textSecondary} />
                    <TextInput
                        style={{ flex: 1, color: theme.text, marginLeft: 8, fontSize: 14, paddingVertical: 0 }}
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
            </View>

            <View style={{ flex: 1 }}>
                <FlashListAny
                    key={layoutMode}
                    data={genres}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderItem}
                    numColumns={layoutMode === 'grid3' ? 3 : (layoutMode === 'grid2' ? 2 : 1)}
                    estimatedItemSize={150}
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
