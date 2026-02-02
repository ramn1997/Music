import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../hooks/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';

export const SettingsScreen = () => {
    const { theme, themeType, setThemeType } = useTheme();
    const [themeExpanded, setThemeExpanded] = useState(false);
    const navigation = useNavigation();
    const { fetchMusic, loading } = useMusicLibrary();


    return (
        <ScreenContainer variant="settings">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>App Theme</Text>

                    <TouchableOpacity
                        style={[styles.row, { backgroundColor: theme.card }]}
                        onPress={() => setThemeExpanded(!themeExpanded)}
                    >
                        <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                            <Ionicons name="color-palette" size={20} color={theme.text} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.text }]}>Current Theme</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                                {themeType === 'system' ? 'System Default' : themeType.charAt(0).toUpperCase() + themeType.slice(1)}
                            </Text>
                        </View>
                        <Ionicons name={themeExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
                    </TouchableOpacity>

                    {themeExpanded && (
                        <View style={[styles.dropdownContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                            {(['dark', 'purple', 'blue', 'glass'] as const).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.dropdownItem,
                                        { borderBottomColor: theme.cardBorder },
                                        themeType === t && { backgroundColor: theme.primary + '20' }
                                    ]}
                                    onPress={() => {
                                        setThemeType(t);
                                        setThemeExpanded(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.dropdownText,
                                        { color: theme.text },
                                        themeType === t && { color: theme.primary, fontWeight: 'bold' }
                                    ]}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </Text>
                                    {themeType === t && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Media</Text>
                    <TouchableOpacity
                        style={[styles.row, { backgroundColor: '#ec4899' + '20', borderColor: '#ec4899', borderWidth: 1 }]}
                        onPress={fetchMusic}
                        disabled={loading}
                    >
                        <View style={[styles.rowIcon, { backgroundColor: '#ec4899' + '30' }]}>
                            <Ionicons name="phone-portrait-outline" size={20} color="#ff85b3" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: '#ffffff' }]}>
                                {loading ? 'Scanning...' : 'Scan Device for Music'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>App Info</Text>
                    <TouchableOpacity style={[styles.row, { backgroundColor: theme.card }]}>
                        <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                            <Ionicons name="information-circle" size={20} color={theme.text} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.text }]}>About</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Version 1.1.0</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
        paddingHorizontal: 20,
    },
    backButton: {
        marginRight: 15,
        padding: 5,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
    },
    content: {
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '500',
    },
    rowSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    dropdownContainer: {
        marginTop: 5,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    dropdownText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
