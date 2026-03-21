import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
// SafeAnimatedFlashList will be imported below
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLibraryStore } from '../store/useLibraryStore';
import { GlassCard } from '../components/GlassCard';
import { MusicImage } from '../components/MusicImage';
import { SortOptionsModal, SortOption } from '../components/SortOptionsModal';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

import { MarqueeText } from '../components/MarqueeText';
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

const CardDesign = () => (
    <>
        <View style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ position: 'absolute', bottom: -10, left: -10, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)' }} />
    </>
);

const MemoizedAlbumItem = React.memo(({ item, layoutMode, theme, onPress }: { item: any, layoutMode: string, theme: any, onPress: (item: any) => void }) => {
    const isGrid3 = layoutMode === 'grid3';
    return (
        <View style={{ flex: layoutMode === 'list' ? 1 : (isGrid3 ? 1 / 3 : 1 / 2), paddingHorizontal: layoutMode === 'list' ? 0 : 8, marginBottom: layoutMode === 'list' ? 0 : 16 }}>
            {layoutMode === 'list' ? (
                <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => onPress(item)}
                >
                    <View style={styles.row}>
                        <View style={[styles.listIconPlaceholder, { backgroundColor: 'transparent' }]}>
                            <MusicImage uri={item.coverImage} iconSize={20} style={{ width: 45, height: 45, borderRadius: 8 }} containerStyle={{ width: 45, height: 45, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        </View>
                        <View style={styles.info}>
                            <MarqueeText text={item.name} style={[styles.title, { color: theme.text, textAlign: 'left', fontSize: 16 }]} />
                            <MarqueeText text={item.artist} style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'left' }]} />
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={{ width: '100%' }}
                    onPress={() => onPress(item)}
                    activeOpacity={0.7}
                >
                    <View style={{ width: '100%', alignItems: 'center' }}>
                        <View
                            style={[
                                styles.card,
                                {
                                    backgroundColor: 'transparent',
                                    borderWidth: 0,
                                    padding: 0,
                                    width: '100%',
                                    aspectRatio: 1,
                                    overflow: 'hidden',
                                    marginBottom: 8
                                }
                            ]}
                        >
                            <MusicImage
                                uri={item.coverImage}
                                id={item.id}
                                iconSize={isGrid3 ? 40 : 50}
                                style={{ width: '100%', height: '100%' }}
                                containerStyle={{ width: '100%', height: '100%', borderRadius: 20 }}
                            />
                        </View>
                        <MarqueeText
                            text={item.name}
                            style={{
                                color: theme.text,
                                fontSize: isGrid3 ? 12 : 14,
                                fontWeight: 'bold',
                                textAlign: 'center',
                                width: '100%'
                            }}
                        />
                        <Text
                            numberOfLines={1}
                            style={{
                                marginTop: 2,
                                color: theme.textSecondary,
                                fontSize: isGrid3 ? 10 : 12,
                                textAlign: 'center',
                                width: '100%'
                            }}
                        >
                            {item.artist}
                        </Text>
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
}, (prev, next) => {
    return (
        prev.item.id === next.item.id &&
        prev.item.count === next.item.count &&
        prev.item.coverImage === next.item.coverImage &&
        prev.layoutMode === next.layoutMode &&
        prev.theme === next.theme
    );
});

export const AlbumsScreen = ({ isEmbedded }: { isEmbedded?: boolean }) => {

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

    // Group songs by album
    const allAlbums = useMemo(() => {
        if (!isNavigated) return [];
        const map = new Map();
        songs.forEach(song => {
            const albumName = song.album || 'Unknown Album';
            if (!map.has(albumName)) {
                map.set(albumName, {
                    id: albumName,
                    name: albumName,
                    artist: song.artist,
                    coverImage: song.coverImage,
                    count: 0,
                    duration: 0
                });
            } else if (!map.get(albumName).coverImage && song.coverImage) {
                map.get(albumName).coverImage = song.coverImage;
            }
            const entry = map.get(albumName);
            entry.count++;
            entry.duration += (song.duration || 0);
        });
        return Array.from(map.values());
    }, [songs, isNavigated]);

    const albums = useMemo(() => {
        if (!isNavigated) return [];
        const query = debouncedQuery.trim().toLowerCase();
        const filtered = query
            ? allAlbums.filter(a =>
                a.name.toLowerCase().includes(query) ||
                (a.artist && a.artist.toLowerCase().includes(query))
            )
            : allAlbums;

        const sorted = [...filtered].sort((a, b) => {
            if (sortOption === 'duration') {
                return (b.duration || 0) - (a.duration || 0);
            }
            const aIsUnknown = a.name === 'Unknown Album';
            const bIsUnknown = b.name === 'Unknown Album';
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
    }, [allAlbums, debouncedQuery, isNavigated, sortOption]);




    const handlePress = React.useCallback((item: any) => {
        navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'album' });
    }, [navigation]);

    const renderItem = React.useCallback(({ item }: { item: any }) => {
        return <MemoizedAlbumItem item={item} layoutMode={layoutMode} theme={theme} onPress={handlePress} />;
    }, [theme, layoutMode, handlePress]);

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
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Albums</Text>
                    </View>
                ) : <View style={{ flex: 1 }} />}
            </View>

            {/* Material 3 Search Bar & Options */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 10, gap: 12 }}>
                <View style={[styles.searchContainer, { backgroundColor: theme.card, flex: 1, borderWidth: 1, borderColor: theme.cardBorder }]}>
                    <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text, fontFamily: 'PlusJakartaSans_500Medium' }]}
                        placeholder="Search albums..."
                        placeholderTextColor={theme.textSecondary + '80'}
                        value={searchQuery}
                        onChangeText={(text) => setSearchQuery(text)}
                        selectionColor={theme.primary}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    onPress={() => setSortModalVisible(true)}
                    style={[styles.layoutButton, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }]}
                >
                    <Ionicons name="filter" size={20} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, paddingTop: isEmbedded ? 10 : 0 }}>
                <SafeAnimatedFlashList
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    key={layoutMode}
                    style={{ flex: 1 }} // Force FlashList to take available width
                    data={albums}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    numColumns={layoutMode === 'list' ? 1 : (layoutMode === 'grid2' ? 2 : 3)}
                    estimatedItemSize={150}
                    drawDistance={250}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.textSecondary }}>No albums found.</Text>
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
        width: 48,
        height: 48,
        borderRadius: 24,
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
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listIconPlaceholder: {
        width: 45,
        height: 45,
        borderRadius: 8,
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
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        width: '100%',
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
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 24,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
        paddingVertical: 0,
    },
});
