import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeNavigator } from './HomeNavigator';
import { SearchNavigator } from './SearchNavigator';
import { PlaylistsNavigator } from './PlaylistsNavigator';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../hooks/ThemeContext';
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

const TabItem = ({ route, isFocused, onPress, label, theme }: any) => {
    const scale = useSharedValue(isFocused ? 1 : 0.95);
    const opacity = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
        scale.value = withSpring(isFocused ? 1 : 0.95, { damping: 12 });
        opacity.value = withSpring(isFocused ? 1 : 0, { duration: 200 });
    }, [isFocused]);

    const animatedPillStyle = useAnimatedStyle(() => ({
        backgroundColor: isFocused ? theme.primary : 'rgba(255,255,255,0.05)',
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: isFocused ? 20 : 14,
        height: 50,
        justifyContent: 'center',
        transform: [{ scale: scale.value }],
    }));

    const animatedTextStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        width: isFocused ? 'auto' : 0,
        marginLeft: isFocused ? 8 : 0,
        overflow: 'hidden',
    }));

    const iconName = () => {
        if (isFocused) {
            if (route.name === 'HomeTab') return 'home';
            if (route.name === 'Search') return 'search';
            if (route.name === 'Playlists') return 'list';
        } else {
            if (route.name === 'HomeTab') return 'home-outline';
            if (route.name === 'Search') return 'search-outline';
            if (route.name === 'Playlists') return 'list-outline';
        }
        return 'musical-notes';
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            style={{ paddingHorizontal: 4 }}
        >
            <Animated.View style={animatedPillStyle}>
                <Ionicons
                    name={iconName() as any}
                    size={22}
                    color={isFocused ? theme.textOnPrimary : 'rgba(255,255,255,0.6)'}
                />
                {isFocused && (
                    <Animated.View style={animatedTextStyle}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.tabLabel,
                                { color: theme.textOnPrimary }
                            ]}
                        >
                            {label}
                        </Text>
                    </Animated.View>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

const CustomTabBar = ({ state, descriptors, navigation, insets, theme }: any) => {
    return (
        <View style={[
            styles.tabBarContainer,
            { height: 65 + insets.bottom, paddingBottom: insets.bottom }
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
    );
};

const HomeTabScreen = () => (
    <View style={{ flex: 1 }}>
        <HomeNavigator />
    </View>
);

const SearchTabScreen = () => (
    <View style={{ flex: 1 }}>
        <SearchNavigator />
    </View>
);

const PlaylistsTabScreen = () => (
    <View style={{ flex: 1 }}>
        <PlaylistsNavigator />
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
        height: 65,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 15,
    },
    tabBarInner: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '700',
    }
});
