import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/ThemeContext';
import { useHomeSettings, HomeSection } from '../hooks/HomeSettingsContext';

interface CustomizeHomeModalProps {
    visible: boolean;
    onClose: () => void;
}

const SECTION_INFO: Record<HomeSection, { title: string; description: string; icon: string }> = {
    collections: {
        title: "Quick Cards",
        description: "Liked Songs & Mostly Played grids",
        icon: "grid-outline"
    },
    likedSongs: {
        title: "Liked Songs Card",
        description: "Show Liked Songs inside Quick Cards",
        icon: "heart-outline"
    },
    mostlyPlayed: {
        title: "Mostly Played Card",
        description: "Show Mostly Played inside Quick Cards",
        icon: "trending-up-outline"
    },
    dailyMix: {
        title: "Fresh Mix",
        description: "Handpicked recommendations updated daily",
        icon: "sparkles-outline"
    },
    yearMix: {
        title: "Memory Lane",
        description: "Songs grouped by release year & decades",
        icon: "calendar-outline"
    },
    favorites: {
        title: "Favorites",
        description: "Quick links to starred albums, artists, genres",
        icon: "star-outline"
    },
    playlists: {
        title: "Playlists",
        description: "Your custom created playlists",
        icon: "library-outline"
    },
    history: {
        title: "Listening History",
        description: "Recently played, added, and never played mixes",
        icon: "time-outline"
    },
    topSongs: {
        title: "Top Songs",
        description: "List of your most frequently played songs",
        icon: "stats-chart-outline"
    },
    topAlbums: {
        title: "Top Albums",
        description: "Albums you listen to most",
        icon: "disc-outline"
    },
    topArtists: {
        title: "Top Artists",
        description: "Artists you stream frequently",
        icon: "people-outline"
    },
    madeForYou: {
        title: "Made For You",
        description: "Special recommendation mixes",
        icon: "gift-outline"
    }
};

export const CustomizeHomeModal = ({ visible, onClose }: CustomizeHomeModalProps) => {
    const { theme, themeType } = useTheme();
    const { sectionVisibility, toggleSectionVisibility, sectionOrder, updateSectionOrder, resetToDefault } = useHomeSettings();
    const isLight = themeType === 'light';
    const insets = useSafeAreaInsets();

    // Move section up
    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newOrder = [...sectionOrder];
        const temp = newOrder[index];
        newOrder[index] = newOrder[index - 1];
        newOrder[index - 1] = temp;
        updateSectionOrder(newOrder);
    };

    // Move section down
    const handleMoveDown = (index: number) => {
        if (index === sectionOrder.length - 1) return;
        const newOrder = [...sectionOrder];
        const temp = newOrder[index];
        newOrder[index] = newOrder[index + 1];
        newOrder[index + 1] = temp;
        updateSectionOrder(newOrder);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={[
                    styles.modalContainer,
                    {
                        backgroundColor: theme.menuBackground || theme.card || '#111',
                        borderColor: theme.cardBorder || '#222',
                        borderWidth: 1
                    }
                ]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.cardBorder || '#222' }]}>
                        <View style={styles.headerTitleWrap}>
                            <Ionicons name="grid-outline" size={22} color={theme.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.headerTitle, { color: theme.text }]}>Customize Home</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Scrollable list */}
                    <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                            Drag & Reorder or Toggle sections to personalize your Home Screen:
                        </Text>

                        {sectionOrder.map((section, index) => {
                            const info = SECTION_INFO[section];
                            if (!info) return null;
                            const isVisible = sectionVisibility[section];

                            return (
                                <View key={section} style={styles.sectionItemContainer}>
                                    <View style={[
                                        styles.sectionItem,
                                        {
                                            backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                                            borderColor: theme.cardBorder || '#222',
                                            borderWidth: 1
                                        }
                                    ]}>
                                        {/* Reorder Controls */}
                                        <View style={styles.reorderGroup}>
                                            <TouchableOpacity
                                                disabled={index === 0}
                                                onPress={() => handleMoveUp(index)}
                                                style={[styles.arrowButton, index === 0 && styles.disabledArrow]}
                                            >
                                                <Ionicons name="chevron-up" size={20} color={index === 0 ? (isLight ? '#cbd5e1' : '#444') : theme.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                disabled={index === sectionOrder.length - 1}
                                                onPress={() => handleMoveDown(index)}
                                                style={[styles.arrowButton, index === sectionOrder.length - 1 && styles.disabledArrow]}
                                            >
                                                <Ionicons name="chevron-down" size={20} color={index === sectionOrder.length - 1 ? (isLight ? '#cbd5e1' : '#444') : theme.text} />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Icon */}
                                        <View style={[styles.iconWrapper, { backgroundColor: theme.primary + '15' }]}>
                                            <Ionicons name={info.icon as any} size={20} color={theme.primary} />
                                        </View>

                                        {/* Name & Desc */}
                                        <View style={styles.infoGroup}>
                                            <Text style={[styles.itemTitle, { color: theme.text }]}>{info.title}</Text>
                                            <Text numberOfLines={2} style={[styles.itemDesc, { color: theme.textSecondary }]}>{info.description}</Text>
                                        </View>

                                        {/* Visibility Toggle Switch */}
                                        <Switch
                                            value={isVisible}
                                            onValueChange={() => toggleSectionVisibility(section)}
                                            trackColor={{ false: isLight ? '#e2e8f0' : '#3e3e3e', true: theme.primary }}
                                            thumbColor={'#ffffff'}
                                        />
                                    </View>

                                    {/* Nested controls for quick cards */}
                                    {section === 'collections' && isVisible && (
                                        <View style={[styles.nestedContainer, { borderColor: theme.cardBorder || '#222' }]}>
                                            {/* Liked Songs Toggle */}
                                            <View style={styles.nestedRow}>
                                                <Ionicons name={SECTION_INFO.likedSongs.icon as any} size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.nestedText, { color: theme.text }]}>{SECTION_INFO.likedSongs.title}</Text>
                                                    <Text style={[styles.nestedDesc, { color: theme.textSecondary }]}>{SECTION_INFO.likedSongs.description}</Text>
                                                </View>
                                                <Switch
                                                    value={sectionVisibility.likedSongs}
                                                    onValueChange={() => toggleSectionVisibility('likedSongs')}
                                                    trackColor={{ false: isLight ? '#e2e8f0' : '#3e3e3e', true: theme.primary }}
                                                    thumbColor={'#ffffff'}
                                                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                                />
                                            </View>

                                            <View style={[styles.nestedDivider, { backgroundColor: theme.cardBorder || '#222' }]} />

                                            {/* Mostly Played Toggle */}
                                            <View style={styles.nestedRow}>
                                                <Ionicons name={SECTION_INFO.mostlyPlayed.icon as any} size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.nestedText, { color: theme.text }]}>{SECTION_INFO.mostlyPlayed.title}</Text>
                                                    <Text style={[styles.nestedDesc, { color: theme.textSecondary }]}>{SECTION_INFO.mostlyPlayed.description}</Text>
                                                </View>
                                                <Switch
                                                    value={sectionVisibility.mostlyPlayed}
                                                    onValueChange={() => toggleSectionVisibility('mostlyPlayed')}
                                                    trackColor={{ false: isLight ? '#e2e8f0' : '#3e3e3e', true: theme.primary }}
                                                    thumbColor={'#ffffff'}
                                                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                                />
                                            </View>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>

                    {/* Bottom Actions */}
                    <View style={[
                        styles.footer,
                        {
                            borderTopColor: theme.cardBorder || '#222',
                            paddingBottom: Math.max(insets.bottom, 24) + 16
                        }
                    ]}>
                        <TouchableOpacity
                            onPress={() => {
                                resetToDefault();
                            }}
                            style={[styles.resetButton, { borderColor: theme.cardBorder || '#222', borderWidth: 1 }]}
                        >
                            <Ionicons name="refresh-outline" size={18} color={theme.text} style={{ marginRight: 6 }} />
                            <Text style={[styles.resetButtonText, { color: theme.text }]}>Reset Defaults</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.doneButton, { backgroundColor: theme.primary }]}
                        >
                            <Text style={[styles.doneButtonText, { color: theme.textOnPrimary }]}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '85%',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'PlusJakartaSans_700Bold',
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    closeButton: {
        padding: 4,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 40,
    },
    sectionHeading: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginBottom: 20,
    },
    sectionItemContainer: {
        marginBottom: 12,
    },
    sectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    reorderGroup: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        gap: 2,
    },
    arrowButton: {
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledArrow: {
        opacity: 0.3,
    },
    iconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoGroup: {
        flex: 1,
        marginRight: 8,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    itemDesc: {
        fontSize: 11,
        marginTop: 2,
        fontFamily: 'PlusJakartaSans_500Medium',
        opacity: 0.8,
    },
    nestedContainer: {
        marginLeft: 40,
        marginTop: 8,
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.01)',
    },
    nestedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    nestedText: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    nestedDesc: {
        fontSize: 10,
        opacity: 0.6,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    nestedDivider: {
        height: 1,
        marginVertical: 2,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 18,
        borderTopWidth: 1,
        gap: 16,
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 18,
    },
    resetButtonText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    doneButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
});
