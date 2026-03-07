import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MarqueeText } from './MarqueeText';
import { PlaylistCollage } from './PlaylistCollage';
import { Song } from '../hooks/useLocalMusic';

interface GenreListItemProps {
    item: {
        id: string;
        name: string;
        count: number;
        songs?: Song[];
    };
    layoutMode: 'list' | 'grid2' | 'grid3';
    onPress: () => void;
}

const getGradientColors = (id: string): [string, string] => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const userColors: [string, string][] = [
        ['#0f172a', '#1e40af'],
        ['#312e81', '#4338ca'],
        ['#581c87', '#7e22ce'],
        ['#701a75', '#a21caf'],
        ['#831843', '#be185d'],
        ['#064e3b', '#065f46'],
        ['#4338ca', '#6366f1'],
        ['#1e1b4b', '#312e81'],
    ];
    return userColors[hash % userColors.length];
};

export const GenreListItem = memo(({ item, layoutMode, onPress }: GenreListItemProps) => {
    const { theme } = useTheme();
    const colors = getGradientColors(item.id);
    const isList = layoutMode === 'list';
    const isGrid3 = layoutMode === 'grid3';

    return (
        <View style={{ flex: isList ? 1 : (isGrid3 ? 1 / 3 : 1 / 2), paddingHorizontal: isList ? 0 : 8, marginBottom: isList ? 0 : 16 }}>
            {isList ? (
                <TouchableOpacity style={styles.listItem} onPress={onPress}>
                    <View style={styles.row}>
                        <View style={styles.listIcon}>
                            <PlaylistCollage
                                songs={item.songs || []}
                                size={56}
                                iconSize={26}
                                iconName="pricetags"
                                borderRadius={12}
                                showBubbles={false}
                                gradientColors={colors}
                            />
                        </View>
                        <View style={styles.info}>
                            <MarqueeText text={item.name} style={[styles.title, { color: theme.text, textAlign: 'left', fontSize: 16 }]} />
                            <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'left' }]}>
                                {item.count} Songs
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={{ width: '100%' }}
                    onPress={onPress}
                    activeOpacity={0.8}
                >
                    <View style={{ width: '100%' }}>
                        <View style={[
                            styles.card,
                            {
                                width: '100%',
                                aspectRatio: 1,
                                borderRadius: 24,
                                elevation: 8,
                                shadowColor: colors[0],
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                            }
                        ]}>
                            <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
                                <PlaylistCollage
                                    songs={item.songs || []}
                                    size="100%"
                                    width="100%"
                                    iconSize={isGrid3 ? 32 : 40}
                                    iconName="pricetags"
                                    gradientColors={colors}
                                    borderRadius={0}
                                    showBubbles={true}
                                />
                            </View>
                        </View>
                        <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
                            <MarqueeText
                                text={item.name}
                                style={{
                                    color: theme.text,
                                    fontSize: isGrid3 ? 13 : 15,
                                    fontWeight: '700',
                                    textAlign: 'center',
                                }}
                            />
                            <Text
                                style={{
                                    marginTop: 1,
                                    color: theme.textSecondary,
                                    fontSize: isGrid3 ? 11 : 12,
                                    textAlign: 'center',
                                    fontWeight: '500'
                                }}
                            >
                                {item.count} Songs
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
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
    listIcon: {
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    info: {
        flex: 1,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
    },
    card: {
        width: '100%',
        aspectRatio: 1,
    }
});
