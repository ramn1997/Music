import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeNavigator } from './HomeNavigator';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { PlaylistsNavigator } from './PlaylistsNavigator';
import { LibraryScreen } from '../screens/LibraryScreen';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../hooks/ThemeContext';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Dimensions } from 'react-native';
const { width } = Dimensions.get('window');
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
        progress.value = withTiming(isFocused ? 1 : 0, { duration: 250 });
    }, [isFocused]);

    const iconName = () => {
        if (route.name === 'HomeTab') return isFocused ? 'home' : 'home-outline';
        if (route.name === 'Library') return isFocused ? 'library' : 'library-outline';
        if (route.name === 'Favorites') return isFocused ? 'thumbs-up' : 'thumbs-up-outline';
        if (route.name === 'Playlists') return isFocused ? 'musical-notes' : 'musical-notes-outline';
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
                    <View style={[styles.inactiveCircle, { backgroundColor: 'transparent' }]}>
                        <Ionicons name={iconName() as any} size={24} color={theme.background === '#ffffff' ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)"} />
                    </View>
                </Animated.View>

            </TouchableOpacity>
        </Animated.View>
    );
};

import { BlurView } from 'expo-blur';

const CustomTabBar = ({ state, descriptors, navigation, insets, theme }: any) => {
    const { navigationStyle } = useTheme();
    const isLight = theme.background === '#ffffff';
    const isPill = navigationStyle === 'pill';

    return (
        <View style={[
            styles.tabBarWrapper,
            { bottom: isPill ? (insets?.bottom || 20) : 0 },
            isPill && styles.pillWrapper
        ]}>
            <View style={[
                styles.tabBarContainer,
                {
                    backgroundColor: 'transparent',
                    height: 70 + (isPill ? 0 : (insets?.bottom || 0)),
                    paddingBottom: isPill ? 0 : (insets?.bottom || 0),
                    overflow: 'hidden',
                    borderTopWidth: isPill ? 0 : 1,
                    borderColor: theme.cardBorder || (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'),
                    borderRadius: isPill ? 35 : 0,
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

                            if (!event.defaultPrevented) {
                                // Forcing a navigation to the tab's sub-screen (Home, LibraryScreen, etc)
                                // directly by resetting the state.
                                navigation.navigate({
                                    name: route.name,
                                    params: { screen: undefined }, // This helps reset stacks
                                    merge: false, // Ensures we don't just stay where we are in a stack
                                });
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

const LibraryTabScreen = () => (
    <View style={{ flex: 1 }}>
        <LibraryScreen />
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
                unmountOnBlur: true,
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeTabScreen}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="Library"
                component={LibraryTabScreen}
                options={{ tabBarLabel: 'Library' }}
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
        left: 0,
        right: 0,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 15,
    },
    tabBarContainer: {
        width: '100%',
        justifyContent: 'center',
    },
    pillWrapper: {
        bottom: 20,
        left: 20,
        right: 20,
        width: width - 40,
        borderRadius: 35,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden'
    },
    tabBarInner: {
        flexDirection: 'row',
        width: '100%',
        height: 70,
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
        borderRadius: 100,
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
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '700',
    }
});
