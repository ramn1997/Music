import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { SongsScreen } from './SongsScreen';
import { AlbumsScreen } from './AlbumsScreen';
import { ArtistsScreen } from './ArtistsScreen';
import { GenresScreen } from './GenresScreen';

const TABS = ['Songs', 'Albums', 'Artists', 'Genres'];

const TopTabItem = ({ tab, isActive, onPress, appTheme }: any) => {
    const progress = useSharedValue(isActive ? 1 : 0);

    React.useEffect(() => {
        progress.value = withTiming(isActive ? 1 : 0, { duration: 250 });
    }, [isActive]);

    const indicatorStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ scaleX: progress.value }]
    }));

    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.8}
        >
            <Text style={[
                styles.tabText,
                {
                    color: isActive ? appTheme.text : appTheme.textSecondary,
                    fontSize: 16,
                    fontWeight: isActive ? '800' : '700'
                }
            ]}>
                {tab}
            </Text>
            <Animated.View style={[styles.activeIndicator, { backgroundColor: appTheme.primary }, indicatorStyle]} />
        </TouchableOpacity>
    );
};

export const LibraryScreen = () => {
    const { theme: appTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('Songs');
    const mountedTabs = useRef(new Set<string>(['Songs']));
    mountedTabs.current.add(activeTab);

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: appTheme.text }]}>Library</Text>
            </View>

            <View style={styles.tabsContainer}>
                {TABS.map((tab) => (
                    <TopTabItem
                        key={tab}
                        tab={tab}
                        isActive={activeTab === tab}
                        onPress={() => setActiveTab(tab)}
                        appTheme={appTheme}
                    />
                ))}
            </View>

            <View style={{ flex: 1 }}>
                {mountedTabs.current.has('Songs') && (
                    <View style={[StyleSheet.absoluteFill, { display: activeTab === 'Songs' ? 'flex' : 'none', backgroundColor: 'transparent', zIndex: activeTab === 'Songs' ? 1 : 0 }]}>
                        <SongsScreen isEmbedded={true} />
                    </View>
                )}
                {mountedTabs.current.has('Albums') && (
                    <View style={[StyleSheet.absoluteFill, { display: activeTab === 'Albums' ? 'flex' : 'none', backgroundColor: 'transparent', zIndex: activeTab === 'Albums' ? 1 : 0 }]}>
                        <AlbumsScreen isEmbedded={true} />
                    </View>
                )}
                {mountedTabs.current.has('Artists') && (
                    <View style={[StyleSheet.absoluteFill, { display: activeTab === 'Artists' ? 'flex' : 'none', backgroundColor: 'transparent', zIndex: activeTab === 'Artists' ? 1 : 0 }]}>
                        <ArtistsScreen isEmbedded={true} />
                    </View>
                )}
                {mountedTabs.current.has('Genres') && (
                    <View style={[StyleSheet.absoluteFill, { display: activeTab === 'Genres' ? 'flex' : 'none', backgroundColor: 'transparent', zIndex: activeTab === 'Genres' ? 1 : 0 }]}>
                        <GenresScreen isEmbedded={true} />
                    </View>
                )}
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        marginTop: 10,
        gap: 24,
    },
    tabItem: {
        alignItems: 'center',
        position: 'relative',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -8,
        width: '100%',
        height: 4,
        borderRadius: 2,
    },
});
