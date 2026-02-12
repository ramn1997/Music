import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeNavigator } from './HomeNavigator';
import { SearchNavigator } from './SearchNavigator';
import { PlaylistsNavigator } from './PlaylistsNavigator';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    SlideInRight,
    SlideInLeft,
} from 'react-native-reanimated';

const Tab = createBottomTabNavigator();

const TabItem = ({ route, isFocused, onPress, label }: any) => {
    const scale = useSharedValue(isFocused ? 1.15 : 0.9);

    useEffect(() => {
        scale.value = withSpring(isFocused ? 1.15 : 0.9, {
            damping: 15,
            stiffness: 150
        });
    }, [isFocused]);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const iconName = () => {
        if (route.name === 'HomeTab') return 'home';
        if (route.name === 'Search') return 'search';
        if (route.name === 'Playlists') return 'list';
        return 'musical-notes';
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
        >
            <Animated.View style={animatedIconStyle}>
                <Ionicons
                    name={iconName() as any}
                    size={24}
                    color="white"
                />
            </Animated.View>
            <Text style={[
                styles.tabLabel,
                { color: 'white', opacity: isFocused ? 1 : 0.6 }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const CustomTabBar = ({ state, descriptors, navigation, insets }: any) => {
    return (
        <View style={[styles.tabBarContainer, { height: 65 + insets.bottom, paddingBottom: insets.bottom }]}>
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
                    />
                );
            })}
        </View>
    );
};

const HomeTabScreen = () => (
    <Animated.View style={{ flex: 1 }} entering={SlideInRight.duration(400)}>
        <HomeNavigator />
    </Animated.View>
);

const SearchTabScreen = () => (
    <Animated.View style={{ flex: 1 }} entering={SlideInRight.duration(400)}>
        <SearchNavigator />
    </Animated.View>
);

const PlaylistsTabScreen = () => (
    <Animated.View style={{ flex: 1 }} entering={SlideInRight.duration(400)}>
        <PlaylistsNavigator />
    </Animated.View>
);

export const TabNavigator = () => {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
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
                name="Playlists"
                component={PlaylistsTabScreen}
                options={{ tabBarLabel: 'Playlists' }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBarContainer: {
        flexDirection: 'row',
        backgroundColor: '#000',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        position: 'relative',
        zIndex: 100,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 12,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    }
});
