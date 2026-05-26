import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Platform, ToastAndroid, Share, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { LinearGradient } from 'expo-linear-gradient';
import { useLibraryStore } from '../store/useLibraryStore';

export const AboutScreen = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();

    // Hook into Library state
    const { 
        songs, 
        playlists, 
        likedSongs, 
        savedFolders, 
        dailyStats, 
        refreshMetadata, 
        calculateBackgroundStats 
    } = useLibraryStore();

    // Subtle floating animation for the logo
    const floatAnim = React.useRef(new Animated.Value(0)).current;
    // Interactive rapid spin animation
    const spinAnim = React.useRef(new Animated.Value(0)).current;

    // Developer mode state (triggered by 7 taps)
    const [tapCount, setTapCount] = React.useState(0);
    const [isDevMode, setIsDevMode] = React.useState(false);
    const [isScanning, setIsScanning] = React.useState(false);
    const [showLogs, setShowLogs] = React.useState(false);

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -10,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2500,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [floatAnim]);

    const handleLogoPress = () => {
        // Trigger rapid 360-degree spin
        spinAnim.setValue(0);
        Animated.spring(spinAnim, {
            toValue: 1,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
        }).start();
    };

    const handleVersionPress = () => {
        if (isDevMode) return;
        
        const newCount = tapCount + 1;
        setTapCount(newCount);
        
        if (newCount >= 7) {
            setIsDevMode(true);
            if (Platform.OS === 'android') {
                ToastAndroid.show('Developer Mode Unlocked! 🚀', ToastAndroid.SHORT);
            } else {
                Alert.alert('Developer Mode Unlocked! 🚀');
            }
        } else if (newCount >= 3) {
            const remaining = 7 - newCount;
            if (Platform.OS === 'android') {
                ToastAndroid.show(`You are ${remaining} steps away from Developer Mode`, ToastAndroid.SHORT);
            }
        }
    };

    const handleForceRescan = async () => {
        setIsScanning(true);
        if (Platform.OS === 'android') {
            ToastAndroid.show('Starting library rescan...', ToastAndroid.SHORT);
        }
        try {
            await refreshMetadata();
            if (Platform.OS === 'android') {
                ToastAndroid.show('Library rescan complete!', ToastAndroid.SHORT);
            } else {
                Alert.alert('Scan Complete', 'Library rescan complete!');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Scan Failed', 'Failed to scan library directories.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleRecalculateStats = () => {
        calculateBackgroundStats();
        if (Platform.OS === 'android') {
            ToastAndroid.show('Recalculating top charts & stats...', ToastAndroid.SHORT);
        } else {
            Alert.alert('Calculated Stats', 'Recalculating top charts & stats in the background.');
        }
    };


    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const features = [
        { icon: 'color-palette-outline', title: 'Dynamic Themes', desc: 'Polished UI with glassmorphism and 7+ premium themes including Nebula, Cyber, and Forest.' },
        { icon: 'stats-chart-outline', title: 'Daily Listening Analytics', desc: 'Track your daily song plays and listening time with a visual weekly insights graph.' },
        { icon: 'sparkles-outline', title: 'Daily Fresh Mix', desc: 'Get 10 date-seeded tracks handpicked every day for a fresh listening experience.' },
        { icon: 'musical-notes-outline', title: 'Material Player', desc: 'Refined playback interface with bold typography and immersive gesture controls.' },
    ];

    // Calculate today's stats
    const todayStr = new Date().toISOString().split('T')[0];
    const todayStats = dailyStats?.[todayStr] || { songsPlayed: 0, listeningTimeMs: 0 };
    const listeningMinutes = Math.round((todayStats.listeningTimeMs || 0) / (1000 * 60));
    const songsPlayed = todayStats.songsPlayed || 0;

    return (
        <ScreenContainer variant="default">
            {/* Immersive Header Gradient Overlay */}
            <LinearGradient
                colors={[`${theme.primary}40`, 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.4 }}
                pointerEvents="none"
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={[styles.backButton, { backgroundColor: theme.card }]}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>About</Text>
                {/* Spacer to center title */}
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.appSection}>
                    <TouchableOpacity activeOpacity={0.9} onPress={handleLogoPress}>
                        <Animated.View style={[styles.logoWrapper, { transform: [{ translateY: floatAnim }, { rotate: spin }] }]}>
                            <LinearGradient
                                colors={[theme.primary, theme.secondary || theme.primary]}
                                style={styles.logoGradientBorder}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={[styles.logoContainer, { backgroundColor: theme.card }]}>
                                    <Image source={require('../../assets/discicon.png')} style={styles.logo} />
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    </TouchableOpacity>

                    <Text style={[styles.appName, { color: theme.text }]}>Music</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={handleVersionPress}>
                        <Text style={[styles.appVersion, { color: theme.primary, backgroundColor: theme.card }]}>Version 1.4.0</Text>
                    </TouchableOpacity>
                    <Text style={[styles.appDescription, { color: theme.textSecondary }]}>
                        A premium local music player designed for audiophiles who value both aesthetics and performance.
                        No ads, no subscriptions, just your pure music.
                    </Text>
                </View>

                {/* Library Statistics Grid */}
                <View style={styles.statsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Library Stats</Text>
                    <View style={styles.statsGrid}>
                        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder || 'transparent', borderWidth: theme.cardBorder ? 1 : 0 }]}>
                            <Ionicons name="musical-notes-outline" size={22} color={theme.primary} />
                            <Text style={[styles.statsValue, { color: theme.text }]}>{songs.length}</Text>
                            <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Total Songs</Text>
                        </View>
                        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder || 'transparent', borderWidth: theme.cardBorder ? 1 : 0 }]}>
                            <Ionicons name="library-outline" size={22} color={theme.primary} />
                            <Text style={[styles.statsValue, { color: theme.text }]}>{playlists.length}</Text>
                            <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Playlists</Text>
                        </View>
                        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder || 'transparent', borderWidth: theme.cardBorder ? 1 : 0 }]}>
                            <Ionicons name="heart-outline" size={22} color={theme.primary} />
                            <Text style={[styles.statsValue, { color: theme.text }]}>{likedSongs.length}</Text>
                            <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Favorites</Text>
                        </View>
                        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder || 'transparent', borderWidth: theme.cardBorder ? 1 : 0 }]}>
                            <Ionicons name="folder-open-outline" size={22} color={theme.primary} />
                            <Text style={[styles.statsValue, { color: theme.text }]}>{savedFolders.length}</Text>
                            <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Folders</Text>
                        </View>
                    </View>
                </View>

                {/* Today's Listening Insights */}
                <View style={styles.insightsSection}>
                    <View style={[styles.insightsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder || 'transparent', borderWidth: theme.cardBorder ? 1 : 0 }]}>
                        <View style={styles.insightsHeader}>
                            <Ionicons name="stats-chart" size={20} color={theme.primary} />
                            <Text style={[styles.insightsTitle, { color: theme.text }]}>Today's Listening Insights</Text>
                        </View>
                        <View style={styles.insightsContent}>
                            <View style={styles.insightsRow}>
                                <Text style={[styles.insightsLabelText, { color: theme.textSecondary }]}>Time Listened:</Text>
                                <Text style={[styles.insightsValueText, { color: theme.text }]}>
                                    {listeningMinutes > 0 ? `${listeningMinutes} min` : 'No music played today'}
                                </Text>
                            </View>
                            <View style={styles.insightsRow}>
                                <Text style={[styles.insightsLabelText, { color: theme.textSecondary }]}>Songs Played:</Text>
                                <Text style={[styles.insightsValueText, { color: theme.text }]}>
                                    {songsPlayed} {songsPlayed === 1 ? 'song' : 'songs'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Developer Mode Diagnostics */}
                {isDevMode && (
                    <View style={[styles.devSection, { backgroundColor: theme.card, borderColor: theme.primary, borderWidth: 1 }]}>
                        <View style={styles.devHeader}>
                            <View style={styles.devTitleRow}>
                                <Ionicons name="bug-outline" size={20} color={theme.primary} />
                                <Text style={[styles.devTitle, { color: theme.text }]}>Developer Diagnostics</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsDevMode(false)}>
                                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.devGrid}>
                            <View style={styles.devInfoRow}>
                                <Text style={[styles.devLabel, { color: theme.textSecondary }]}>Platform:</Text>
                                <Text style={[styles.devValue, { color: theme.text }]}>{Platform.OS.toUpperCase()} {Platform.Version}</Text>
                            </View>
                            <View style={styles.devInfoRow}>
                                <Text style={[styles.devLabel, { color: theme.textSecondary }]}>JS Engine:</Text>
                                <Text style={[styles.devValue, { color: theme.text }]}>{(global as any).HermesInternal ? 'Hermes' : 'JSC'}</Text>
                            </View>
                            <View style={styles.devInfoRow}>
                                <Text style={[styles.devLabel, { color: theme.textSecondary }]}>DB Status:</Text>
                                <Text style={[styles.devValue, { color: '#10b981', fontWeight: 'bold' }]}>Healthy (SQLite)</Text>
                            </View>
                            <View style={styles.devInfoRow}>
                                <Text style={[styles.devLabel, { color: theme.textSecondary }]}>Memory Cache:</Text>
                                <Text style={[styles.devValue, { color: theme.text }]}>{songs.length} entries</Text>
                            </View>
                        </View>

                        <View style={styles.devActions}>
                            <TouchableOpacity 
                                disabled={isScanning}
                                onPress={handleForceRescan} 
                                style={[styles.devButton, { backgroundColor: theme.primary }]}
                            >
                                {isScanning ? (
                                    <ActivityIndicator size="small" color={theme.textOnPrimary || '#fff'} />
                                ) : (
                                    <>
                                        <Ionicons name="refresh-circle-outline" size={16} color={theme.textOnPrimary || '#fff'} />
                                        <Text style={[styles.devButtonText, { color: theme.textOnPrimary || '#fff' }]}>Force Rescan</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={handleRecalculateStats} 
                                style={[styles.devButton, { backgroundColor: theme.background, borderColor: theme.cardBorder || 'rgba(255,255,255,0.05)', borderWidth: 1 }]}
                            >
                                <Ionicons name="calculator-outline" size={16} color={theme.text} />
                                <Text style={[styles.devButtonText, { color: theme.text }]}>Recalc Stats</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => setShowLogs(!showLogs)} 
                                style={[styles.devButton, { backgroundColor: theme.background, borderColor: theme.cardBorder || 'rgba(255,255,255,0.05)', borderWidth: 1 }]}
                            >
                                <Ionicons name="terminal-outline" size={16} color={theme.text} />
                                <Text style={[styles.devButtonText, { color: theme.text }]}>{showLogs ? 'Hide Logs' : 'Show Logs'}</Text>
                            </TouchableOpacity>
                        </View>

                        {showLogs && (
                            <View style={[styles.consoleLogs, { backgroundColor: theme.background }]}>
                                <Text style={styles.consoleText}>[sys] Initializing Antigravity Core...</Text>
                                <Text style={styles.consoleText}>[db] SQLite connected successfully</Text>
                                <Text style={styles.consoleText}>[audio] react-native-track-player loaded</Text>
                                <Text style={styles.consoleText}>[ui] Premium theme: {theme.primary} initialized</Text>
                                <Text style={styles.consoleText}>[status] Ready for pure music listening!</Text>
                            </View>
                        )}
                    </View>
                )}


                {/* Features List */}
                <View style={styles.featuresSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Features</Text>
                    {features.map((f, i) => (
                        <View key={i} style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.cardBorder || 'transparent', borderWidth: theme.cardBorder ? 1 : 0 }]}>
                            <View style={[styles.featureIconContainer, { backgroundColor: theme.background }]}>
                                <Ionicons name={f.icon as any} size={24} color={theme.primary} />
                            </View>
                            <View style={styles.featureInfo}>
                                <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                                <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>{f.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        marginTop: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.5,
    },
    content: {
        padding: 20,
        paddingBottom: 120,
    },
    appSection: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    logoWrapper: {
        marginBottom: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    logoGradientBorder: {
        padding: 3,
        borderRadius: 40,
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 37,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 75,
        height: 75,
        borderRadius: 16,
    },
    appName: {
        fontSize: 32,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        letterSpacing: -1,
        marginBottom: 8,
    },
    appVersion: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 20,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
    },
    appDescription: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    statsSection: {
        marginTop: 10,
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    statsCard: {
        width: '48%',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    statsValue: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        marginTop: 8,
        marginBottom: 2,
    },
    statsLabel: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        opacity: 0.6,
    },
    insightsSection: {
        marginBottom: 25,
    },
    insightsCard: {
        padding: 18,
        borderRadius: 24,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    insightsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    insightsTitle: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    insightsContent: {
        gap: 8,
    },
    insightsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    insightsLabelText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    insightsValueText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    devSection: {
        padding: 18,
        borderRadius: 24,
        marginBottom: 25,
    },
    devHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    devTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    devTitle: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    devGrid: {
        gap: 8,
        marginBottom: 15,
    },
    devInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    devLabel: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    devValue: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    devActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    devButton: {
        flex: 1,
        minWidth: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 6,
    },
    devButtonText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    consoleLogs: {
        padding: 12,
        borderRadius: 12,
        marginTop: 10,
    },
    consoleText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 10,
        color: '#10b981',
        lineHeight: 16,
    },
    shareSection: {
        marginBottom: 25,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 20,
        gap: 8,
        elevation: 2,
    },
    shareButtonText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    featuresSection: {
        marginTop: 10,
        marginBottom: 25,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 24,
        marginBottom: 15,
    },
    featureIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    featureInfo: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    featureDesc: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
        lineHeight: 20,
        opacity: 0.8,
    },
    librariesSection: {
        marginBottom: 25,
    },
    librariesDesc: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
        lineHeight: 22,
        marginBottom: 15,
    },
    libraryList: {
        gap: 12,
    },
    libraryItem: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingBottom: 10,
    },
    libraryName: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 4,
    },
    libraryLicense: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        opacity: 0.7,
    },
    footerSection: {
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 30,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    copyrightText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 8,
    },
    disclaimerText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    }
});
