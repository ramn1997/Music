import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { SongsScreen } from '../screens/SongsScreen';
import { AlbumsScreen } from '../screens/AlbumsScreen';
import { ArtistsScreen } from '../screens/ArtistsScreen';
import { GenresScreen } from '../screens/GenresScreen';
import { MostPlayedScreen } from '../screens/MostPlayedScreen';
import { RecentlyAddedScreen } from '../screens/RecentlyAddedScreen';
import { PlaylistScreen } from '../screens/PlaylistScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const HomeNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#000' },
                animation: 'slide_from_right'
            }}
        >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Songs" component={SongsScreen} />
            <Stack.Screen name="Albums" component={AlbumsScreen} />
            <Stack.Screen name="Artists" component={ArtistsScreen} />
            <Stack.Screen name="Genres" component={GenresScreen} />
            <Stack.Screen name="MostPlayed" component={MostPlayedScreen} />
            <Stack.Screen name="RecentlyAdded" component={RecentlyAddedScreen} />
            <Stack.Screen name="Playlist" component={PlaylistScreen} />
        </Stack.Navigator>
    );
};
