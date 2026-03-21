import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { LinearGradient } from 'expo-linear-gradient';

export const AboutScreen = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();

    // Subtle floating animation for the logo
    const floatAnim = React.useRef(new Animated.Value(0)).current;

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

    const features = [
        { icon: 'color-palette-outline', title: 'Dynamic Themes', desc: 'Polished UI with glassmorphism and 7+ premium themes including Nebula, Cyber, and Forest.' },
        { icon: 'folder-open-outline', title: 'Local Library Management', desc: 'Seamlessly scan and organize your local music library without limits.' },
    ];



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
                    <Animated.View style={[styles.logoWrapper, { transform: [{ translateY: floatAnim }] }]}>
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

                    <Text style={[styles.appName, { color: theme.text }]}>Music</Text>
                    <Text style={[styles.appVersion, { color: theme.primary }]}>Version 1.3.0</Text>
                    <Text style={[styles.appDescription, { color: theme.textSecondary }]}>
                        A premium local music player designed for audiophiles who value both aesthetics and performance.
                        No ads, no subscriptions, just your pure music.
                    </Text>


                </View>

                <View style={styles.featuresSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Features</Text>
                    {features.map((f, i) => (
                        <View key={i} style={[styles.featureCard, { backgroundColor: theme.card, borderColor: 'transparent' }]}>
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
        marginTop: 10, // Avoid overlapping with safe area for some devices
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
        marginBottom: 40,
        marginTop: 20,
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
        backgroundColor: 'rgba(255,255,255,0.05)',
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
    socialButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        gap: 15,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        borderWidth: 1,
        gap: 8,
    },
    socialButtonText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    featuresSection: {
        marginTop: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 20,
        letterSpacing: -0.5,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 24,
        marginBottom: 15,
        borderWidth: 1,
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
    footerSection: {
        alignItems: 'center',
        marginTop: 40,
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
