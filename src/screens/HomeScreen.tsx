import React, { useMemo, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Keyboard, FlatList, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    withSpring,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    interpolate,
    useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { MusicImage } from '../components/MusicImage';
import { MarqueeText } from '../components/MarqueeText';
import { useArtistImage } from '../hooks/useArtistImage';
import { useTheme } from '../hooks/ThemeContext';
import { useLibraryStore, Song } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { FlashList } from '@shopify/flash-list';
import { SongItem } from '../components/SongItem';
import { SongOptionsMenu } from '../components/SongOptionsMenu';
import { EditSongModal } from '../components/EditSongModal';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { useHomeSettings } from '../hooks/HomeSettingsContext';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import { PlaylistCollage } from '../components/PlaylistCollage';

import { SafeAnimatedFlashList } from '../components/SafeAnimatedFlashList';


const COLLECTIONS = [
    { id: 'liked', name: 'Liked Songs', icon: 'heart', params: { id: 'liked', name: 'Liked Songs', type: 'playlist' } },
    { id: 'most_played', name: 'Most Played', icon: 'trending-up', params: { id: 'most_played', name: 'Most Played', type: 'most_played' } },
];

const FAVORITES_LIST = [
    { id: 'liked', name: 'Liked Songs', icon: 'heart', params: { id: 'liked', name: 'Liked Songs', type: 'playlist' } },
    { id: 'most_played', name: 'Most Played', icon: 'trending-up', params: { id: 'most_played', name: 'Most Played', type: 'most_played' } },
];

const PLAYLISTS_LIST = [
    { id: 'playlists', name: 'Playlists', icon: 'library', params: { id: 'Playlists', name: 'Playlists', type: 'playlist' } },
];

const getGradientColors = (id: string, themeType: string): [string, string] => {
    const isLight = themeType === 'light';
    switch (id) {
        case 'Songs': return isLight ? ['#e0f2fe', '#bae6fd'] : ['#0f172a', '#1e3a8a'];
        case 'Albums': return isLight ? ['#fdf4ff', '#f5d0fe'] : ['#4a044e', '#701a75'];
        case 'Artists': return isLight ? ['#fff7ed', '#ffedd5'] : ['#7c2d12', '#9a3412'];
        case 'Genres': return isLight ? ['#ecfdf5', '#d1fae5'] : ['#064e3b', '#065f46'];
        case 'Years': return isLight ? ['#f8fafc', '#e2e8f0'] : ['#1e293b', '#64748b'];
        case 'most_played': return isLight ? ['#faf5ff', '#f3e8ff'] : ['#1a0333', '#2e0854'];
        case 'liked': return isLight ? ['#fff1f2', '#ffe4e6'] : ['#2a0311', '#4c0519'];
        case 'recently_played': return isLight ? ['#fffaf0', '#ffedd5'] : ['rgba(66, 32, 6, 0.5)', 'rgba(133, 77, 14, 0.35)'];
        case 'recently_added': return isLight ? ['#eff6ff', '#dbeafe'] : ['rgba(23, 37, 84, 0.5)', 'rgba(29, 78, 216, 0.35)'];
        case 'never_played': return isLight ? ['#f8fafc', '#f1f5f9'] : ['#020617', '#334155'];
        default: {
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const userColorsLight: [string, string][] = [
                ['#eff6ff', '#dbeafe'],
                ['#f5f3ff', '#ede9fe'],
                ['#faf5ff', '#f3e8ff'],
                ['#fdf2f8', '#fbcfe8'],
                ['#fff1f2', '#ffe4e6'],
                ['#ecfdf5', '#d1fae5']
            ];
            const userColorsDark: [string, string][] = [
                ['#0f172a', '#1e40af'],
                ['#312e81', '#4338ca'],
                ['#581c87', '#7e22ce'],
                ['#701a75', '#a21caf'],
                ['#831843', '#be185d'],
                ['#064e3b', '#065f46'],
            ];
            return isLight ? userColorsLight[hash % userColorsLight.length] : userColorsDark[hash % userColorsDark.length];
        }
    }
};

const HistoryCardDesign = () => null;


const CollectionCollageHeroCard = React.memo(({ item, theme, navigation }: { item: any, theme: any, navigation: any }) => {
    const { themeType } = useTheme();
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const gradientColors = getGradientColors(item.id, themeType);
    const displaySongs = item.songs || [];
    const songCount = displaySongs.length;
    const isLight = themeType === 'light';

    return (
        <TouchableOpacity
            style={styles.heroCardWrapper}
            activeOpacity={0.9}
            onPressIn={() => scale.value = withSpring(0.96)}
            onPressOut={() => scale.value = withSpring(1)}
            onPress={() => {
                const p = item.params as any;
                navigation.navigate('Playlist', {
                    id: p.id,
                    name: p.name,
                    type: p.type
                });
            }}
        >
            <Animated.View style={[
                animatedStyle, 
                styles.heroCardInner,
                isLight && {
                    elevation: 0,
                    shadowOpacity: 0,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                }
            ]}>
                <LinearGradient
                    colors={gradientColors}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                <View style={styles.heroCardContent}>
                    {/* Text on the left */}
                    <View style={styles.heroTextSection}>
                        <Text style={[styles.heroTitle, { color: themeType === 'light' ? '#000' : '#fff' }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={[styles.heroSubtitle, { color: themeType === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.65)' }]} numberOfLines={1}>
                            {songCount > 0 ? `${songCount} tracks` : 'No songs yet'}
                        </Text>
                    </View>

                    {/* Small collage on the right */}
                    <View style={styles.heroArtSection}>
                        <PlaylistCollage
                            songs={displaySongs}
                            size={48}
                            borderRadius={10}
                            showBubbles={false}
                            showIcon={true}
                            hideIconIfHasContent={true}
                            iconName={item.icon || "musical-notes"}
                            iconSize={20}
                            opacity={1}
                            overlayColor="rgba(0,0,0,0.05)"
                        />
                    </View>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
});



const DailyMixCard = React.memo(({ theme, songs, navigation, onPlayMix }: { theme: any, songs: Song[], navigation: any, onPlayMix: (songs: Song[]) => void }) => {
    if (songs.length === 0) return null;
    const [isExpanded, setIsExpanded] = useState(false);
    const { themeType } = useTheme();
    const isLight = themeType === 'light';

    const displaySongs = isExpanded ? songs : songs.slice(0, 4);

    return (
        <View style={styles.dailyMixContainer}>
            <TouchableOpacity 
                style={[
                    styles.dailyMixCard, 
                    { 
                        backgroundColor: isLight ? '#ffffff' : theme.card, 
                        borderColor: isLight ? '#e2e8f0' : theme.border, 
                        borderWidth: 1,
                        elevation: 0,
                        shadowOpacity: 0
                    }
                ]}
                activeOpacity={0.9}
                onPress={() => onPlayMix(songs)}
            >
                <LinearGradient
                    colors={isLight ? ['rgba(241,245,249,0.8)', 'transparent'] : [theme.primary + (theme.background === '#000000' ? '15' : '30'), 'transparent']}
                    style={StyleSheet.absoluteFill}
                />
                
                <View style={styles.dailyMixHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={[styles.dailyMixBadgeContainer, { backgroundColor: isLight ? '#f1f5f9' : theme.primary + '20', borderColor: isLight ? '#e2e8f0' : theme.primary + '40' }]}>
                            <Text style={[styles.dailyMixBadgeText, { color: isLight ? '#0f172a' : theme.primary }]}>DAILY PICK</Text>
                        </View>
                        <Text style={[styles.dailyMixTitle, { color: isLight ? '#0f172a' : theme.text }]}>Fresh Mix</Text>
                        <Text style={[styles.dailyMixSubtitle, { color: isLight ? '#64748b' : theme.textSecondary }]}>Handpicked for today</Text>
                    </View>
                    <TouchableOpacity 
                        style={[
                            styles.dailyMixPlayBtn, 
                            { 
                                backgroundColor: isLight ? '#0f172a' : theme.primary,
                                elevation: isLight ? 0 : 4,
                                shadowOpacity: isLight ? 0 : 0.3,
                            }
                        ]}
                        onPress={() => onPlayMix(songs)}
                    >
                        <Ionicons name="play" size={24} color={isLight ? '#ffffff' : theme.textOnPrimary} style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                </View>

                <View style={styles.dailyMixList}>
                    {displaySongs.map((s, idx) => (
                        <View key={s.id} style={styles.dailyMixSongRow}>
                            <MusicImage 
                                uri={s.coverImage} 
                                id={s.id} 
                                style={styles.dailyMixCover} 
                                iconSize={12} 
                            />
                            <View style={{ flex: 1 }}>
                                <Text numberOfLines={1} style={[styles.dailyMixSongName, { color: theme.text }]}>
                                    {s.title}
                                </Text>
                                <Text numberOfLines={1} style={[styles.dailyMixArtistName, { color: theme.textSecondary }]}>
                                    {s.artist}
                                </Text>
                            </View>
                        </View>
                    ))}
                    {!isExpanded && songs.length > 4 && (
                        <TouchableOpacity 
                            onPress={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                            style={styles.dailyMixMoreBtn}
                        >
                            <Text style={[styles.dailyMixMore, { color: theme.primary }]}>+ {songs.length - 4} more tracks</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
});

const decadeGradients: Record<string, [string, string]> = {
    '2020s': ['#CC0044', '#CC4400'],
    '2010s': ['#0088CC', '#0044BB'],
    '2000s': ['#8800CC', '#CC00CC'],
    '90s': ['#CCAA00', '#CC4400'],
    '80s': ['#00CC66', '#0066AA'],
    'classic': ['#00AA77', '#006699']
};

const decadeGradientsLight: Record<string, [string, string]> = {
    '2020s': ['#ffe4e6', '#fecdd3'],
    '2010s': ['#e0f2fe', '#bae6fd'],
    '2000s': ['#f3e8ff', '#e9d5ff'],
    '90s': ['#fef9c3', '#fef08a'],
    '80s': ['#dcfce7', '#bbf7d0'],
    'classic': ['#ccfbf1', '#99f6e4']
};

const getYearGradient = (year: string, themeType: string): [string, string] => {
    const isLight = themeType === 'light';
    const grads = isLight ? decadeGradientsLight : decadeGradients;
    const y = parseInt(year);
    if (y >= 2020) return grads['2020s'];
    if (y >= 2010) return grads['2010s'];
    if (y >= 2000) return grads['2000s'];
    if (y >= 1990) return grads['90s'];
    if (y >= 1980) return grads['80s'];
    return grads['classic'];
};

const YearMixCard = React.memo(({ item, theme, onPlayMix }: { item: any, theme: any, onPlayMix: (songs: Song[]) => void }) => {
    const { themeType } = useTheme();
    const [isExpanded, setIsExpanded] = React.useState(false);
    const displaySongs = isExpanded ? item.songs.slice(0, 8) : item.songs.slice(0, 3);
    const isLight = themeType === 'light';

    return (
        <TouchableOpacity
            style={[
                styles.yearMixCard, 
                isExpanded && { minHeight: 140, height: 'auto' },
                isLight && {
                    elevation: 0,
                    shadowOpacity: 0,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                }
            ]}
            onPress={() => onPlayMix(item.songs)}
            activeOpacity={0.9}
        >
            <LinearGradient
                colors={getYearGradient(item.year, themeType)}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View style={[styles.yearMixInnerContent, isLight && { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
                <View style={styles.yearMixHeaderSmall}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.yearMixBadgeSmall, isLight && { color: 'rgba(15,23,42,0.6)' }]}>COLLECTION</Text>
                        <Text style={[styles.yearMixTitleSmall, isLight && { color: '#0f172a' }]}>{item.title}</Text>
                    </View>
                    <TouchableOpacity 
                        style={[
                            styles.yearMixPlayBtnSmall, 
                            isLight && { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1, elevation: 0 }
                        ]}
                        onPress={(e) => { e.stopPropagation(); onPlayMix(item.songs); }}
                    >
                        <Ionicons name="play" size={20} color={isLight ? '#0f172a' : '#fff'} />
                    </TouchableOpacity>
                </View>

                {/* Song list in card */}
                <View style={{ marginTop: 15, gap: 10 }}>
                    {displaySongs.map((s: Song) => (
                        <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <MusicImage uri={s.coverImage} id={s.id} style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }} iconSize={12} />
                            <View style={{ flex: 1 }}>
                                <Text numberOfLines={1} style={{ color: isLight ? '#0f172a' : '#fff', fontSize: 13, fontWeight: '800', letterSpacing: -0.2 }}>{s.title}</Text>
                                <Text numberOfLines={1} style={{ color: isLight ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' }}>{s.artist}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }}>
                    <Text style={[styles.yearMixCountSmall, isLight && { color: '#0f172a', opacity: 0.8 }]}>{item.songs.length} tracks from {item.year}</Text>
                    {item.songs.length > 3 && (
                        <TouchableOpacity 
                            onPress={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
                        >
                            <Text style={{ color: isLight ? '#0f172a' : '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>{isExpanded ? 'SEE LESS' : `+ ${item.songs.length - 3} MORE`}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

const FavoriteItemCard = React.memo(({ item, theme, navigation, isHorizontal, isListView, onPlayPress, showIcon = true, hideIconIfHasContent = true }: { item: any, theme: any, navigation: any, isHorizontal?: boolean, isListView?: boolean, onPlayPress?: (item: any) => void, showIcon?: boolean, hideIconIfHasContent?: boolean }) => {
    const { themeType } = useTheme();
    const isLight = themeType === 'light';
    const isArtist = item.type === 'Artist' || (item.params as any)?.type === 'artist';
    const artistImage = useArtistImage(isArtist ? item.name : '');
    const displayImage = isArtist ? artistImage : item.image;

    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    if (isHorizontal) {
        return (
            <TouchableOpacity
                style={styles.favoriteItemWrapper}
                activeOpacity={0.9}
                onPressIn={() => scale.value = withSpring(0.95)}
                onPressOut={() => scale.value = withSpring(1)}
                onPress={() => {
                    const p = item.params as any;
                    navigation.navigate('Playlist', {
                        id: p.id,
                        name: p.name,
                        type: p.type
                    });
                }}
            >
                <Animated.View style={[animatedStyle, { flex: 1 }]}>
                    <View style={styles.favVerticalCard}>
                        <View style={[
                            styles.favVerticalImageContainer,
                            { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' },
                            isArtist && { borderRadius: 55, transform: [{ scale: 0.95 }] },
                            isLight && { borderWidth: 1, borderColor: '#e2e8f0' }
                        ]}>
                            {isArtist ? (
                                <MusicImage
                                    uri={displayImage}
                                    id={item.id}
                                    assetUri={(item as any).assetUri}
                                    style={StyleSheet.absoluteFill}
                                    iconSize={32}
                                    iconName="person"
                                />
                            ) : (
                                <PlaylistCollage
                                    songs={item.songs || []}
                                    size={110}
                                    iconSize={28}
                                    iconName={item.id === 'liked' ? "heart" : (item.id === 'most_played' ? "refresh" : (item.type === 'Album' ? "disc" : "musical-notes"))}
                                    borderRadius={12}
                                    showBubbles={false}
                                    gradientColors={getGradientColors(item.id, themeType)}
                                    forceSingleImage={item.type === 'Album'}
                                    showIcon={showIcon}
                                    hideIconIfHasContent={hideIconIfHasContent}
                                />
                            )}
                        </View>
                        <View style={styles.favVerticalInfo}>
                            <Text style={[styles.favVerticalTitle, { color: theme.text }]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={[styles.favVerticalSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                {isArtist ? 'Artist' : (item.type || 'Library')}
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        );
    }

    if (isListView) {
        return (
            <TouchableOpacity
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: 'rgba(255,255,255,0.05)'
                }}
                activeOpacity={0.7}
                onPress={() => {
                    const p = item.params as any;
                    if (item.id === 'Songs') return navigation.navigate('Songs');
                    if (item.id === 'Albums') return navigation.navigate('Albums');
                    if (item.id === 'Artists') return navigation.navigate('Artists');
                    if (item.id === 'playlists') return navigation.navigate('Playlists' as any);

                    navigation.navigate('Playlist', {
                        id: p.id,
                        name: p.name,
                        type: p.type
                    });
                }}
            >
                <View style={{ marginRight: 15 }}>
                    {isArtist ? (
                        <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: theme.card }}>
                            <MusicImage
                                uri={displayImage}
                                id={item.id}
                                assetUri={(item as any).assetUri}
                                style={StyleSheet.absoluteFill}
                                iconSize={32}
                                iconName="person"
                            />
                        </View>
                    ) : (
                        <PlaylistCollage
                            songs={item.songs || []}
                            size={64}
                            iconSize={30}
                            iconName={
                                item.icon || (
                                    item.id === 'most_played' ? "refresh" :
                                        item.id === 'liked' ? "heart" :
                                            (item.params as any)?.type === 'album' ? "disc" :
                                                (item.params as any)?.type === 'genre' ? "pricetags" :
                                                    "musical-notes"
                                ) as any
                            }
                            borderRadius={12}
                            showBubbles={false}
                            gradientColors={getGradientColors(item.id, themeType)}
                            forceSingleImage={item.type === 'Album' || (item.params as any)?.type === 'album'}
                            showIcon={showIcon}
                            hideIconIfHasContent={hideIconIfHasContent}
                        />
                    )}
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500', marginBottom: 4 }} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }} numberOfLines={1}>
                        {isArtist ? 'Artist' : (item.id === 'liked' ? 'Favorites' :
                            item.id === 'most_played' ? 'Smart Playlist' :
                                ['Songs', 'Albums', 'Artists', 'Genres'].includes(item.id) ? 'Library' : (item.type || 'Playlist'))}
                    </Text>
                </View>
                <TouchableOpacity
                    style={{ padding: 10, marginRight: -5 }}
                    onPress={(e) => {
                        e.stopPropagation();
                        onPlayPress?.(item);
                    }}
                >
                    <Ionicons name="play" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={styles.favoriteItemWrapperGrid}
            activeOpacity={0.9}
            onPressIn={() => scale.value = withSpring(0.95)}
            onPressOut={() => scale.value = withSpring(1)}
            onPress={() => {
                const p = item.params as any;
                if (item.id === 'Songs') return navigation.navigate('Songs');
                if (item.id === 'Albums') return navigation.navigate('Albums');
                if (item.id === 'Artists') return navigation.navigate('Artists');
                if (item.id === 'playlists') return navigation.navigate('Playlists' as any);

                navigation.navigate('Playlist', {
                    id: p.id,
                    name: p.name,
                    type: p.type
                });
            }}
        >
            <Animated.View style={[animatedStyle, { flex: 1 }]}>
                <View style={{ width: '100%', alignItems: 'center' }}>
                    <View style={[
                        {
                            width: 95,
                            height: 95,
                            borderRadius: isArtist ? 1000 : 24,
                            overflow: 'hidden',
                            backgroundColor: theme.card,
                            elevation: 0,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0,
                            shadowRadius: 0,
                            borderWidth: isLight ? 1 : 0,
                            borderColor: isLight ? '#e2e8f0' : 'transparent',
                            marginBottom: 8
                        }
                    ]}>
                        {!isArtist ? (
                             <PlaylistCollage
                                songs={item.songs || []}
                                size={95}
                                iconSize={26}
                                iconName={item.id === 'liked' ? "heart" : (item.id === 'most_played' ? "refresh" : (item.type === 'Album' ? "disc" : "musical-notes"))}
                                borderRadius={0}
                                showBubbles={false}
                                gradientColors={getGradientColors(item.id, themeType)}
                                showIcon={showIcon}
                                hideIconIfHasContent={hideIconIfHasContent}
                            />
                        ) : (
                             <MusicImage
                                uri={displayImage}
                                id={item.id}
                                style={StyleSheet.absoluteFill}
                                iconSize={40}
                                iconName="person"
                            />
                        )}
                    </View>
                    <Text style={{ color: theme.text, fontSize: 11, fontWeight: 'bold', textAlign: 'center', width: '100%' }} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 10, marginTop: 1, textAlign: 'center', width: '100%' }} numberOfLines={1}>
                         {isArtist ? 'Artist' : (item.type || 'Playlist')}
                    </Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
});

const HistoryPlaylistCard = React.memo(({
    item,
    onPress,
    onPlayPress,
    onShufflePress
}: {
    item: any,
    onPress: () => void,
    onPlayPress?: () => void,
    onShufflePress?: () => void
}) => {
    const { themeType } = useTheme();
    const isLight = themeType === 'light';

    return (
        <TouchableOpacity 
            style={[
                styles.historyCard,
                isLight && {
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    elevation: 0,
                    shadowOpacity: 0
                }
            ]} 
            onPress={onPress} 
            activeOpacity={0.9}
        >
            <View style={[styles.historyImageContainer, { backgroundColor: item.color, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
                <View style={StyleSheet.absoluteFill}>
                    <PlaylistCollage
                        songs={item.songs || []}
                        size={143}
                        width={150}
                        iconName={item.icon || "musical-notes"}
                        iconSize={44}
                        borderRadius={0}
                        opacity={isLight ? 0.25 : 0.35}
                        showBubbles={true}
                        overlayColor="transparent"
                        showIcon={true}
                        hideIconIfHasContent={true}
                    />
                </View>
            </View>
            <View style={[styles.historyInfoContainer, { backgroundColor: item.cardColor || (isLight ? '#ffffff' : '#1a1a1a') }]}>
                <Text style={[styles.historyTitle, { color: isLight ? '#0f172a' : '#fff' }]} numberOfLines={1}>{item.title}</Text>

                <View style={styles.historyStatsRow}>
                    <View style={styles.historyActionGroup}>
                        <TouchableOpacity
                            style={[
                                styles.historyActionBtn, 
                                { backgroundColor: isLight ? '#f1f5f9' : '#fff' },
                                isLight && { borderWidth: 1, borderColor: '#e2e8f0', elevation: 0, shadowOpacity: 0 }
                            ]}
                            onPress={(e) => { e.stopPropagation(); onPlayPress?.(); }}
                        >
                            <Ionicons name="play" size={16} color={isLight ? '#0f172a' : '#000'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.historyActionBtn, 
                                { marginLeft: 8, backgroundColor: isLight ? '#f1f5f9' : '#fff' },
                                isLight && { borderWidth: 1, borderColor: '#e2e8f0', elevation: 0, shadowOpacity: 0 }
                            ]}
                            onPress={(e) => { e.stopPropagation(); onShufflePress?.(); }}
                        >
                            <Ionicons name="shuffle" size={16} color={isLight ? '#0f172a' : '#000'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const TopAlbumCard = React.memo(({ album, appTheme, onPress }: any) => {
    if (!album) return null;

    return (
        <TouchableOpacity style={styles.topAlbumCard} onPress={() => onPress(album)}>
            <View style={styles.topAlbumImageContainer}>
                <MusicImage
                    uri={album.coverImage}
                    id={album.name}
                    style={StyleSheet.absoluteFill}
                    iconSize={44}
                />
            </View>
            <Text style={[styles.topAlbumName, { color: appTheme?.text || '#fff', fontSize: 15 }]} numberOfLines={1}>
                {album.name}
            </Text>
            <Text style={[styles.topAlbumSub, { color: appTheme?.textSecondary || '#aaa', fontSize: 13 }]} numberOfLines={1}>
                {album.artist}
            </Text>
        </TouchableOpacity>
    );
});

const SmartPlaylistCard = React.memo(({
    item,
    onPress,
    onPlayPress,
    onShufflePress,
    isSmall = false
}: {
    item: any,
    onPress: (item: any) => void,
    onPlayPress?: (item: any) => void,
    onShufflePress?: (item: any) => void,
    isSmall?: boolean
}) => {
    const { themeType, theme } = useTheme();
    const isLight = themeType === 'light';
    const cardSize = isSmall ? 140 : 160;

    return (
        <TouchableOpacity
            style={{
                width: cardSize,
                height: cardSize,
                borderRadius: 24,
                overflow: 'hidden',
                marginRight: 15,
                backgroundColor: isLight ? '#ffffff' : 'rgba(255,255,255,0.05)',
                justifyContent: 'flex-end',
                borderColor: isLight ? '#e2e8f0' : theme.cardBorder,
                borderWidth: isLight ? 1 : 0,
                elevation: 0,
                shadowOpacity: 0
            }}
            onPress={() => onPress(item)}
            activeOpacity={0.9}
        >
            <View style={StyleSheet.absoluteFill}>
                <PlaylistCollage
                    songs={item.songs || []}
                    collageSongs={item.collageSongs}
                    size={cardSize}
                    width={cardSize}
                    iconSize={isSmall ? 28 : 38}
                    iconName={item.icon || "musical-notes"}
                    borderRadius={0}
                    opacity={isLight ? 0.45 : 0.8}
                    showBubbles={false}
                    showIcon={true}
                    hideIconIfHasContent={true}
                />
            </View>

            {isLight ? (
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: cardSize,
                        backgroundColor: 'rgba(255,255,255,0.65)',
                        justifyContent: 'flex-end',
                    }}
                />
            ) : (
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: cardSize * 0.6,
                    }}
                />
            )}

            <View style={{
                position: 'absolute',
                top: 8,
                right: 8,
                flexDirection: 'row',
            }}>
                <TouchableOpacity
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 6,
                        borderWidth: isLight ? 1 : 0,
                        borderColor: '#e2e8f0',
                        elevation: isLight ? 1 : 0,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isLight ? 0.05 : 0,
                        shadowRadius: 1,
                    }}
                    onPress={(e) => { e.stopPropagation(); onPlayPress?.(item); }}
                >
                    <Ionicons name="play" size={14} color={isLight ? '#0f172a' : '#fff'} style={{ marginLeft: 2 }} />
                </TouchableOpacity>
            </View>

            <View style={{ padding: 12 }}>
                <Text style={{ color: isLight ? '#0f172a' : '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 2 }} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={{ color: isLight ? '#64748b' : 'rgba(255,255,255,0.7)', fontSize: 11 }} numberOfLines={1}>
                    {item.count || (item.songs?.length ?? 0)} songs
                </Text>
            </View>
        </TouchableOpacity>
    );
});

const TopSongItem = React.memo(({ song, index, isPlaying, onPress, appTheme }: { song: Song, index: number, isPlaying: boolean, onPress: (index: number) => void, appTheme: any }) => {
    const { themeType } = useTheme();
    const isLight = themeType === 'light';
    const formattedIndex = String(index + 1).padStart(2, '0');

    return (
        <TouchableOpacity 
            style={[
                styles.topSongItem,
                isLight && {
                    borderBottomWidth: 1,
                    borderBottomColor: '#f1f5f9',
                    paddingBottom: 10,
                    marginBottom: 10,
                }
            ]} 
            onPress={() => onPress(index)}
        >
            <Text style={[
                styles.topSongIndex,
                { color: isLight ? '#94a3b8' : appTheme.textSecondary }
            ]}>
                {formattedIndex}
            </Text>
            <View style={styles.topSongImageContainer}>
                <MusicImage
                    uri={song.coverImage}
                    id={song.id}
                    style={StyleSheet.absoluteFill}
                    iconSize={20}
                />
                {isPlaying && (
                    <View style={styles.playingOverlay}>
                        <Ionicons name="play" size={16} color="#fff" />
                    </View>
                )}
            </View>
            <View style={styles.topSongInfo}>
                <Text style={[styles.topSongTitle, { color: appTheme.text }]} numberOfLines={1}>{song.title}</Text>
                <Text style={[styles.topSongSubtitle, { color: appTheme.textSecondary }]} numberOfLines={1}>
                    {song.artist}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

const TopArtistCard = React.memo(({ artist, appTheme, onPress, customImage }: any) => {
    if (!artist) return null;
    const artistImage = useArtistImage(artist.name);

    return (
        <TouchableOpacity style={styles.topArtistCard} onPress={() => onPress(artist)}>
            <View style={styles.topArtistImageContainer}>
                <MusicImage
                    uri={customImage || artistImage || artist.coverImage}
                    id={artist.name || 'unknown_artist'}
                    style={StyleSheet.absoluteFill}
                    iconSize={40}
                    iconName="person"
                />
            </View>
            <Text style={[styles.topArtistName, { color: appTheme?.text || '#fff' }]} numberOfLines={1}>
                {artist.name}
            </Text>
            <Text style={[styles.topArtistSub, { color: appTheme?.textSecondary || '#aaa' }]} numberOfLines={1}>
                {artist.songCount || 0} Songs
            </Text>
        </TouchableOpacity>
    );
});

export const HomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isLandscape = windowWidth > windowHeight;
    const { theme: appTheme, themeType } = useTheme();
    const songs = useLibraryStore(state => state.songs);
    const loading = useLibraryStore(state => state.loading);
    const savedFolders = useLibraryStore(state => state.savedFolders);
    const topArtists = useLibraryStore(state => state.topArtists);
    const recentlyPlayed = useLibraryStore(state => state.recentlyPlayed);
    const recentlyAdded = useLibraryStore(state => state.recentlyAdded);
    const neverPlayed = useLibraryStore(state => state.neverPlayed);
    const artistMetadata = useLibraryStore(state => state.artistMetadata);
    const incrementPlayCount = useLibraryStore(state => state.incrementPlayCount);
    const updateSongMetadata = useLibraryStore(state => state.updateSongMetadata);
    const playlists = useLibraryStore(state => state.playlists);
    const favoriteArtists = useLibraryStore(state => state.favoriteArtists);
    const favoriteAlbums = useLibraryStore(state => state.favoriteAlbums);
    const favoriteGenres = useLibraryStore(state => state.favoriteGenres);
    const favoriteSpecialPlaylists = useLibraryStore(state => state.favoriteSpecialPlaylists);
    const likedSongs = useLibraryStore(state => state.likedSongs);
    const playSongInPlaylist = usePlayerStore(state => state.playSongInPlaylist);
    const currentSong = usePlayerStore(state => state.currentTrack);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const { sectionVisibility, sectionOrder } = useHomeSettings();
    const dailyStats = useLibraryStore(state => state.dailyStats);

    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const allFavorites = useMemo(() => {

        const favAlbumsSet = new Set(favoriteAlbums || []);
        const favGenresSet = new Set(favoriteGenres || []);
        const favArtistsSet = new Set(favoriteArtists || []);

        const albumSongsMap = new Map<string, Song[]>();
        const genreSongsMap = new Map<string, Song[]>();
        const artistImageMap = new Map<string, string>();
        const albumImageMap = new Map<string, string>();
        const genreImageMap = new Map<string, string>();

        // SINGLE O(N) pass to gather all required assets and arrays
        for (const s of (songs || [])) {
            if (s.album && favAlbumsSet.has(s.album)) {
                let arr = albumSongsMap.get(s.album);
                if (!arr) { arr = []; albumSongsMap.set(s.album, arr); }
                arr.push(s);
                if (!albumImageMap.has(s.album) && s.coverImage) albumImageMap.set(s.album, s.coverImage);
            }
            if (s.genre && favGenresSet.has(s.genre)) {
                let arr = genreSongsMap.get(s.genre);
                if (!arr) { arr = []; genreSongsMap.set(s.genre, arr); }
                arr.push(s);
                if (!genreImageMap.has(s.genre) && s.coverImage) genreImageMap.set(s.genre, s.coverImage);
            }
            if (s.artist && favArtistsSet.has(s.artist)) {
                if (!artistImageMap.has(s.artist) && s.coverImage) artistImageMap.set(s.artist, s.coverImage);
            }
        }

        const favoritedPlaylists = (playlists || []).filter(p => p.isFavorite).map(p => ({
            id: p.id,
            name: p.name,
            type: 'Playlist',
            songs: p.songs,
            image: p.songs && p.songs.length > 0 ? p.songs[0].coverImage : null,
            screen: 'Playlist',
            params: { id: p.id, name: p.name, type: 'playlist' }
        }));

        const favArtists = (favoriteArtists || []).map(artist => ({
            id: `artist:${artist}`,
            name: artist,
            type: 'Artist',
            image: artistImageMap.get(artist) || null,
            screen: 'Playlist',
            params: { id: artist, name: artist, type: 'artist' }
        }));

        const favAlbums = (favoriteAlbums || []).map(album => ({
            id: `album:${album}`,
            name: album,
            type: 'Album',
            image: albumImageMap.get(album) || null,
            songs: albumSongsMap.get(album) || [],
            screen: 'Playlist',
            params: { id: album, name: album, type: 'album' }
        }));

        const favGenres = (favoriteGenres || []).map(genre => ({
            id: `genre:${genre}`,
            name: genre,
            type: 'Genre',
            image: genreImageMap.get(genre) || null,
            songs: genreSongsMap.get(genre) || [],
            screen: 'Playlist',
            params: { id: genre, name: genre, type: 'genre' }
        }));

        // Items from library, excluding Liked/Most Played as they are now in Collections grid
        return [...favoritedPlaylists, ...favArtists, ...favAlbums, ...favGenres];
    }, [playlists, favoriteArtists, favoriteAlbums, favoriteGenres, songs]);

    const favoriteChunks = useMemo(() => {
        const chunks = [];
        for (let i = 0; i < allFavorites.length; i += 2) {
            chunks.push(allFavorites.slice(i, i + 2));
        }
        return chunks;
    }, [allFavorites]);

    const homePlaylists = useMemo(() => {
        return PLAYLISTS_LIST.filter(item => {
            if (item.id === 'playlists') return sectionVisibility.playlists;
            return true;
        });
    }, [sectionVisibility.playlists]);

    const displayUserPlaylists = useMemo(() => {
        const PLAYLIST_COLORS = ['#4c1d95', '#1e3a8a', '#064e3b', '#7c2d12', '#4a044e', '#1e293b'];
        const getPlaylistColor = (id: string) => {
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return PLAYLIST_COLORS[hash % PLAYLIST_COLORS.length];
        };

        return (playlists || []).map(p => ({
            id: p.id,
            title: p.name,
            type: 'playlist',
            collageSongs: p.songs.slice(0, 4),
            coverSong: p.songs[0],
            songs: p.songs,
            count: p.songs.length,
            color: getPlaylistColor(p.id),
            cardColor: 'rgba(255,255,255,0.05)',
            icon: 'musical-notes'
        }));
    }, [playlists]);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [deferredQuery, setDeferredQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState<Song[]>([]);

    // Modal States
    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    const searchInputRef = useRef<TextInput>(null);

    const sortedMostPlayed = useMemo(() => {
        const peakCounts = new Map<string, number>();
        Object.values(dailyStats).forEach(day => {
            if (!day.playsPerSong) return;
            Object.entries(day.playsPerSong).forEach(([id, count]) => {
                const currentPeak = peakCounts.get(id) || 0;
                if (count > currentPeak) peakCounts.set(id, count);
            });
        });

        return songs
            .filter(s => (s.playCount || 0) >= 5)
            .sort((a, b) => {
                const pA = peakCounts.get(a.id) || 0;
                const pB = peakCounts.get(b.id) || 0;
                if (pB !== pA) return pB - pA;
                const cA = a.playCount || 0;
                const cB = b.playCount || 0;
                if (cB !== cA) return cB - cA;
                return (a.title || '').localeCompare(b.title || '');
            })
            .slice(0, 50);
    }, [songs, dailyStats]);

    const sortedTopSongs = useMemo(() => {
        const played: Song[] = [];
        const unplayed: Song[] = [];
        for (const s of (songs || [])) {
            if ((s.playCount || 0) > 0) played.push(s);
            else if (unplayed.length < 10) unplayed.push(s);
        }
        played.sort((a, b) => {
            const countA = a.playCount || 0;
            const countB = b.playCount || 0;
            if (countB !== countA) return countB - countA;
            return (a.title || '').localeCompare(b.title || '');
        });
        return [...played, ...unplayed].slice(0, 10);
    }, [songs]);

    const collectionsWithSongs = useMemo(() => {
        return COLLECTIONS.filter(item => {
            if (item.id === 'liked') return sectionVisibility.likedSongs;
            if (item.id === 'most_played') return sectionVisibility.mostlyPlayed;
            return true;
        }).map(item => {
            if (item.id === 'liked') return { ...item, songs: likedSongs || [] };
            if (item.id === 'most_played') {
                return { ...item, songs: sortedMostPlayed };
            }
            return { ...item, songs: [] };
        });
    }, [sortedMostPlayed, likedSongs, sectionVisibility.likedSongs, sectionVisibility.mostlyPlayed]);

    useEffect(() => {
        const timer = setTimeout(() => setDeferredQuery(searchQuery), 150);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        loadRecentSearches();
    }, []);

    const loadRecentSearches = async () => {
        try {
            const saved = await AsyncStorage.getItem('recentSearches');
            if (saved) setRecentSearches(JSON.parse(saved));
        } catch (e) {
            console.error('Failed to load recent searches');
        }
    };

    const handleVoiceCommand = (command: string) => {
        setSearchQuery(command);
        setIsSearchFocused(true);
    };

    const { isListening, startListening, stopListening, error: voiceError } = useVoiceCommand(handleVoiceCommand);

    const saveSearch = async (song: Song) => {
        try {
            const updated = [song, ...recentSearches.filter(s => s.id !== song.id)].slice(0, 10);
            setRecentSearches(updated);
            await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save search');
        }
    };

    const removeRecentSearch = async (songId: string) => {
        try {
            const updated = recentSearches.filter(s => s.id !== songId);
            setRecentSearches(updated);
            await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to remove recent search');
        }
    };

    const clearRecentSearches = async () => {
        try {
            setRecentSearches([]);
            await AsyncStorage.removeItem('recentSearches');
        } catch (e) {
            console.error('Failed to clear searches');
        }
    };

    const filteredSongs = useMemo(() => {
        const trimmed = deferredQuery.trim().toLowerCase();
        if (!trimmed) return [];

        return songs.filter(s => {
            const title = (s.title ?? '').toLowerCase();
            const artist = (s.artist ?? '').toLowerCase();
            const album = (s.album ?? '').toLowerCase();
            return title.includes(trimmed) || artist.includes(trimmed) || album.includes(trimmed);
        });
    }, [songs, deferredQuery]);

    const handlePlaySong = React.useCallback((song: Song) => {
        // 1. Start playback IMMEDIATELY with just this song — no delay
        playSongInPlaylist([song], 0, "Search Results");
        navigation.navigate('Player', { trackIndex: 0 });
        Keyboard.dismiss();
        setIsSearchFocused(false);

        // 2. Run all non-blocking tasks in background after navigation
        setTimeout(() => {
            // Save to recent searches (async storage, non-blocking)
            saveSearch(song);
            // Increment play count (async storage)
            incrementPlayCount(song.id);

            // 3. If there's a search query, expand the queue to the full filtered results
            if (deferredQuery.trim() && filteredSongs.length > 1) {
                const index = filteredSongs.findIndex(s => s.id === song.id);
                if (index !== -1) {
                    playSongInPlaylist(filteredSongs, index, "Search Results");
                }
            }
        }, 300);
    }, [filteredSongs, playSongInPlaylist, navigation, incrementPlayCount, deferredQuery, saveSearch]);

    const onOpenOptions = React.useCallback((item: Song) => {
        setSelectedSong(item);
        setOptionsModalVisible(true);
    }, []);

    const listeningHistoryPlaylists = useMemo(() => {
        const isLight = themeType === 'light';
        return [
            {
                id: 'recently_played',
                title: 'Recently Played',
                type: 'recently_played',
                collageSongs: recentlyPlayed.slice(0, 4),
                coverSong: recentlyPlayed[0],
                songs: recentlyPlayed,
                count: recentlyPlayed.length,
                color: isLight ? '#ffedd5' : '#1a140a',
                cardColor: isLight ? '#fef3c7' : '#2b2112',
                icon: 'time'
            },
            {
                id: 'recently_added',
                title: 'Recently Added',
                type: 'recently_added',
                collageSongs: recentlyAdded.slice(0, 4),
                coverSong: recentlyAdded[0],
                songs: recentlyAdded,
                count: recentlyAdded.length,
                color: isLight ? '#dbeafe' : '#0a0f1f',
                cardColor: isLight ? '#eff6ff' : '#161d33',
                icon: 'add-circle'
            },
            {
                id: 'never_played',
                title: 'Never Played',
                type: 'never_played',
                collageSongs: neverPlayed.slice(0, 4),
                coverSong: neverPlayed[0],
                songs: neverPlayed,
                count: songs.filter(s => (s.playCount || 0) === 0).length,
                color: isLight ? '#f1f5f9' : '#0a0a0a',
                cardColor: isLight ? '#f8fafc' : '#1a1a1a',
                icon: 'close-circle'
            }
        ];
    }, [recentlyPlayed, recentlyAdded, neverPlayed, themeType]);

    const topSongs = useMemo(() => {
        return sortedTopSongs;
    }, [sortedTopSongs]);

    const displayTopArtists = useMemo(() => {
        if (topArtists && topArtists.length > 0) {
            return topArtists.slice(0, 10);
        }
        if (songs && songs.length > 0) {
            const artistMap = new Map<string, { name: string, songCount: number, coverImage?: string }>();
            for (let i = 0; i < songs.length; i++) {
                const song = songs[i];
                if (!song.artist || song.artist === 'Unknown Artist') continue;
                const existing = artistMap.get(song.artist);
                if (existing) {
                    existing.songCount += 1;
                } else {
                    artistMap.set(song.artist, { name: song.artist, songCount: 1, coverImage: song.coverImage });
                }
            }
            return Array.from(artistMap.values()).sort((a, b) => b.songCount - a.songCount).slice(0, 10);
        }
        return [];
    }, [topArtists, songs]);

    const displayTopAlbums = useMemo(() => {
        if (songs && songs.length > 0) {
            const albumMap = new Map<string, { name: string, artist: string, songCount: number, coverImage?: string }>();
            for (let i = 0; i < songs.length; i++) {
                const song = songs[i];
                if (!song.album || song.album === 'Unknown Album') continue;
                const key = `${song.album}-${song.artist}`;
                const existing = albumMap.get(key);
                if (existing) {
                    existing.songCount += 1;
                } else {
                    albumMap.set(key, {
                        name: song.album,
                        artist: song.artist || 'Unknown Artist',
                        songCount: 1,
                        coverImage: song.coverImage,
                    });
                }
            }
            return Array.from(albumMap.values()).sort((a, b) => b.songCount - a.songCount).slice(0, 10);
        }
        return [];
    }, [songs]);
    const dailyMixSongs = useMemo(() => {
        if (!songs || songs.length === 0) return [];
        const todayStr = new Date().toISOString().split('T')[0];
        // Seeded random based on date
        let seed = todayStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const shuffled = [...songs].sort(() => {
            seed = (seed * 9301 + 49297) % 233280;
            return (seed / 233280) - 0.5;
        });
        return shuffled.slice(0, 10);
    }, [songs]);

    const yearRecommendations = useMemo(() => {
        if (!songs || songs.length === 0) return [];
        const yearMap = new Map<string, Song[]>();
        songs.forEach(s => {
            if (s.year) {
                const y = s.year.toString().trim().slice(0, 4);
                if (y.length === 4 && !isNaN(parseInt(y))) {
                    if (!yearMap.has(y)) yearMap.set(y, []);
                    yearMap.get(y)!.push(s);
                }
            }
        });

        return Array.from(yearMap.entries())
            .filter(([_, yearSongs]) => yearSongs.length >= 3)
            .sort((a, b) => b[0].localeCompare(a[0])) // Most recent years first
            .slice(0, 5)
            .map(([year, yearSongs]) => ({
                id: `year_${year}`,
                title: `Best of ${year}`,
                year,
                songs: yearSongs.sort(() => Math.random() - 0.5).slice(0, 15),
                type: 'year'
            }));
    }, [songs]);

    const handlePlayDailyMix = (mixSongs: Song[]) => {
        if (mixSongs.length > 0) {
            playSongInPlaylist(mixSongs, 0, "Daily Mix");
        }
    };

    const smartMixes: any[] = [];

    const handleClearSearch = () => {
        setSearchQuery('');
        setDeferredQuery('');
        setIsSearchFocused(false);
        Keyboard.dismiss();
    };

    const handleTopSongPress = React.useCallback((index: number) => {
        if (topSongs && topSongs.length > index) {
            playSongInPlaylist(topSongs, index, 'Top Songs');
        }
    }, [topSongs, playSongInPlaylist]);

    const handleTopArtistPress = React.useCallback((artist: any) => {
        navigation.navigate('Playlist', { id: artist.name, name: artist.name, type: 'artist' });
    }, [navigation]);

    const handleSmartPlaylistPress = React.useCallback((item: any) => {
        navigation.navigate('Playlist', { id: item.id, name: item.title, type: item.type as any });
    }, [navigation]);

    const handleSmartPlaylistPlay = React.useCallback((item: any) => {
        let plSongs: Song[] = [];
        if (item.type === 'recently_played') plSongs = recentlyPlayed;
        else if (item.type === 'recently_added') plSongs = recentlyAdded;
        else if (item.type === 'never_played') plSongs = neverPlayed;
        else if (item.type === 'playlist') plSongs = item.songs;

        if (plSongs.length > 0) playSongInPlaylist(plSongs, 0, item.title);
    }, [recentlyPlayed, recentlyAdded, neverPlayed, playSongInPlaylist]);

    const handleSmartPlaylistShuffle = React.useCallback((item: any) => {
        let plSongs: Song[] = [];
        if (item.type === 'recently_played') plSongs = recentlyPlayed;
        else if (item.type === 'recently_added') plSongs = recentlyAdded;
        else if (item.type === 'never_played') plSongs = neverPlayed;
        else if (item.type === 'playlist') plSongs = item.songs;

        if (plSongs.length > 0) {
            const shuffled = [...plSongs].sort(() => Math.random() - 0.5);
            playSongInPlaylist(shuffled, 0, `${item.title} (Shuffled)`);
            navigation.navigate('Player', { trackIndex: 0 });
        }
    }, [recentlyPlayed, recentlyAdded, neverPlayed, playSongInPlaylist, navigation]);


    const renderHeader = () => {
        const isLight = themeType === 'light';
        return (
            <View style={[styles.header, { marginBottom: 15, paddingTop: 15, paddingHorizontal: 15 }]}>


                {/* Inline Search Bar */}
                <View style={[styles.searchBar, { 
                    flex: 1, 
                    marginHorizontal: 10, 
                    marginBottom: 0, 
                    height: 48, 
                    borderRadius: 24, 
                    paddingHorizontal: 16,
                    backgroundColor: isLight ? '#f3f4f6' : appTheme.card, 
                    borderColor: isLight ? '#e5e7eb' : appTheme.cardBorder, 
                    borderWidth: 1,
                    elevation: 0,
                    shadowOpacity: 0
                }]}>
                    <Ionicons name="search" size={20} color={appTheme.textSecondary} />
                    <TextInput
                        ref={searchInputRef}
                        style={[styles.searchInput, { color: appTheme.text, fontSize: 16, marginLeft: 12, fontFamily: 'PlusJakartaSans_500Medium' }]}
                        placeholder={isListening ? "Listening..." : (voiceError ? "Didn't understand, try again" : "Search artists, songs...")}
                        placeholderTextColor={isListening ? appTheme.primary : (voiceError ? '#ef4444' : appTheme.textSecondary)}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setIsSearchFocused(true)}
                        autoCorrect={false}
                    />
                    {(searchQuery.length > 0 || isSearchFocused) ? (
                        <TouchableOpacity onPress={handleClearSearch}>
                            <Ionicons name="close-circle" size={18} color={appTheme.textSecondary} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={isListening ? stopListening : startListening}>
                            <Ionicons
                                name={isListening ? "mic" : "mic-outline"}
                                size={18}
                                color={isListening ? '#ef4444' : appTheme.textSecondary}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Settings Button */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Settings')}
                    style={[styles.settingsButton, { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }]}
                    activeOpacity={0.7}
                >
                    <Ionicons name="settings-outline" size={24} color={appTheme.textSecondary} />
                </TouchableOpacity>
            </View>
        );
    };

    const renderOverviewContent = () => {
        if (!loading && (songs?.length ?? 0) === 0) {
            return (
                <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyStateIconWrap}>
                        <Ionicons name="folder-open-outline" size={72} color={appTheme.primary} />
                    </View>
                    <Text style={[styles.emptyStateTitle, { color: appTheme.text }]}>No Music Yet</Text>
                    <Text style={[styles.emptyStateSubtitle, { color: appTheme.textSecondary }]}>Add music by selecting a folder from Settings</Text>
                </View>
            );
        }

        // Show search results if query exists
        if (searchQuery.trim().length > 0) {
            return (
                <SafeAnimatedFlashList
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    data={filteredSongs}
                    keyExtractor={(item: Song) => item.id}
                    renderItem={({ item, index }: { item: Song, index: number }) => (
                        <SongItem
                            item={item}
                            index={index}
                            isCurrent={currentSong?.id === item.id}
                            theme={appTheme}
                            onPress={handlePlaySong}
                            onOpenOptions={onOpenOptions}
                        />
                    )}
                    estimatedItemSize={70}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="search-outline" size={48} color={appTheme.textSecondary} style={{ marginTop: 60, opacity: 0.3 }} />
                            <Text style={{ color: appTheme.textSecondary, marginTop: 10 }}>No results for "{searchQuery}"</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 220 }}
                />
            );
        }

        // Show recent searches if bar is focused but empty
        if (isSearchFocused && recentSearches.length > 0) {
            return (
                <SafeAnimatedFlashList
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    data={recentSearches}
                    keyExtractor={(item: Song) => `recent-${item.id}`}
                    renderItem={({ item, index }: { item: Song, index: number }) => (
                        <View style={styles.recentItemContainer}>
                            <View style={{ flex: 1 }}>
                                <SongItem
                                    item={item}
                                    index={index}
                                    isCurrent={false}
                                    theme={appTheme}
                                    onPress={handlePlaySong}
                                    onOpenOptions={onOpenOptions}
                                />
                            </View>
                            <TouchableOpacity onPress={() => removeRecentSearch(item.id)} style={styles.removeRecentBtn}>
                                <Ionicons name="close" size={20} color={appTheme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListHeaderComponent={
                        <View style={styles.recentHeader}>
                            <Text style={[styles.recentTitle, { color: appTheme.text }]}>Recent Searches</Text>
                            <TouchableOpacity onPress={clearRecentSearches}>
                                <Text style={[styles.clearText, { color: appTheme.primary }]}>Clear All</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    estimatedItemSize={70}
                    contentContainerStyle={{ paddingBottom: 220 }}
                />
            );
        }



        // Default overview
        const renderSection = (section: string) => {
            switch (section) {
                case 'collections':
                    if (!sectionVisibility.collections || collectionsWithSongs.length === 0) return null;
                    return (
                        <View key="collections" style={[styles.heroGrid, { marginTop: 10 }, isLandscape && { justifyContent: 'center', gap: 20 }]}>
                            {collectionsWithSongs.map((item) => (
                                <View key={item.id} style={isLandscape ? { width: 280 } : { width: '48%' }}>
                                    <CollectionCollageHeroCard item={item} theme={appTheme} navigation={navigation} />
                                </View>
                            ))}
                        </View>
                    );
                case 'yearMix':
                    if (!sectionVisibility.yearMix || yearRecommendations.length === 0) return null;
                    return (
                        <React.Fragment key="yearMix">
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Memory Lane</Text>
                            </View>
                            <FlatList
                                data={yearRecommendations}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 25 }}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <YearMixCard
                                        item={item}
                                        theme={appTheme}
                                        onPlayMix={(s) => playSongInPlaylist(s, 0, item.title)}
                                    />
                                )}
                            />
                        </React.Fragment>
                    );
                case 'dailyMix':
                    if (!sectionVisibility.dailyMix) return null;
                    return (
                        <DailyMixCard 
                            key="dailyMix"
                            theme={appTheme} 
                            songs={dailyMixSongs} 
                            navigation={navigation} 
                            onPlayMix={handlePlayDailyMix}
                        />
                    );
                case 'favorites':
                    if (!sectionVisibility.favorites || allFavorites.length === 0) return null;
                    return (
                        <React.Fragment key="favorites">
                            <View style={[styles.sectionHeader, { marginBottom: 12, marginTop: 10 }]}>
                                <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Favorites</Text>
                            </View>
                            <FlatList
                                data={allFavorites.slice(0, 5)}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 15 }}
                                decelerationRate="fast"
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <View style={{ width: 115, marginRight: 15 }}>
                                        <FavoriteItemCard
                                            item={item}
                                            theme={appTheme}
                                            navigation={navigation}
                                        />
                                    </View>
                                )}
                            />
                        </React.Fragment>
                    );
                case 'playlists':
                    if (!sectionVisibility.playlists || displayUserPlaylists.length === 0) return null;
                    return (
                        <React.Fragment key="playlists">
                            <View style={[styles.sectionHeader, { marginBottom: 12, marginTop: 10 }]}>
                                <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Playlists</Text>
                            </View>
                            <FlatList
                                data={displayUserPlaylists}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 15 }}
                                decelerationRate="fast"
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <SmartPlaylistCard
                                        item={item}
                                        isSmall
                                        onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.title, type: 'playlist' })}
                                        onPlayPress={handleSmartPlaylistPlay}
                                        onShufflePress={handleSmartPlaylistShuffle}
                                    />
                                )}
                            />
                        </React.Fragment>
                    );
                case 'history':
                    if (!sectionVisibility.history || listeningHistoryPlaylists.length === 0) return null;
                    return (
                        <React.Fragment key="history">
                            <View style={[styles.sectionHeader, { marginBottom: 16, marginTop: 10 }]}>
                                <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Listening History</Text>
                            </View>
                            <FlatList
                                data={listeningHistoryPlaylists}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 25 }}
                                decelerationRate="fast"
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <HistoryPlaylistCard
                                        item={item}
                                        onPress={() => navigation.navigate('Playlist', { id: item.id, name: item.title, type: item.type } as any)}
                                        onPlayPress={() => {
                                            if (item.songs && item.songs.length > 0) {
                                                playSongInPlaylist(item.songs, 0, item.title);
                                                navigation.navigate('Player', { trackIndex: 0 });
                                            }
                                        }}
                                        onShufflePress={() => {
                                            if (item.songs && item.songs.length > 0) {
                                                const shuffled = [...item.songs].sort(() => Math.random() - 0.5);
                                                playSongInPlaylist(shuffled, 0, item.title);
                                                navigation.navigate('Player', { trackIndex: 0 });
                                            }
                                        }}
                                    />
                                )}
                            />
                        </React.Fragment>
                    );
                case 'topSongs':
                    if (!sectionVisibility.topSongs) return null;
                    return (
                        <React.Fragment key="topSongs">
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Top Songs</Text>
                            </View>
                            <View style={styles.topSongsContainer}>
                                {topSongs.map((song, index) => (
                                    <TopSongItem
                                        key={song.id}
                                        song={song}
                                        index={index}
                                        isPlaying={currentSong?.id === song.id && isPlaying}
                                        appTheme={appTheme}
                                        onPress={handleTopSongPress}
                                    />
                                ))}
                            </View>
                        </React.Fragment>
                    );
                case 'topAlbums':
                    if (!sectionVisibility.topAlbums || displayTopAlbums.length === 0) return null;
                    return (
                        <React.Fragment key="topAlbums">
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Top Albums</Text>
                            </View>
                            <FlatList
                                data={displayTopAlbums}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 25 }}
                                decelerationRate="fast"
                                keyExtractor={(album) => `${album.name}-${album.artist}`}
                                renderItem={({ item: album }) => (
                                    <TopAlbumCard
                                        album={album}
                                        appTheme={appTheme}
                                        onPress={(alb: any) => navigation.navigate('Playlist', { id: alb.name, name: alb.name, type: 'album' })}
                                    />
                                )}
                            />
                        </React.Fragment>
                    );
                case 'topArtists':
                    if (!sectionVisibility.topArtists || displayTopArtists.length === 0) return null;
                    return (
                        <React.Fragment key="topArtists">
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: appTheme.text }]}>Top Artists</Text>
                            </View>
                            <FlatList
                                data={displayTopArtists}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 25 }}
                                decelerationRate="fast"
                                keyExtractor={(artist) => artist.name}
                                renderItem={({ item: artist }) => (
                                    <TopArtistCard
                                        artist={artist}
                                        appTheme={appTheme}
                                        customImage={artistMetadata[artist.name]?.coverImage}
                                        onPress={handleTopArtistPress}
                                    />
                                )}
                            />
                        </React.Fragment>
                    );
                default:
                    return null;
            }
        };

        return (
            <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: isLandscape ? 120 : 220 }}
            >
                {sectionOrder.map(section => renderSection(section))}


            </Animated.ScrollView>
        );
    };


    return (
        <ScreenContainer variant="default">
            {renderHeader()}
            {renderOverviewContent()}

            <SongOptionsMenu
                visible={optionsModalVisible}
                onClose={() => setOptionsModalVisible(false)}
                song={selectedSong}
                onRequestPlaylistAdd={() => {
                    setOptionsModalVisible(false);
                    setTimeout(() => setPlaylistModalVisible(true), 100);
                }}
                onEditDetails={() => {
                    setOptionsModalVisible(false);
                    setTimeout(() => setEditModalVisible(true), 100);
                }}
            />

            <EditSongModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                song={selectedSong}
                onSave={updateSongMetadata}
            />

            <AddToPlaylistModal
                visible={playlistModalVisible}
                onClose={() => setPlaylistModalVisible(false)}
                songs={selectedSong ? [selectedSong] : []}
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
        paddingTop: 20,
        marginBottom: 20,
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLogo: {
        width: 32,
        height: 32,
        borderRadius: 8,
        marginRight: 10,
    },
    logoGlow: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    appNameTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    settingsButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    identifyButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    identifyGlow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    searchBar: {
        flexDirection: 'row',
        height: 50,
        borderRadius: 25,
        marginHorizontal: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        paddingVertical: 0,
        height: '100%',
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    favoritesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    historyCard: {
        width: 150,
        height: 220,
        borderRadius: 24,
        overflow: 'hidden',
        marginRight: 15,
    },
    historyCardSmall: {
        width: 130,
        height: 180,
        borderRadius: 24,
        overflow: 'hidden',
        marginRight: 15,
    },
    historyImageContainer: {
        height: '65%',
        width: '100%',
    },
    historyInfoContainer: {
        height: '35%',
        padding: 12,
        justifyContent: 'center',
    },
    historyTitle: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        marginBottom: 8,
    },
    historyStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    historyActionGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    heroGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    heroCardWrapper: {
        width: '100%',
        height: 64,
    },
    heroCardInner: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        borderWidth: 0,
        borderColor: 'transparent',
    },
    heroCardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 8,
    },
    heroTextSection: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    heroArtSection: {
        width: 48,
        height: 48,
        borderRadius: 10,
        overflow: 'hidden',
    },
    heroTitle: {
        color: 'white',
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_700Bold',
        fontWeight: 'bold',
        letterSpacing: -0.3,
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 10,
        marginTop: 2,
    },
    heroCollageContainer: {
        width: 70,
        height: 70,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        borderWidth: 0,
        borderColor: 'transparent',
        transform: [{ rotate: '4deg' }],
    },
    favoriteItemWrapper: {
        width: 110,
        marginRight: 14,
    },
    favVerticalCard: {
        width: '100%',
        alignItems: 'center',
    },
    favVerticalImageContainer: {
        width: 110,
        height: 110,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 8,
    },
    favVerticalInfo: {
        width: '100%',
        alignItems: 'center',
    },
    favVerticalTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        width: '100%',
    },
    favVerticalSub: {
        fontSize: 11,
        opacity: 0.6,
        marginTop: 2,
    },
    favoriteItemWrapperGrid: {
        width: '100%',
    },
    favoriteCard: {
        width: '100%',
        height: 160,
        padding: 0,
        overflow: 'hidden'
    },
    favoriteName: {
        fontSize: 14,
    },
    iconCircle: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    topSongsContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    topSongItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    topSongIndex: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginRight: 12,
        width: 20,
        textAlign: 'right',
    },
    topSongImageContainer: {
        width: 45,
        height: 45,
        borderRadius: 24,
        overflow: 'hidden',
        marginRight: 12,
    },
    topSongInfo: {
        flex: 1,
    },
    topSongTitle: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    topSongSubtitle: {
        fontSize: 13,
        opacity: 0.7,
    },
    playingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topArtistCard: {
        width: 80,
        marginRight: 14,
        alignItems: 'center',
    },
    topArtistImageContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        marginBottom: 8,
    },
    topArtistName: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
        textAlign: 'center',
    },
    topArtistSub: {
        fontSize: 10,
        opacity: 0.7,
        textAlign: 'center',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 100,
    },
    emptyStateIconWrap: {
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 10,
    },
    emptyStateSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
        marginTop: 10,
    },
    recentTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    clearText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    recentItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 10,
    },
    removeRecentBtn: {
        padding: 10,
    },
    topAlbumCard: {
        width: 120,
        marginRight: 14,
    },
    topAlbumImageContainer: {
        width: 120,
        height: 120,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    topAlbumName: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    topAlbumSub: {
        fontSize: 10,
        opacity: 0.7,
        marginTop: 2,
    },
    statsCardWrapper: {
        marginHorizontal: 20,
        marginTop: 15,
        marginBottom: 10,
        borderRadius: 24,
        overflow: 'hidden',
    },
    statsCard: {
        padding: 18,
        borderRadius: 24,
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statsIconBox: {
        width: 28,
        height: 28,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsTitle: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginLeft: 10,
    },
    graphContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 60,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    barColumn: {
        alignItems: 'center',
        flex: 1,
    },
    barBg: {
        width: 8,
        height: 40,
        borderRadius: 4,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        marginBottom: 6,
    },
    barFill: {
        width: '100%',
        borderRadius: 4,
    },
    barLabel: {
        fontSize: 10,
        fontWeight: '700',
    },
    statDividerRow: {
        height: 1,
        width: '100%',
        marginBottom: 16,
        opacity: 0.5,
    },
    dailyMixContainer: {
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 15,
    },
    dailyMixCard: {
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
    },
    dailyMixHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    dailyMixBadgeContainer: {
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    dailyMixBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    dailyMixTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    dailyMixSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.8,
    },
    dailyMixPlayBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    dailyMixList: {
        gap: 12,
    },
    dailyMixSongRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    dailyMixCover: {
        width: 36,
        height: 36,
        borderRadius: 8,
        marginRight: 12,
    },
    dailyMixSongName: {
        fontSize: 15,
        fontWeight: '700',
    },
    dailyMixArtistName: {
        fontSize: 13,
        opacity: 0.6,
        marginTop: 1,
    },
    dailyMixMoreBtn: {
        paddingVertical: 8,
        alignSelf: 'flex-start',
    },
    dailyMixMore: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    statsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 4,
        opacity: 0.6,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(128,128,128,0.15)',
    },
    yearMixCard: {
        width: 270,
        height: 220, // Default closed height with 3 songs
        borderRadius: 28,
        marginRight: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    yearMixInnerContent: {
        flex: 1,
        padding: 22,
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.25)', // Middle ground
    },
    yearMixHeaderSmall: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    yearMixBadgeSmall: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    yearMixTitleSmall: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    yearMixPlayBtnSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    yearMixFooterSmall: {
        opacity: 0.9,
    },
    yearMixCountSmall: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
        opacity: 0.8,
    },
    bottomCustomizeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 30,
        paddingVertical: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    bottomCustomizeText: {
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
});
