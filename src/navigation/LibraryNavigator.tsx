import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LibraryScreen } from '../screens/LibraryScreen';
import { PlaylistScreen } from '../screens/PlaylistScreen';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const LibraryNavigator = () => {
    const { theme } = useTheme();
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background },
                animation: 'slide_from_right'
            }}
        >
            <Stack.Screen name="LibraryMain" component={LibraryScreen} />
            <Stack.Screen name="Playlist" component={PlaylistScreen} />
        </Stack.Navigator>
    );
};
