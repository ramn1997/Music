
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import { useFonts, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';

import { PlayerProvider } from './src/hooks/PlayerContext';
import { MusicLibraryProvider } from './src/hooks/MusicLibraryContext';
import { ImportProgressOverlay } from './src/components/ImportProgressOverlay';

import { ThemeProvider } from './src/hooks/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';

// Apply global font
// @ts-ignore
if (Text.defaultProps == null) Text.defaultProps = {};
// @ts-ignore
Text.defaultProps.style = { fontFamily: 'Figtree_400Regular' };

export default function App() {
    const [fontsLoaded] = useFonts({
        Figtree_400Regular,
        Figtree_500Medium,
        Figtree_600SemiBold,
        Figtree_700Bold,
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
                            <NavigationContainer>
                                <View style={styles.container}>
                                    <StatusBar style="light" />
                                    <AppNavigator />
                                </View>
                            </NavigationContainer>
                            {/* <ImportProgressOverlay /> Removed for mini-player in Settings */}
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
