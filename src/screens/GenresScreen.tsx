import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLocalMusic } from '../hooks/useLocalMusic';
import { MusicImage } from '../components/MusicImage';
import { GlassCard } from '../components/GlassCard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { MarqueeText } from '../components/MarqueeText';
import Animated, { FadeInDown } from 'react-native-reanimated';
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

export const GenresScreen = () => {
    const { theme } = useTheme();
    const { songs, loading, refreshMetadata } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [layoutMode, setLayoutMode] = useState<'grid2' | 'grid3' | 'list'>('list');

    // Group songs by genre
    const genres = useMemo(() => {
        const map = new Map();
        songs.forEach(song => {
            const genreName = song.genre || 'Unknown Genre';
            if (!map.has(genreName)) {
                map.set(genreName, {
                    id: genreName,
                    name: genreName,
                    coverImage: song.coverImage,
                    count: 0
                });
            } else if (!map.get(genreName).coverImage && song.coverImage) {
                map.get(genreName).coverImage = song.coverImage;
            }
            map.get(genreName).count++;
        });
        return Array.from(map.values()).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    }, [songs]);

    const toggleLayout = () => {
        if (layoutMode === 'grid3') setLayoutMode('grid2');
        else if (layoutMode === 'grid2') setLayoutMode('list');
        else setLayoutMode('grid3');
    };

    const renderItem = React.useCallback(({ item, index }: { item: any, index: number }) => {
        const isGrid3 = layoutMode === 'grid3';

        return (
            <View
                style={{ flex: layoutMode === 'list' ? 1 : (isGrid3 ? 1 / 3 : 1 / 2) }}
            >
                {layoutMode === 'list' ? (
                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'genre' })}
                    >
                        <View style={styles.row}>
                            <View style={[styles.listIconPlaceholder, { backgroundColor: 'transparent' }]}>
                                <MusicImage
                                    uri={item.coverImage}
                                    id={item.id}
                                    style={{ width: 45, height: 45, borderRadius: 8 }}
                                    iconSize={20}
                                />
                            </View>
                            <View style={styles.info}>
                                <MarqueeText text={item.name} style={[styles.title, { color: theme.text, textAlign: 'left', fontSize: 16 }]} />
                                <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'left' }]} numberOfLines={1}>{item.count} Songs</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                        </View>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[isGrid3 ? styles.gridItem3 : styles.gridItem2, { width: '100%', maxWidth: '100%' }]}
                        onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'genre' })}
                    >
                        <View
                            style={[
                                styles.card,
                                { backgroundColor: theme.card, borderColor: theme.cardBorder, overflow: 'hidden' },
                                { height: isGrid3 ? 160 : 200 }
                            ]}
                        >
                            <LinearGradient
                                colors={getGradientColors(item.id)}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <CardDesign />
                            <View style={[
                                styles.iconPlaceholder,
                                {
                                    backgroundColor: 'transparent',
                                    width: isGrid3 ? 80 : 110,
                                    height: isGrid3 ? 80 : 110,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    borderWidth: 2,
                                    borderColor: 'rgba(255,255,255,0.3)',
                                    marginBottom: 10
                                }
                            ]}>
                                <MusicImage
                                    uri={item.coverImage}
                                    id={item.id}
                                    style={{ width: '100%', height: '100%' }}
                                    iconSize={isGrid3 ? 32 : 48}
                                />
                            </View>
                            <MarqueeText
                                text={item.name}
                                style={[
                                    styles.title,
                                    { color: 'white', fontSize: isGrid3 ? 12 : 16, paddingHorizontal: 5 }
                                ]}
                            />
                            <Text
                                style={[
                                    styles.count,
                                    { color: 'rgba(255,255,255,0.8)', fontSize: isGrid3 ? 10 : 13 }
                                ]}
                            >
                                {item.count} Songs
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    }, [theme, navigation, layoutMode]);

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Genres</Text>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        onPress={() => {
                            const { metadataService } = require('../services/MetadataService');
                            metadataService.clearCache();
                            refreshMetadata();
                        }}
                        style={[styles.layoutButton, { marginRight: 10 }]}
                    >
                        <Ionicons name="refresh" size={22} color={theme.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleLayout} style={styles.layoutButton}>
                        <Ionicons
                            name={layoutMode === 'grid3' ? "grid" : (layoutMode === 'grid2' ? "apps" : "list")}
                            size={24}
                            color={theme.primary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                key={layoutMode}
                refreshing={loading}
                onRefresh={refreshMetadata}
                data={genres}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                numColumns={layoutMode === 'grid3' ? 3 : (layoutMode === 'grid2' ? 2 : 1)}
                columnWrapperStyle={layoutMode !== 'list' ? styles.columnWrapper : undefined}
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginVertical: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
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
        borderRadius: 8,
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
    }
});
