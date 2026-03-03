import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLocalMusic } from '../hooks/useLocalMusic';
import { GlassCard } from '../components/GlassCard';
import { MusicImage } from '../components/MusicImage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';

export const YearsScreen = () => {
    const { theme } = useTheme();
    const { songs } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [layoutMode, setLayoutMode] = useState<'grid2' | 'grid3' | 'list'>('list');

    // Group songs by year
    const years = useMemo(() => {
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

        return Array.from(map.values()).sort((a, b) => {
            if (a.name === 'Unknown Year') return 1;
            if (b.name === 'Unknown Year') return -1;
            return b.name.localeCompare(a.name); // Newest years first
        });
    }, [songs]);

    const toggleLayout = () => {
        if (layoutMode === 'grid3') setLayoutMode('grid2');
        else if (layoutMode === 'grid2') setLayoutMode('list');
        else setLayoutMode('grid3');
    };

    const renderItem = React.useCallback(({ item }: { item: any }) => {
        // Find a cover image from the first song in the year
        const representativeSong = item.songs.find((s: any) => s.coverImage) || item.songs[0];
        const coverImage = representativeSong?.coverImage;

        if (layoutMode === 'list') {
            return (
                <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'year' })}
                >
                    <View style={styles.row}>
                        <View style={[styles.listIconPlaceholder, { backgroundColor: theme.card }]}>
                            {coverImage ? (
                                <MusicImage uri={coverImage} iconSize={20} style={{ width: 40, height: 40, borderRadius: 8 }} />
                            ) : (
                                <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
                            )}
                        </View>
                        <View style={styles.info}>
                            <Text style={[styles.title, { color: theme.text, textAlign: 'left' }]} numberOfLines={1}>{item.name}</Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'left' }]}>{item.count} Songs</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>
            );
        }

        const isGrid3 = layoutMode === 'grid3';
        return (
            <TouchableOpacity
                style={isGrid3 ? styles.gridItem3 : styles.gridItem2}
                onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'year' })}
            >
                <GlassCard
                    style={[
                        styles.card,
                        { backgroundColor: theme.card, borderColor: theme.cardBorder },
                        { height: isGrid3 ? 140 : 180 }
                    ]}
                    disableBlur={true}
                >
                    <View style={[
                        styles.iconPlaceholder,
                        { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
                        { width: '100%', aspectRatio: 1, marginBottom: 10, justifyContent: 'center', alignItems: 'center' }
                    ]}>
                        {coverImage ? (
                            <MusicImage
                                uri={coverImage}
                                iconSize={isGrid3 ? 22 : 32}
                                style={{ width: '100%', height: '100%', borderRadius: 12 }}
                                containerStyle={{ width: '100%', height: '100%', borderRadius: 12 }}
                            />
                        ) : (
                            <Ionicons name="calendar-outline" size={isGrid3 ? 30 : 40} color={theme.textSecondary} />
                        )}
                    </View>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>{item.count} Songs</Text>
                </GlassCard>
            </TouchableOpacity>
        );
    }, [theme, navigation, layoutMode]);

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Years</Text>
                </View>

                <TouchableOpacity onPress={toggleLayout} style={styles.layoutButton}>
                    <Ionicons
                        name={layoutMode === 'grid3' ? "grid" : (layoutMode === 'grid2' ? "apps" : "list")}
                        size={24}
                        color={theme.primary}
                    />
                </TouchableOpacity>
            </View>

            <FlatList
                key={layoutMode}
                data={years}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                numColumns={layoutMode === 'grid3' ? 3 : (layoutMode === 'grid2' ? 2 : 1)}
                columnWrapperStyle={layoutMode !== 'list' ? styles.columnWrapper : undefined}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: theme.textSecondary }}>No years found.</Text>
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
        paddingBottom: 40,
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
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
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
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 12,
        marginBottom: 2,
        textAlign: 'center'
    },
    center: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    }
});
