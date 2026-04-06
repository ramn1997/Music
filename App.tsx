import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';

import { MusicLibraryProvider } from './src/hooks/MusicLibraryContext';

import { ThemeProvider, useTheme } from './src/hooks/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { initializePlayerEvents, usePlayerStore } from './src/store/usePlayerStore';


// Hold the native splash screen until library is synced
SplashScreen.preventAutoHideAsync().catch(() => { });

// Build linking prefixes safely — 'exp+musicapp://' only exists in dev client,
// while 'musicapp://' is the production scheme defined in app.json + AndroidManifest.
// Safer linking prefix generation to prevent native JNI crashes in standalone builds
const getLinkingPrefixes = (): string[] => {
    const prefixes: string[] = ['musicapp://'];
    try {
        // Only attempt createURL if we are not in a environment where it's known to be unstable
        // In some production builds, this native call triggers a fatal exception before JS catch
        const url = Linking.createURL('/');
        if (url && !prefixes.includes(url)) {
            prefixes.push(url);
        }
    } catch (e) {
        // Safe fallback
    }
    return prefixes;
};

const linking: any = {
    prefixes: getLinkingPrefixes(),
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
// Fonts are handled via theme and explicit styles

const AppContent = () => {
    const { themeType } = useTheme();
    return (
        <View style={styles.container}>
            <StatusBar style={themeType === 'light' ? 'dark' : 'light'} />
            <AppNavigator />
        </View>
    );
};

import { HomeSettingsProvider } from './src/hooks/HomeSettingsContext';

export default function App() {
    const [fontsLoaded] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
    });

    React.useEffect(() => {
        // Initialize player when app mounts
        initializePlayerEvents();
        usePlayerStore.getState().setupPlayer().then(() => {
            usePlayerStore.getState().loadPersistedState();
        }).catch(err => console.warn('[App] Player init failed:', err));
    }, []);

    if (!fontsLoaded) {
        return null;
    }


    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <HomeSettingsProvider>
                        <MusicLibraryProvider>
                            <NavigationContainer linking={linking}>
                                <AppContent />
                            </NavigationContainer>
                        </MusicLibraryProvider>


                    </HomeSettingsProvider>
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
