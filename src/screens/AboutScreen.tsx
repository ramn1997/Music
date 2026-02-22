import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors } from '../theme/colors';

export const AboutScreen = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();

    const features = [
        { icon: 'musical-notes', title: 'Smart Library', desc: 'Auto-organize your local music by Artists, Albums, and Genres.' },
        { icon: 'color-palette', title: 'Premium Themes', desc: 'Six beautiful themes including Glass, Purple, and Deep Blue.' },
        { icon: 'search', title: 'Deep Meta-Scan', desc: 'Fetch high-quality artwork and lyrics directly from the web.' },
        { icon: 'heart', title: 'Smart Playlists', desc: 'Automatically generated Top Songs and Recently Played collections.' },
    ];

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>About</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.appSection}>
                    <View style={[styles.logoContainer, { backgroundColor: theme.primary + '20' }]}>
                        <Image source={require('../../assets/discicon.png')} style={styles.logo} />
                    </View>
                    <Text style={[styles.appName, { color: theme.text }]}>Music</Text>
                    <Text style={[styles.appVersion, { color: theme.textSecondary }]}>Version 1.1.0</Text>
                    <Text style={[styles.appDescription, { color: theme.text }]}>
                        A premium local music player designed for audiophiles who value both aesthetics and performance.
                        No ads, no subscriptions, just your music.
                    </Text>
                </View>

                <View style={styles.featuresSection}>
                    <Text style={[styles.sectionTitle, { color: theme.primary }]}>Key Features</Text>
                    {features.map((f, i) => (
                        <View key={i} style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                            <View style={[styles.featureIcon, { backgroundColor: theme.primary + '15' }]}>
                                <Ionicons name={f.icon as any} size={22} color={theme.primary} />
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
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
        paddingBottom: 150,
    },
    appSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: 12,
    },
    appName: {
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 5,
    },
    appVersion: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 20,
        letterSpacing: 1,
    },
    appDescription: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    featuresSection: {
        marginBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 20,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureInfo: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 13,
        lineHeight: 18,
    }
});
