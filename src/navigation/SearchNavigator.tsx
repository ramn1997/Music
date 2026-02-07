import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchScreen } from '../screens/SearchScreen';
import { PlaylistScreen } from '../screens/PlaylistScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const SearchNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#000' },
                animation: 'slide_from_right'
            }}
        >
            <Stack.Screen name="SearchMain" component={SearchScreen} />
            <Stack.Screen name="Playlist" component={PlaylistScreen} />
        </Stack.Navigator>
    );
};
