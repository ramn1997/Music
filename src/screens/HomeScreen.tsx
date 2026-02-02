import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../components/GlassCard';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { openDrawerGlobal } from '../components/CustomDrawer';
import { useTheme } from '../hooks/ThemeContext';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { Alert } from 'react-native';

const HISTORY_ITEMS = [
    { id: 'recently_played', name: 'Recently Played', type: 'History', image: 'https://images.unsplash.com/photo-1459749411177-8c4750bb0e8e?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'recently', name: 'Recently Played', type: 'recently_played' } },
    { id: 'recently_added', name: 'Recently Added', type: 'Smart Playlist', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'recently_added', name: 'Recently Added', type: 'recently_placed' } },
    { id: 'never_played', name: 'Never Played', type: 'Smart Playlist', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'never', name: 'Never Played', type: 'never_played' } },
];

const FAVORITES = [
    { id: 'most_played', name: 'Most Played', type: 'Smart Playlist', image: 'https://images.unsplash.com/photo-1514525253440-b393452e8fc4?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'most', name: 'Most Played', type: 'most_played' } },
    { id: 'liked', name: 'Liked Songs', type: 'Playlist', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop', screen: 'Playlist', params: { id: 'liked', name: 'Liked Songs', type: 'playlist' } },
];

const CATEGORIES = ['Songs', 'Albums', 'Artists', 'Genres'];

export const HomeScreen = () => {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const { fetchMusic, loading } = useMusicLibrary();

    const handleScan = async () => {
        try {
            await fetchMusic();
            Alert.alert('Scan Complete', 'Your music library has been updated.');
        } catch (error) {
            Alert.alert('Scan Failed', 'Could not scan for music files.');
        }
    };

    return (
        <ScreenContainer variant="default">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                <View style={styles.header}>
                    <Text style={[styles.appName, { color: theme.text }]}>Music</Text>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <Ionicons name="settings-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* Category Grid */}
                <View style={styles.categoryGrid}>
                    {CATEGORIES.map((cat) => {
                        let iconName: any = 'musical-notes';
                        if (cat === 'Albums') iconName = 'disc';
                        if (cat === 'Artists') iconName = 'person';
                        if (cat === 'Genres') iconName = 'pricetags';

                        return (
                            <TouchableOpacity
                                key={cat}
                                style={styles.categoryCardWrapper}
                                onPress={() => navigation.navigate(cat)}
                            >
                                <GlassCard style={[styles.categoryCard, { backgroundColor: theme.card }]}>
                                    <View style={styles.iconCircle}>
                                        <Ionicons name={iconName} size={24} color={theme.primary} />
                                    </View>
                                    <Text style={[styles.categoryTitle, { color: theme.text }]}>{cat}</Text>
                                </GlassCard>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Favorites Section */}
                <View style={styles.sectionHeaderContainer}>
                    <Ionicons name="heart" size={20} color="#ec4899" style={{ marginRight: 8 }} />
                    <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 0 }]}>Your Favorites</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favoritesList}>
                    {FAVORITES.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.favoriteItem}
                            onPress={() => navigation.navigate(item.screen || 'Playlist', item.params)}
                        >
                            <GlassCard style={[styles.favoriteCard, { backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center' }]}>
                                <View style={{ alignItems: 'center' }}>
                                    <Ionicons
                                        name={item.id === 'most_played' ? "refresh" : "heart"}
                                        size={40}
                                        color={item.id === 'liked' ? "#ec4899" : "white"}
                                    />
                                    <View style={[styles.favoriteInfo, { padding: 0 }]}>
                                        <Text style={[styles.favoriteTitle, { color: theme.text, textAlign: 'center', marginTop: 4 }]} numberOfLines={1}>{item.name}</Text>
                                    </View>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Listening History Section */}
                <View style={styles.sectionHeaderContainer}>
                    <Ionicons name="time-outline" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 0 }]}>Listening History</Text>
                </View>
                <View style={styles.historyGrid}>
                    {HISTORY_ITEMS.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.historyCardWrapper}
                            onPress={() => item.screen === 'Playlist' ? navigation.navigate('Playlist', item.params) : navigation.navigate(item.screen)}
                        >
                            <GlassCard style={[styles.historyCard, { backgroundColor: theme.card }]}>
                                <Image source={{ uri: item.image }} style={styles.historyImage} />
                                <View style={styles.overlayIconContainer}>
                                    <Ionicons
                                        name={item.id === 'never_played' ? "close" : item.id === 'recently_added' ? "add" : "play"}
                                        size={32}
                                        color="white"
                                    />
                                </View>
                            </GlassCard>
                            <View style={styles.historyInfo}>
                                <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={2}>{item.name}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 15,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    scanButton: {
        padding: 5,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 20,
        marginBottom: 30,
        justifyContent: 'space-between'
    },
    categoryCardWrapper: {
        width: '48%',
        marginBottom: 12
    },
    categoryCard: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        height: 80, // Reduced height
    },
    iconCircle: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18, // Slightly smaller header
        fontWeight: 'bold',
        marginBottom: 0,
    },
    favoritesList: {
        paddingLeft: 20,
        marginBottom: 40,
    },
    favoriteItem: {
        marginRight: 15,
    },
    favoriteCard: {
        width: 150,
        height: 115, // Reduced height
        padding: 0,
        overflow: 'hidden'
    },
    favoriteImage: {
        width: '100%',
        height: 80, // Reduced image height
        borderTopLeftRadius: 0,
    },
    favoriteInfo: {
        padding: 10,
    },
    favoriteTitle: {
        fontWeight: 'bold',
        fontSize: 12, // Reduced font
        marginBottom: 4,
    },
    favoriteType: {
        fontSize: 10, // Reduced font
    },
    historyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    historyCardWrapper: {
        width: '31%',
        marginBottom: 20,
    },
    historyCard: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        height: 75, // Reduced height
        overflow: 'hidden',
    },
    historyImage: {
        width: '100%',
        height: '100%',
    },
    historyInfo: {
        width: '100%',
        marginTop: 8,
        alignItems: 'center',
    },
    historyTitle: {
        fontWeight: 'bold',
        fontSize: 11,
        lineHeight: 14,
        textAlign: 'center',
    },
    overlayIconContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
