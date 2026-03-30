import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';

const FlashListAny = FlashList as any;
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLibraryStore } from '../store/useLibraryStore';

import { GlassCard } from '../components/GlassCard';
import { MusicImage } from '../components/MusicImage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { PlaylistCollage } from '../components/PlaylistCollage';
import { SortOptionsModal, SortOption } from '../components/SortOptionsModal';
import { SafeAnimatedFlashList } from '../components/SafeAnimatedFlashList';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';

interface YearsScreenProps {
    isEmbedded?: boolean;
}

export const YearsScreen = ({ isEmbedded }: YearsScreenProps) => {
    const { theme } = useTheme();
    const songs = useLibraryStore(state => state.songs);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('newest');
    const [sortModalVisible, setSortModalVisible] = useState(false);
    const [isNavigated, setIsNavigated] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 150);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        const interaction = require('react-native').InteractionManager.runAfterInteractions(() => {
            setIsNavigated(true);
        });
        return () => interaction.cancel();
    }, []);

    // Group songs by year
    const allYears = useMemo(() => {
        if (!isNavigated) return [];
        const map = new Map();
        songs.forEach(song => {
            let yearName = song.year && song.year !== '0' && song.year !== 'Unknown Year' ? song.year : 'Unknown Year';

            // Cleanup: Ensure it's just the year (YYYY) if it's a date string
            if (yearName !== 'Unknown Year') {
                const match = yearName.match(/\d{4}/);
                if (match) yearName = match[0];
            }

            if (!map.has(yearName)) {
                map.set(yearName, {
                    id: yearName,
                    name: yearName,
                    count: 0,
                    songs: []
                });
            }
            map.get(yearName).count++;
            map.get(yearName).songs.push(song);
        });

        return Array.from(map.values());
    }, [songs, isNavigated]);

    const years = useMemo(() => {
        if (!isNavigated) return [];
        const query = debouncedQuery.trim().toLowerCase();
        const filtered = query
            ? allYears.filter(y => y.name.toLowerCase().includes(query))
            : allYears;

        const sorted = [...filtered].sort((a, b) => {
            if (a.name === 'Unknown Year') return 1;
            if (b.name === 'Unknown Year') return -1;

            switch (sortOption) {
                case 'newest': return b.name.localeCompare(a.name);
                case 'oldest': return a.name.localeCompare(b.name);
                case 'most_songs':
                    if (b.count !== a.count) return b.count - a.count;
                    return b.name.localeCompare(a.name);
                case 'least_songs':
                    if (a.count !== b.count) return a.count - b.count;
                    return b.name.localeCompare(a.name);
                default: return b.name.localeCompare(a.name);
            }
        });

        return sorted;
    }, [allYears, debouncedQuery, isNavigated, sortOption]);

    const renderItem = React.useCallback(({ item, index }: { item: any, index: number }) => {
        const isFirst = index === 0;
        const isLast = index === years.length - 1;

        return (
            <View style={[styles.timelineContainer, { borderBottomColor: theme.cardBorder }]}>
                <View style={styles.timelineLeft}>
                    <View style={[
                        styles.timelineLine,
                        {
                            backgroundColor: theme.primary,
                            top: isFirst ? 30 : 0,
                            bottom: isLast ? '70%' : 0,
                            opacity: 0.2
                        }
                    ]} />
                    <View style={[styles.timelineDotContainer, { backgroundColor: theme.background }]}>
                        <LinearGradient
                            colors={[theme.primary, theme.secondary || theme.primary]}
                            style={styles.timelineDot}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.timelineContent}
                    onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'year' })}
                    activeOpacity={0.7}
                >
                    <View style={styles.timelineInfoRow}>
                        <View style={styles.timelineTextContainer}>
                            <Text style={[styles.yearTitle, { color: theme.text }]}>{item.name}</Text>
                            <Text style={[styles.yearSubtitle, { color: theme.textSecondary }]}>{item.count} Songs</Text>
                        </View>
                        <PlaylistCollage
                            songs={item.songs}
                            size={56}
                            iconSize={18}
                            iconName="calendar-outline"
                            borderRadius={12}
                            showBubbles={false}
                        />
                        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary + '40'} />
                    </View>
                    
                    <View style={styles.songPreviewRow}>
                         {item.songs.slice(0, 3).map((song: any, i: number) => (
                             <View key={song.id || i} style={[styles.previewBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                                 <Text style={[styles.previewBubbleText, { color: theme.textSecondary }]} numberOfLines={1}>
                                     {song.title}
                                 </Text>
                             </View>
                         ))}
                         {item.count > 3 && (
                             <View style={[styles.previewBubble, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                                 <Text style={[styles.previewBubbleText, { color: theme.primary, fontWeight: '700' }]}>
                                     +{item.count - 3}
                                 </Text>
                             </View>
                         )}
                    </View>
                </TouchableOpacity>
            </View>
        );
    }, [theme, navigation, years]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            // Bypass JS thread
        },
    });

    const content = (
        <View style={{ flex: 1 }}>
            <SortOptionsModal
                visible={sortModalVisible}
                onClose={() => setSortModalVisible(false)}
                currentSort={sortOption}
                onSelect={(val: any) => setSortOption(val)}
                options={[
                    { label: 'Newest First', value: 'newest', icon: 'calendar-outline' },
                    { label: 'Oldest First', value: 'oldest', icon: 'time-outline' },
                    { label: 'Most Songs', value: 'most_songs', icon: 'stats-chart-outline' },
                    { label: 'Least Songs', value: 'least_songs', icon: 'trending-down-outline' },
                ]}
            />

            <View style={[styles.header, { marginVertical: 0, paddingVertical: 10, paddingTop: isEmbedded ? 0 : 20 }]}>
                {!isEmbedded && (
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Years</Text>
                    </View>
                )}
            </View>

            <View style={{ flex: 1 }}>
                <SafeAnimatedFlashList
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    data={years}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderItem}
                    numColumns={1}
                    estimatedItemSize={120}
                    drawDistance={250}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        <View style={{ flex: 1, paddingHorizontal: 5 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: isEmbedded ? 10 : 0, gap: 12 }}>
                                <View style={[styles.searchContainer, { backgroundColor: theme.card, flex: 1, borderWidth: 1, borderColor: theme.cardBorder }]}>
                                    <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
                                    <TextInput
                                        style={[styles.searchInput, { color: theme.text, fontFamily: 'PlusJakartaSans_500Medium' }]}
                                        placeholder="Search years..."
                                        placeholderTextColor={theme.textSecondary + '80'}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
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
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.textSecondary }}>No years found.</Text>
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
        paddingHorizontal: 20,
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
        justifyContent: 'center',
        alignItems: 'center'
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
    listContent: {
        paddingHorizontal: 15,
        paddingBottom: 220,
    },
    timelineContainer: {
        flexDirection: 'row',
        minHeight: 100,
        marginBottom: 8,
    },
    timelineLeft: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    timelineLine: {
        position: 'absolute',
        width: 2,
    },
    timelineDotContainer: {
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    timelineContent: {
        flex: 1,
        paddingVertical: 10,
    },
    timelineInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timelineTextContainer: {
        flex: 1,
    },
    yearTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    yearSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: -2,
    },
    songPreviewRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
    },
    previewBubble: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        maxWidth: 120,
    },
    previewBubbleText: {
        fontSize: 11,
        fontWeight: '500',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    }
});
