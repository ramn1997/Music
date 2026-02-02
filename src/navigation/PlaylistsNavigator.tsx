import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { PlaylistScreen } from '../screens/PlaylistScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const PlaylistsNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#000' },
                animation: 'slide_from_right'
            }}
        >
            <Stack.Screen name="Playlists" component={PlaylistsScreen} />
            <Stack.Screen name="Playlist" component={PlaylistScreen} />
        </Stack.Navigator>
    );
};
