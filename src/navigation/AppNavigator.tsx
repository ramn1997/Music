import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { PlayerScreen } from '../screens/PlayerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EqualizerScreen } from '../screens/EqualizerScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

import { MiniPlayer } from '../components/MiniPlayer';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import * as SplashScreen from 'expo-splash-screen';

export const AppNavigator = () => {
    const { loading } = useMusicLibrary();
    const { theme } = useTheme();

    const isHiding = React.useRef(false);
    React.useEffect(() => {
        if (!loading && !isHiding.current) {
            isHiding.current = true;
            // Minimal delay (50ms) to ensure the first frame of the UI is painted
            const timer = setTimeout(() => {
                SplashScreen.hideAsync().catch(() => { });
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    return (
        <>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.background },
                    animation: 'slide_from_right'
                }}
            >
                <Stack.Screen name="Home" component={TabNavigator} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen
                    name="Player"
                    component={PlayerScreen}
                    options={{
                        presentation: 'modal',
                        animation: 'slide_from_bottom'
                    }}
                />
                <Stack.Screen
                    name="Equalizer"
                    component={EqualizerScreen}
                    options={{
                        animation: 'slide_from_right'
                    }}
                />
                <Stack.Screen name="About" component={AboutScreen} />
            </Stack.Navigator>
            {/* 
               MiniPlayer is placed here to validly overlay on top of the Stacks (except Modal usually covers everything).
               However, if Player is open (Modal), we probably don't want to see the MiniPlayer behind it or on top.
               Since Player is a modal, it will cover this z-index usually. 
            */}
            <MiniPlayer />
        </>
    );
};
