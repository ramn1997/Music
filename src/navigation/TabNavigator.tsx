import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeNavigator } from './HomeNavigator';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { PlaylistsNavigator } from './PlaylistsNavigator';
import { SearchNavigator } from './SearchNavigator';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../hooks/ThemeContext';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
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
    const scale = useSharedValue(isFocused ? 1 : 0.9);

    useEffect(() => {
        scale.value = withSpring(isFocused ? 1 : 0.9, { damping: 15 });
    }, [isFocused]);

    const iconName = () => {
        if (route.name === 'HomeTab') return isFocused ? 'home' : 'home-outline';
        if (route.name === 'Search') return isFocused ? 'search' : 'search-outline';
        if (route.name === 'Favorites') return isFocused ? 'heart' : 'heart-outline';
        if (route.name === 'Playlists') return isFocused ? 'library' : 'library-outline';
        return 'musical-notes';
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    if (isFocused) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.9}
                style={styles.activePill}
            >
                <Animated.View style={[styles.activePillInner, animatedStyle]}>
                    <Ionicons
                        name={iconName() as any}
                        size={22}
                        color="#000"
                    />
                    <Text style={styles.activeText}>{label}</Text>
                </Animated.View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.tabItemInactive}
        >
            <View style={styles.inactiveCircle}>
                <Ionicons
                    name={iconName() as any}
                    size={24}
                    color="rgba(255,255,255,0.5)"
                />
            </View>
        </TouchableOpacity>
    );
};

const CustomTabBar = ({ state, descriptors, navigation, insets, theme }: any) => {
    // Determine a solid background color based on the theme
    // If the theme is dark/black, we'll use a slightly lighter grey/black for contrast
    // If it's a light theme, we'll use white.
    const isDark = theme.background === '#050505' || theme.background === '#000000';
    const solidBg = isDark ? '#121212' : '#ffffff';

    return (
        <View style={styles.tabBarWrapper}>
            <View style={[
                styles.tabBarContainer,
                {
                    backgroundColor: '#000',
                    paddingBottom: Math.max(insets.bottom, 10),
                    height: 60 + Math.max(insets.bottom, 10)
                }
            ]}>
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
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    tabBarContainer: {
        width: '100%',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
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
        backgroundColor: '#FCFCFC',
        paddingHorizontal: 20,
        height: '100%',
        borderRadius: 30,
    },
    activeText: {
        color: '#000',
        fontWeight: 'bold',
        marginLeft: 6,
        fontSize: 13, // Slightly smaller to fit 'Favorites' and 'Playlists' perfectly
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
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '700',
    }
});
