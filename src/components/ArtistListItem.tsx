import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';
import { MusicImage } from './MusicImage';
import { MarqueeText } from './MarqueeText';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useArtistImage } from '../hooks/useArtistImage';

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

interface ArtistListItemProps {
    item: {
        id: string;
        name: string;
        coverImage?: string;
        count: number;
    };
    layoutMode: 'list' | 'grid2' | 'grid3';
    onPress: () => void;
}

export const ArtistListItem = memo(({ item, layoutMode, onPress }: ArtistListItemProps) => {
    const { theme } = useTheme();
    const { artistMetadata } = useMusicLibrary() || { artistMetadata: {} };
    const fetchedImage = useArtistImage(item.name);
    const displayImage = artistMetadata[item.name]?.coverImage || fetchedImage || item.coverImage;

    const isGrid3 = layoutMode === 'grid3';
    const isList = layoutMode === 'list';

    return (
        <View style={{ flex: isList ? 1 : (isGrid3 ? 1 / 3 : 1 / 2) }}>
            {isList ? (
                <TouchableOpacity style={styles.listItem} onPress={onPress}>
                    <View style={styles.row}>
                        <View style={[styles.listIconPlaceholder, { backgroundColor: 'transparent' }]}>
                            <MusicImage
                                uri={displayImage}
                                id={item.id}
                                style={{ width: 45, height: 45, borderRadius: 22.5 }}
                                iconSize={20}
                                iconName="person"
                            />
                        </View>
                        <View style={styles.info}>
                            <MarqueeText text={item.name} style={[styles.title, { color: theme.text, textAlign: 'left', fontSize: 16, marginBottom: 2 }]} />
                            <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'left' }]} numberOfLines={1}>
                                {item.count} Songs
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[isGrid3 ? styles.gridItem3 : styles.gridItem2, { width: '100%', maxWidth: '100%' }]}
                    onPress={onPress}
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
                                    marginBottom: 8
                                }
                            ]}
                        >
                            <MusicImage
                                uri={displayImage}
                                id={item.id}
                                style={{ width: '100%', height: '100%' }}
                                containerStyle={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 1000
                                }}
                                iconSize={isGrid3 ? 40 : 50}
                                iconName="person"
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
                            style={{
                                marginTop: 2,
                                color: theme.textSecondary,
                                fontSize: isGrid3 ? 10 : 12,
                                textAlign: 'center',
                                width: '100%'
                            }}
                            numberOfLines={1}
                        >
                            {item.count} Songs
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
        prev.layoutMode === next.layoutMode
    );
});

const styles = StyleSheet.create({
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
    gridItem3: {
        flex: 1,
        maxWidth: '31%',
    },
    gridItem2: {
        flex: 1,
        maxWidth: '48%',
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
    }
});
