import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeNavigator } from './HomeNavigator';
import { FavoritesNavigator } from './FavoritesNavigator';
import { PlaylistsNavigator } from './PlaylistsNavigator';
import { LibraryNavigator } from './LibraryNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Dimensions, useWindowDimensions } from 'react-native';
import { MiniPlayer } from '../components/MiniPlayer';
const { width } = Dimensions.get('window');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
} from 'react-native-reanimated';

const Tab = createBottomTabNavigator();

const TabItem = ({ route, isFocused, onPress, label, theme, isLandscape }: any) => {
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
        flex: isLandscape ? 0 : 1 + (progress.value * 1.0),
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
        <Animated.View style={[isLandscape ? { width: '92%', height: 50, justifyContent: 'center', alignItems: 'center', marginVertical: 2 } : { height: 48, justifyContent: 'center', alignItems: 'center' }, containerStyle]}>
            <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }, activeStyle]} pointerEvents="none">
                    <View style={[styles.activePillInner, isLandscape && { flexDirection: 'column', width: '100%', height: '100%', paddingHorizontal: 0, paddingVertical: 10, borderRadius: 20 }, { backgroundColor: theme.primaryLight || theme.primary }]}>
                        <Ionicons name={iconName() as any} size={22} color={theme.textOnPrimary} />
                        <Text style={[styles.activeText, isLandscape && { marginLeft: 0, marginTop: 6, fontSize: 10 }, { color: theme.textOnPrimary }]} numberOfLines={1}>{label}</Text>
                    </View>
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }, inactiveStyle]} pointerEvents="none">
                    <View style={[styles.inactiveCircle, isLandscape && { width: '100%', height: '100%', borderRadius: 20 }, { backgroundColor: 'transparent' }]}>
                        <Ionicons name={iconName() as any} size={24} color={theme.background === '#ffffff' ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)"} />
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

import { BlurView } from 'expo-blur';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

const CustomTabBar = ({ state, descriptors, navigation, insets, theme, isLandscape }: any) => {
    const route = state.routes[state.index];
    const focusedName = getFocusedRouteNameFromRoute(route) ?? route.name;
    const hideOnScreens = ['Albums', 'Artists'];

    if (hideOnScreens.includes(focusedName)) {
        return null;
    }

    const { navigationStyle } = useTheme();
    const isLight = theme.background === '#ffffff';
    const isPillNav = navigationStyle === 'pill' || isLandscape;

    return (
        <View style={[
            styles.tabBarWrapper,
            isPillNav && !isLandscape && styles.pillWrapper,
            isLandscape ? {
                top: (insets?.top || 0) + 10,
                bottom: (insets?.bottom || 0) + 10,
                left: 10,
                width: 88,
                justifyContent: 'center',
                borderRadius: 24,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.cardBorder || (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'),
            } : {
                bottom: isPillNav ? (15 + (insets?.bottom || 0)) : 0,
            }
        ]}>
            <View style={[
                styles.tabBarContainer,
                isLandscape ? {
                    height: '100%',
                    backgroundColor: 'transparent',
                } : {
                    backgroundColor: 'transparent',
                    height: (isPillNav ? 80 : 68) + (isPillNav ? 0 : (insets?.bottom || 0)),
                    paddingBottom: isPillNav ? 0 : (insets?.bottom || 0),
                    overflow: 'hidden',
                    borderTopWidth: isPillNav ? 0 : 1,
                    borderColor: theme.cardBorder || (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'),
                    borderRadius: isPillNav ? 40 : 0,
                }
            ]}>
                <BlurView
                    intensity={Platform.OS === 'ios' ? 40 : 80}
                    tint={isLight ? 'light' : 'dark'}
                    style={StyleSheet.absoluteFill}
                />
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                            ...(theme.background === '#000000' && { backgroundColor: 'rgba(0,0,0,0.8)' })
                        }
                    ]}
                />
                <View style={[
                    styles.tabBarInner,
                    isLandscape ? {
                        flexDirection: 'column',
                        height: '100%',
                        paddingVertical: 15,
                        paddingHorizontal: 0,
                        alignItems: 'center',
                    } : {
                        height: isPillNav ? 80 : 68
                    }
                ]}>
                    {state.routes.map((route: any, index: number) => {
                        const { options } = descriptors[route.key];
                        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
                        const isFocused = state.index === index;
                        const onPress = () => {
                            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                            if (!event.defaultPrevented) {
                                navigation.navigate({ name: route.name, params: { screen: undefined }, merge: false });
                            }
                        };
                        return (
                            <TabItem key={route.key} route={route} isFocused={isFocused} onPress={onPress} label={label} theme={theme} isLandscape={isLandscape} />
                        );
                    })}
                    {isLandscape && (
                        <View style={{ marginTop: 'auto', width: '100%', alignItems: 'center', paddingBottom: 5 }}>
                            <MiniPlayer isSidebar={true} />
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const HomeTabScreen = () => (<View style={{ flex: 1 }}><HomeNavigator /></View>);
const FavoritesTabScreen = () => (<View style={{ flex: 1 }}><FavoritesNavigator /></View>);
const PlaylistsTabScreen = () => (<View style={{ flex: 1 }}><PlaylistsNavigator /></View>);
const LibraryTabScreen = () => (<View style={{ flex: 1 }}><LibraryNavigator /></View>);

export const TabNavigator = () => {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isLandscape = windowWidth > windowHeight;

    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} insets={insets} theme={theme} isLandscape={isLandscape} />}
            screenOptions={{
                headerShown: false,
                unmountOnBlur: true,
            }}
        >
            <Tab.Screen name="HomeTab" component={HomeTabScreen} options={{ tabBarLabel: 'Home' }} />
            <Tab.Screen name="Library" component={LibraryTabScreen} options={{ tabBarLabel: 'Library' }} />
            <Tab.Screen name="Favorites" component={FavoritesTabScreen} options={{ tabBarLabel: 'Favorites' }} />
            <Tab.Screen name="Playlists" component={PlaylistsTabScreen} options={{ tabBarLabel: 'Playlists' }} />
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
        marginHorizontal: 20,
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
        paddingHorizontal: 15,
    },
    activePillInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        height: '100%',
        borderRadius: 100,
    },
    activeText: {
        color: '#000',
        fontWeight: 'bold',
        marginLeft: 6,
        fontSize: 12,
    },
    inactiveCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
