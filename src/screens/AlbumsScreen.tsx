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

export const AlbumsScreen = () => {
    const { theme } = useTheme();
    const { songs } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [layoutMode, setLayoutMode] = useState<'grid2' | 'grid3' | 'list'>('grid3');

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
                    coverImage: song.coverImage,
                    count: 0
                });
            } else if (!map.get(albumName).coverImage && song.coverImage) {
                map.get(albumName).coverImage = song.coverImage;
            }
            map.get(albumName).count++;
        });

        return Array.from(map.values()).sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            const aIsLetter = /^[a-z]/.test(aName);
            const bIsLetter = /^[a-z]/.test(bName);

            if (aIsLetter && !bIsLetter) return -1;
            if (!aIsLetter && bIsLetter) return 1;
            return aName.localeCompare(bName);
        });
    }, [songs]);

    const flatListRef = React.useRef<FlatList>(null);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

    const scrollToAlphabet = (letter: string) => {
        let index = -1;
        if (letter === '#') {
            index = albums.findIndex(a => !/^[a-zA-Z]/.test(a.name));
        } else {
            // Find the first album whose name is >= this letter, but still starts with a letter
            index = albums.findIndex(a => {
                const name = a.name.toUpperCase();
                return /^[A-Z]/.test(name) && name >= letter;
            });
        }

        if (index !== -1 && index < albums.length) {
            try {
                flatListRef.current?.scrollToIndex({
                    index: index,
                    animated: true,
                    viewPosition: 0
                });
            } catch (e) {
                console.warn('[AlbumsScreen] Scroll failed:', e);
            }
        }
    };

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
                        onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'album' })}
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
                        style={[isGrid3 ? styles.gridItem3 : styles.gridItem2, { width: '100%', maxWidth: '100%' }]}
                        onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'album' })}
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
    }, [theme, navigation, layoutMode]);

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Albums</Text>
                </View>

                <TouchableOpacity onPress={toggleLayout} style={styles.layoutButton}>
                    <Ionicons
                        name={layoutMode === 'grid3' ? "grid" : (layoutMode === 'grid2' ? "apps" : "list")}
                        size={24}
                        color={theme.primary}
                    />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, position: 'relative' }}>
                <View style={{ flex: 1, flexDirection: 'row' }}>
                    <FlatList
                        ref={flatListRef}
                        key={layoutMode}
                        style={{ flex: 1 }} // Force FlatList to take available width
                        data={albums}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        numColumns={layoutMode === 'list' ? 1 : (layoutMode === 'grid3' ? 3 : 2)}
                        columnWrapperStyle={layoutMode !== 'list' ? styles.columnWrapper : undefined}
                        contentContainerStyle={styles.listContent}

                        ListEmptyComponent={
                            <View style={styles.center}>
                                <Text style={{ color: theme.textSecondary }}>No albums found.</Text>
                            </View>
                        }
                        showsVerticalScrollIndicator={false}
                        onScrollToIndexFailed={(info) => {
                            setTimeout(() => {
                                if (flatListRef.current) {
                                    flatListRef.current.scrollToIndex({
                                        index: info.index,
                                        animated: true,
                                        viewPosition: 0
                                    });
                                }
                            }, 150);
                        }}
                    />

                    {/* Alphabet Sidebar */}
                    <View style={styles.alphabetSidebar}>
                        {alphabet.map((letter) => (
                            <TouchableOpacity
                                key={letter}
                                onPress={() => scrollToAlphabet(letter)}
                                style={styles.alphabetLetter}
                            >
                                <Text style={[styles.alphabetText, { color: theme.textSecondary }]}>
                                    {letter}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
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
        paddingLeft: 15,
        paddingRight: 35, // Space for sidebar
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
    }
});
