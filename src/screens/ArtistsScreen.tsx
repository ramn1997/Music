import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
// SafeAnimatedFlashList will be imported below
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLibraryStore } from '../store/useLibraryStore';
import { MusicImage } from '../components/MusicImage';
import { GlassCard } from '../components/GlassCard';
import { ArtistListItem } from '../components/ArtistListItem';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { MarqueeText } from '../components/MarqueeText';
import { SortOptionsModal, SortOption } from '../components/SortOptionsModal';
import Animated, { FadeInDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAnimatedFlashList } from '../components/SafeAnimatedFlashList';
import { LinearGradient } from 'expo-linear-gradient';

const getGradientColors = (id: string): [string, string] => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const userColors: [string, string][] = [
        ['#0f172a', '#1e40af'],
        ['#312e81', '#4338ca'],
        ['#581c87', '#7e22ce'],
        ['#701a75', '#a21caf'],
        ['#831843', '#be185d'],
        ['#064e3b', '#065f46'],
    ];
    return userColors[hash % userColors.length];
};

// Removed local CardDesign as it's now handled by ArtistListItem

export const ArtistsScreen = ({ isEmbedded }: { isEmbedded?: boolean }) => {
    const { theme } = useTheme();
    const songs = useLibraryStore(state => state.songs);
    const loading = useLibraryStore(state => state.loading);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [layoutMode, setLayoutMode] = useState<'grid2' | 'grid3' | 'list'>('grid3');
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

    // Group songs by artist
    const allArtists = useMemo(() => {
        if (!isNavigated) return [];
        const map = new Map();
        songs.forEach(song => {
            const artistName = song.artist || 'Unknown Artist';
            if (!map.has(artistName)) {
                map.set(artistName, {
                    id: artistName,
                    name: artistName,
                    count: 0,
                    duration: 0
                });
            }
            const entry = map.get(artistName);
            entry.count++;
            entry.duration += (song.duration || 0);
        });
        return Array.from(map.values());
    }, [songs, isNavigated]);

    const artists = useMemo(() => {
        if (!isNavigated) return [];
        const query = debouncedQuery.trim().toLowerCase();
        const filtered = query
            ? allArtists.filter(a => a.name.toLowerCase().includes(query))
            : allArtists;

        const sorted = [...filtered].sort((a, b) => {
            if (sortOption === 'duration') {
                return (b.duration || 0) - (a.duration || 0);
            }
            const aIsUnknown = a.name === 'Unknown Artist';
            const bIsUnknown = b.name === 'Unknown Artist';
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
    }, [allArtists, debouncedQuery, isNavigated, sortOption]);




    const renderItem = React.useCallback(({ item, index }: { item: any, index: number }) => {
        return (
            <ArtistListItem
                item={item}
                layoutMode={layoutMode}
                onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'artist' })}
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
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Artists</Text>
                    </View>
                ) : <View style={{ flex: 1 }} />}
            </View>

            {/* Search Bar Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 10 }}>
                <View style={[styles.searchContainer, { backgroundColor: theme.card, flex: 1, marginRight: 10, marginHorizontal: 0, marginVertical: 0, borderWidth: 1, borderColor: theme.cardBorder }]}>
                    <Ionicons name="search" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search artists..."
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
            <SafeAnimatedFlashList
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                key={layoutMode}
                data={artists}
                keyExtractor={(item: any) => item.id}
                renderItem={renderItem}
                numColumns={layoutMode === 'list' ? 1 : (layoutMode === 'grid2' ? 2 : 3)}
                estimatedItemSize={150}
                drawDistance={250}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: theme.textSecondary }}>No artists found.</Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
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
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center'
    },
    listContent: {
        paddingHorizontal: 15,
        paddingBottom: 150,
    },
    columnWrapper: {
        justifyContent: 'flex-start',
        gap: 12,
        marginBottom: 15,
    },
    gridItem3: {
        flex: 1,
        maxWidth: '31%',
    },
    gridItem2: {
        flex: 1,
        maxWidth: '48%',
    },
    listItem: {
        width: '100%',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 5
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listIconPlaceholder: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    card: {
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    iconPlaceholder: {
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
        textAlign: 'center',
        width: '100%'
    },
    subtitle: {
        fontSize: 12,
        marginBottom: 2,
        textAlign: 'center',
        width: '100%'
    },
    count: {
        fontSize: 11,
        textAlign: 'center',
        width: '100%'
    },
    center: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    },
    alphabetSidebar: {
        width: 30,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        backgroundColor: 'transparent',
        borderRadius: 15,
        position: 'absolute',
        right: 5,
        top: '12%',
        bottom: '15%',
        zIndex: 10,
        borderWidth: 0,
        borderColor: 'transparent',
    },
    alphabetLetter: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 1,
    },
    alphabetText: {
        fontSize: 10,
        fontWeight: '900',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 34,
        borderRadius: 17,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        height: '100%',
        paddingVertical: 0,
    },
});
