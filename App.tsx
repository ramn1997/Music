
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';

import { PlayerProvider } from './src/hooks/PlayerContext';
import { MusicLibraryProvider } from './src/hooks/MusicLibraryContext';

import { ThemeProvider, useTheme } from './src/hooks/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';

// Hold the native splash screen until library is synced
SplashScreen.preventAutoHideAsync().catch(() => { });

const linking: any = {
    prefixes: ['exp+musicapp://'],
    config: {
        screens: {
            Home: {
                screens: {
                    Playlists: 'playlists',
                    Favorites: 'liked'
                }
            }
        }
    }
};

// Apply global font
// @ts-ignore
if (Text.defaultProps == null) Text.defaultProps = {};
// @ts-ignore
Text.defaultProps.style = { fontFamily: 'PlusJakartaSans_400Regular' };

const AppContent = () => {
    const { themeType } = useTheme();
    return (
        <View style={styles.container}>
            <StatusBar style={themeType === 'light' ? 'dark' : 'light'} />
            <AppNavigator />
        </View>
    );
};

export default function App() {
    const [fontsLoaded] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <MusicLibraryProvider>
                        <PlayerProvider>
                            <NavigationContainer linking={linking}>
                                <AppContent />
                            </NavigationContainer>
                        </PlayerProvider>
                    </MusicLibraryProvider>
                </ThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
