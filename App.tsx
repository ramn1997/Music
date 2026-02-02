
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';

import { PlayerProvider } from './src/hooks/PlayerContext';
import { MusicLibraryProvider } from './src/hooks/MusicLibraryContext';

import { ThemeProvider } from './src/hooks/ThemeContext';
import { CustomDrawer } from './src/components/CustomDrawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Apply global font
// @ts-ignore
if (Text.defaultProps == null) Text.defaultProps = {};
// @ts-ignore
Text.defaultProps.style = { fontFamily: 'Roboto_400Regular' };

export default function App() {
    const [fontsLoaded] = useFonts({
        Roboto_400Regular,
        Roboto_500Medium,
        Roboto_700Bold,
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <PlayerProvider>
                        <MusicLibraryProvider>
                            <NavigationContainer>
                                <CustomDrawer>
                                    <View style={styles.container}>
                                        <StatusBar style="light" />
                                        <AppNavigator />
                                    </View>
                                </CustomDrawer>
                            </NavigationContainer>
                        </MusicLibraryProvider>
                    </PlayerProvider>
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
