import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeNavigator } from './HomeNavigator';
import { SearchNavigator } from './SearchNavigator';
import { PlaylistsNavigator } from './PlaylistsNavigator';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#000', // simplified for stability
                    borderTopColor: 'rgba(255,255,255,0.1)',
                    height: 50 + Math.max(insets.bottom, 10),
                    paddingBottom: Math.max(insets.bottom, 10),
                    paddingTop: 5,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '500'
                }
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeNavigator}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('HomeTab', { screen: 'Home' });
                    },
                })}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name="home" size={focused ? 24 : 20} color={color} />
                    )
                }}
            />
            <Tab.Screen
                name="Search"
                component={SearchNavigator}
                options={{
                    tabBarLabel: 'Search',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name="search" size={focused ? 24 : 20} color={color} />
                    )
                }}
            />
            <Tab.Screen
                name="Playlists"
                component={PlaylistsNavigator}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('Playlists', { screen: 'Playlists' });
                    },
                })}
                options={{
                    tabBarLabel: 'Playlists',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name="list" size={focused ? 24 : 20} color={color} />
                    )
                }}
            />

        </Tab.Navigator>
    );
};
