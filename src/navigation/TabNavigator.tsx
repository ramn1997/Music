import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeNavigator } from './HomeNavigator';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { PlaylistsNavigator } from './PlaylistsNavigator';
import { SearchNavigator } from './SearchNavigator';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../hooks/ThemeContext';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    useSharedValue,
    SlideInRight,
    SlideInLeft,
} from 'react-native-reanimated';

const Tab = createBottomTabNavigator();

const TabItem = ({ route, isFocused, onPress, label, theme }: any) => {
    const progress = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
        progress.value = withSpring(isFocused ? 1 : 0, { damping: 14, stiffness: 120 });
    }, [isFocused]);

    const iconName = () => {
        if (route.name === 'HomeTab') return isFocused ? 'home' : 'home-outline';
        if (route.name === 'Search') return isFocused ? 'search' : 'search-outline';
        if (route.name === 'Favorites') return isFocused ? 'heart' : 'heart-outline';
        if (route.name === 'Playlists') return isFocused ? 'library' : 'library-outline';
        return 'musical-notes';
    };

    const containerStyle = useAnimatedStyle(() => ({
        flex: 1 + (progress.value * 1.0), // Expands flex width up to 2x for active tab
    }));

    const activeStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ scale: 0.8 + (progress.value * 0.2) }],
        zIndex: isFocused ? 2 : 0
    }));

    const inactiveStyle = useAnimatedStyle(() => ({
        opacity: 1 - progress.value,
        transform: [{ scale: 1 - (progress.value * 0.2) }],
        zIndex: !isFocused ? 2 : 0
    }));

    return (
        <Animated.View style={[{ height: 48, justifyContent: 'center', alignItems: 'center' }, containerStyle]}>
            <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>

                {/* Active Pill Layout */}
                <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }, activeStyle]} pointerEvents="none">
                    <View style={[styles.activePillInner, { backgroundColor: theme.primary }]}>
                        <Ionicons name={iconName() as any} size={22} color={theme.textOnPrimary} />
                        <Text style={[styles.activeText, { color: theme.textOnPrimary }]} numberOfLines={1}>{label}</Text>
                    </View>
                </Animated.View>

                {/* Inactive Circle Layout */}
                <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }, inactiveStyle]} pointerEvents="none">
                    <View style={[styles.inactiveCircle, { backgroundColor: theme.card }]}>
                        <Ionicons name={iconName() as any} size={24} color={theme.background === '#ffffff' ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)"} />
                    </View>
                </Animated.View>

            </TouchableOpacity>
        </Animated.View>
    );
};

import { BlurView } from 'expo-blur';

const CustomTabBar = ({ state, descriptors, navigation, insets, theme }: any) => {
    const isLight = theme.background === '#ffffff';

    return (
        <View style={[styles.tabBarWrapper, { bottom: Math.max(insets.bottom, 16) }]}>
            <View style={[
                styles.tabBarContainer,
                {
                    backgroundColor: 'transparent',
                    height: 70,
                    overflow: 'hidden', // Required for border radius
                    borderWidth: 1,
                    borderColor: theme.cardBorder || (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)')
                }
            ]}>
                <BlurView
                    intensity={Platform.OS === 'ios' ? 40 : 80}
                    tint={isLight ? 'light' : 'dark'}
                    style={StyleSheet.absoluteFill}
                />
                {/* Semi-transparent overlay to better match theme background */}
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                            // For OLED black theme, we might want it slightly darker
                            ...(theme.background === '#000000' && { backgroundColor: 'rgba(0,0,0,0.8)' })
                        }
                    ]}
                />
                <View style={styles.tabBarInner}>
                    {state.routes.map((route: any, index: number) => {
                        const { options } = descriptors[route.key];
                        const label = options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        return (
                            <TabItem
                                key={route.key}
                                route={route}
                                isFocused={isFocused}
                                onPress={onPress}
                                label={label}
                                theme={theme}
                            />
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const HomeTabScreen = () => (
    <View style={{ flex: 1 }}>
        <HomeNavigator />
    </View>
);

const FavoritesTabScreen = () => (
    <View style={{ flex: 1 }}>
        <FavoritesScreen />
    </View>
);

const PlaylistsTabScreen = () => (
    <View style={{ flex: 1 }}>
        <PlaylistsNavigator />
    </View>
);

const SearchTabScreen = () => (
    <View style={{ flex: 1 }}>
        <SearchNavigator />
    </View>
);

export const TabNavigator = () => {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} insets={insets} theme={theme} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeTabScreen}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="Search"
                component={SearchTabScreen}
                options={{ tabBarLabel: 'Search' }}
            />
            <Tab.Screen
                name="Favorites"
                component={FavoritesTabScreen}
                options={{ tabBarLabel: 'Favorites' }}
            />
            <Tab.Screen
                name="Playlists"
                component={PlaylistsTabScreen}
                options={{ tabBarLabel: 'Playlists' }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBarWrapper: {
        position: 'absolute',
        left: 8,
        right: 8,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 10,
    },
    tabBarContainer: {
        width: '100%',
        borderRadius: 35,
        justifyContent: 'center',
    },
    tabBarInner: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    activePill: {
        flex: 1.5,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activePillInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: '100%',
        borderRadius: 30,
    },
    activeText: {
        color: '#000',
        fontWeight: 'bold',
        marginLeft: 6,
        fontSize: 13,
    },
    tabItemInactive: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inactiveCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '700',
    }
});
