import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../hooks/ThemeContext';
import { useLocalMusic } from '../hooks/useLocalMusic';
import { MusicImage } from '../components/MusicImage';
import { GlassCard } from '../components/GlassCard';
import { ArtistListItem } from '../components/ArtistListItem';
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

// Removed local CardDesign as it's now handled by ArtistListItem

export const ArtistsScreen = ({ isEmbedded }: { isEmbedded?: boolean }) => {
    const { theme } = useTheme();
    const { songs } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [layoutMode, setLayoutMode] = useState<'grid2' | 'grid3' | 'list'>('grid3');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 150);
        return () => clearTimeout(handler);
    }, [searchQuery]);

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

        const artistList = Array.from(map.values());

        // Filter by search query
        const filtered = debouncedQuery.trim()
            ? artistList.filter(a => a.name.toLowerCase().includes(debouncedQuery.toLowerCase().trim()))
            : artistList;

        return filtered.sort((a, b) => {
            const aIsUnknown = a.name === 'Unknown Artist';
            const bIsUnknown = b.name === 'Unknown Artist';
            if (aIsUnknown && !bIsUnknown) return -1;
            if (!aIsUnknown && bIsUnknown) return 1;

            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
    }, [songs, debouncedQuery]);



    const toggleLayout = () => {
        if (layoutMode === 'grid3') setLayoutMode('grid2');
        else if (layoutMode === 'grid2') setLayoutMode('list');
        else setLayoutMode('grid3');
    };

    const renderItem = React.useCallback(({ item, index }: { item: any, index: number }) => {
        return (
            <ArtistListItem
                item={item}
                layoutMode={layoutMode}
                onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.name, type: 'artist' })}
            />
        );
    }, [navigation, layoutMode]);

    const content = (
        <View style={{ flex: 1 }}>
            {!isEmbedded && (
                <View style={[styles.header, { marginVertical: 0, paddingVertical: 10, paddingTop: 20 }]}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Artists</Text>
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

            {/* Separate Search Bar Row */}
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
            </View>

            <View style={{ flex: 1 }}>
                <FlatList
                    key={layoutMode}
                    data={artists}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    numColumns={layoutMode === 'grid3' ? 3 : (layoutMode === 'grid2' ? 2 : 1)}
                    columnWrapperStyle={layoutMode !== 'list' ? styles.columnWrapper : undefined}
                    contentContainerStyle={styles.listContent}

                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.textSecondary }}>No artists found.</Text>
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
    }
});
