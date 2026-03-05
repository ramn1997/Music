import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, FlatList, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../hooks/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { usePlayerContext } from '../hooks/PlayerContext';
import { CompactImportProgress } from '../components/CompactImportProgress';
import { useHomeSettings } from '../hooks/HomeSettingsContext';

export const SettingsScreen = () => {
    const {
        theme,
        themeType,
        setThemeType,
        playerStyle,
        setPlayerStyle,
        isCarouselEnabled,
        setCarouselEnabled,
        navigationStyle,
        setNavigationStyle,
        isSwipeEnabled,
        setSwipeEnabled
    } = useTheme();
    const [themeExpanded, setThemeExpanded] = useState(false);
    const [styleExpanded, setStyleExpanded] = useState(false);
    const [navExpanded, setNavExpanded] = useState(false);
    const navigation = useNavigation<any>();
    const { fetchMusic, loading, scanForFolders, loadSongsFromFolders, refreshMetadata, savedFolders } = useMusicLibrary();
    const { sectionVisibility, toggleSectionVisibility } = useHomeSettings();

    // Folder Picker State
    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [availableFolders, setAvailableFolders] = useState<string[]>([]);
    const [selectedFolders, setSelectedFolders] = useState<string[]>(savedFolders);

    // New state for 2-step picker
    const [pickerStep, setPickerStep] = useState<'storage' | 'folder'>('storage');
    const [targetStorage, setTargetStorage] = useState<string>('');

    const [audioQuality, setAudioQuality] = useState('medium');
    const [isQualityModalVisible, setQualityModalVisible] = useState(false);

    React.useEffect(() => {
        const loadQuality = async () => {
            const saved = await AsyncStorage.getItem('audio_quality');
            if (saved) setAudioQuality(saved);
        };
        loadQuality();
    }, []);

    const saveQuality = async (q: string) => {
        setAudioQuality(q);
        await AsyncStorage.setItem('audio_quality', q);
    };

    const handleOpenFolderPicker = async () => {
        const folders = await scanForFolders();
        if (folders.length > 0) {
            setAvailableFolders(folders);
            const hasExternal = folders.some(f => f.startsWith('SD Card'));
            const hasInternal = folders.some(f => f.startsWith('Internal'));

            if (hasExternal && hasInternal) {
                setPickerStep('storage');
            } else {
                setPickerStep('folder');
                setTargetStorage(hasInternal ? 'Internal' : 'SD Card');
            }
            setSelectedFolders(savedFolders);
            setFolderModalVisible(true);
        } else {
            Alert.alert("No folders found");
        }
    };

    const handleSelectStorage = (type: string) => {
        setTargetStorage(type);
        setPickerStep('folder');
    };

    const toggleFolderSelection = (folder: string) => {
        if (selectedFolders.includes(folder)) {
            setSelectedFolders(selectedFolders.filter(f => f !== folder));
        } else {
            setSelectedFolders([...selectedFolders, folder]);
        }
    };

    const handleConfirmFolders = () => {
        if (selectedFolders.length === 0) {
            Alert.alert("Please select at least one folder");
            return;
        }
        setFolderModalVisible(false);
        loadSongsFromFolders(selectedFolders);
        navigation.navigate('Home');
    };

    return (
        <ScreenContainer variant="settings">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Appearance</Text>
                    <View style={[styles.customSectionContainer, { backgroundColor: theme.card }]}>
                        <TouchableOpacity
                            style={styles.settingsRow}
                            onPress={() => setThemeExpanded(!themeExpanded)}
                        >
                            <View style={styles.rowIcon}>
                                <Ionicons name="color-palette" size={20} color={theme.text} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={[styles.rowTitle, { color: theme.text }]}>App Theme</Text>
                                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                                    {themeType === 'system' ? 'System Default' : themeType.charAt(0).toUpperCase() + themeType.slice(1)}
                                </Text>
                            </View>
                            <Ionicons name={themeExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {themeExpanded && (
                            <View style={[styles.dropdownContainer, { backgroundColor: 'transparent', borderTopWidth: 1, borderColor: theme.cardBorder }]}>
                                {(['fire', 'water', 'forest', 'cyber', 'black', 'light'] as const).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            styles.dropdownItem,
                                            { borderBottomColor: theme.cardBorder },
                                            themeType === t && { backgroundColor: theme.primary + '10' }
                                        ]}
                                        onPress={() => {
                                            setThemeType(t);
                                            setThemeExpanded(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownText,
                                            { color: theme.text },
                                            themeType === t && { color: theme.primary }
                                        ]}>
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </Text>
                                        {themeType === t && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

                        <TouchableOpacity
                            style={styles.settingsRow}
                            onPress={() => setStyleExpanded(!styleExpanded)}
                        >
                            <View style={styles.rowIcon}>
                                <Ionicons name="shapes" size={20} color={theme.text} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Player Style</Text>
                                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                                    {playerStyle.charAt(0).toUpperCase() + playerStyle.slice(1)}
                                </Text>
                            </View>
                            <Ionicons name={styleExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {styleExpanded && (
                            <View style={[styles.dropdownContainer, { backgroundColor: 'transparent', borderTopWidth: 1, borderColor: theme.cardBorder }]}>
                                {(['square', 'sharp', 'circle'] as const).map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[
                                            styles.dropdownItem,
                                            { borderBottomColor: theme.cardBorder },
                                            playerStyle === s && { backgroundColor: theme.primary + '10' }
                                        ]}
                                        onPress={() => {
                                            setPlayerStyle(s);
                                            setStyleExpanded(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownText,
                                            { color: theme.text },
                                            playerStyle === s && { color: theme.primary }
                                        ]}>
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </Text>
                                        {playerStyle === s && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

                        <TouchableOpacity
                            style={styles.settingsRow}
                            onPress={() => setNavExpanded(!navExpanded)}
                        >
                            <View style={styles.rowIcon}>
                                <Ionicons name="navigate-circle" size={20} color={theme.text} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Navigation Bar</Text>
                                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                                    {navigationStyle.charAt(0).toUpperCase() + navigationStyle.slice(1)} Width
                                </Text>
                            </View>
                            <Ionicons name={navExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {navExpanded && (
                            <View style={[styles.dropdownContainer, { backgroundColor: 'transparent', borderTopWidth: 1, borderColor: theme.cardBorder }]}>
                                {(['full', 'pill'] as const).map((n) => (
                                    <TouchableOpacity
                                        key={n}
                                        style={[
                                            styles.dropdownItem,
                                            { borderBottomColor: theme.cardBorder },
                                            navigationStyle === n && { backgroundColor: theme.primary + '10' }
                                        ]}
                                        onPress={() => {
                                            setNavigationStyle(n);
                                            setNavExpanded(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownText,
                                            { color: theme.text },
                                            navigationStyle === n && { color: theme.primary }
                                        ]}>
                                            {n.charAt(0).toUpperCase() + n.slice(1)}
                                        </Text>
                                        {navigationStyle === n && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Player Customization</Text>
                    <View style={[styles.customSectionContainer, { backgroundColor: theme.card }]}>
                        <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                            <View style={styles.toggleRowInfo}>
                                <Ionicons name="albums-outline" size={20} color={theme.text} style={{ marginRight: 15 }} />
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Carousel View</Text>
                            </View>
                            <Switch
                                value={isCarouselEnabled}
                                onValueChange={setCarouselEnabled}
                                trackColor={{ false: '#3e3e3e', true: theme.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
                        <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                            <View style={styles.toggleRowInfo}>
                                <Ionicons name="swap-horizontal-outline" size={20} color={theme.text} style={{ marginRight: 15 }} />
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Swipe Artwork to Change</Text>
                            </View>
                            <Switch
                                value={isSwipeEnabled}
                                onValueChange={setSwipeEnabled}
                                trackColor={{ false: '#3e3e3e', true: theme.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Home Customization</Text>
                    <View style={[styles.customSectionContainer, { backgroundColor: theme.card }]}>
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleRowInfo}>
                                <Ionicons name="grid-outline" size={20} color={theme.text} style={{ marginRight: 15 }} />
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Show Collections</Text>
                            </View>
                            <Switch
                                value={sectionVisibility.collections}
                                onValueChange={() => toggleSectionVisibility('collections')}
                                trackColor={{ false: '#3e3e3e', true: theme.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleRowInfo}>
                                <Ionicons name="library-outline" size={20} color={theme.text} style={{ marginRight: 15 }} />
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Show Playlists</Text>
                            </View>
                            <Switch
                                value={sectionVisibility.playlists}
                                onValueChange={() => toggleSectionVisibility('playlists')}
                                trackColor={{ false: '#3e3e3e', true: theme.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleRowInfo}>
                                <Ionicons name="heart-outline" size={20} color={theme.text} style={{ marginRight: 15 }} />
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Show Favorites</Text>
                            </View>
                            <Switch
                                value={sectionVisibility.favorites}
                                onValueChange={() => toggleSectionVisibility('favorites')}
                                trackColor={{ false: '#3e3e3e', true: theme.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleRowInfo}>
                                <Ionicons name="time-outline" size={20} color={theme.text} style={{ marginRight: 15 }} />
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Show History</Text>
                            </View>
                            <Switch
                                value={sectionVisibility.history}
                                onValueChange={() => toggleSectionVisibility('history')}
                                trackColor={{ false: '#3e3e3e', true: theme.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleRowInfo}>
                                <Ionicons name="stats-chart-outline" size={20} color={theme.text} style={{ marginRight: 15 }} />
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Show Top Songs</Text>
                            </View>
                            <Switch
                                value={sectionVisibility.topSongs}
                                onValueChange={() => toggleSectionVisibility('topSongs')}
                                trackColor={{ false: '#3e3e3e', true: theme.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.textSecondary + '10' }]} />
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleRowInfo}>
                                <Ionicons name="people-outline" size={20} color={theme.text} style={{ marginRight: 15 }} />
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Show Top Artists</Text>
                            </View>
                            <Switch
                                value={sectionVisibility.topArtists}
                                onValueChange={() => toggleSectionVisibility('topArtists')}
                                trackColor={{ false: '#3e3e3e', true: theme.primary }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Audio</Text>
                    <View style={[styles.customSectionContainer, { backgroundColor: theme.card }]}>
                        <TouchableOpacity
                            style={styles.settingsRow}
                            onPress={() => navigation.navigate('Equalizer')}
                        >
                            <View style={styles.rowIcon}>
                                <Ionicons name="options-outline" size={20} color={theme.primary} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Equalizer</Text>
                                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Presets & Custom Bands</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: theme.textSecondary + '10' }]} />

                        <TouchableOpacity
                            style={styles.settingsRow}
                            onPress={() => setQualityModalVisible(true)}
                        >
                            <View style={styles.rowIcon}>
                                <Ionicons name="stats-chart" size={20} color={theme.secondary} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Audio Quality</Text>
                                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>{audioQuality.charAt(0).toUpperCase() + audioQuality.slice(1)} • Responsive</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Library & Maintenance</Text>
                    <View style={[styles.customSectionContainer, { backgroundColor: theme.card }]}>
                        <TouchableOpacity
                            style={styles.settingsRow}
                            onPress={handleOpenFolderPicker}
                            disabled={loading}
                        >
                            <View style={styles.rowIcon}>
                                <Ionicons name="folder-open" size={20} color={theme.secondary} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Music Folders</Text>
                                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Pick specific folders to scan</Text>
                            </View>
                            {loading ? <Ionicons name="sync" size={20} color={theme.primary} /> : <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />}
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

                        <TouchableOpacity
                            style={styles.settingsRow}
                            onPress={() => refreshMetadata()}
                            disabled={loading}
                        >
                            <View style={styles.rowIcon}>
                                <Ionicons name="refresh-circle" size={20} color={theme.primary} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Scan for New Music</Text>
                                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Find recently added songs</Text>
                            </View>
                            <Ionicons name="sparkles" size={20} color={theme.primary} />
                        </TouchableOpacity>

                        <CompactImportProgress />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>About</Text>
                    <View style={[styles.customSectionContainer, { backgroundColor: theme.card }]}>
                        <TouchableOpacity
                            style={styles.settingsRow}
                            onPress={() => navigation.navigate('About')}
                        >
                            <View style={styles.rowIcon}>
                                <Ionicons name="information-circle" size={20} color={theme.text} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Music</Text>
                                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Version 1.2.0</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Audio Quality Modal */}
                <Modal
                    visible={isQualityModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setQualityModalVisible(false)}
                >
                    <TouchableOpacity
                        style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
                        activeOpacity={1}
                        onPress={() => setQualityModalVisible(false)}
                    >
                        <View
                            style={[
                                styles.premiumModal,
                                { backgroundColor: theme.card, borderColor: theme.cardBorder }
                            ]}
                        >
                            <View style={styles.modalIndictor} />

                            <View style={styles.premiumModalHeader}>
                                <Text style={[styles.premiumModalTitle, { color: theme.text }]}>Playback Quality</Text>
                                <Text style={[styles.premiumModalSub, { color: theme.textSecondary }]}>Tailor the audio engine performance</Text>
                            </View>

                            <View style={styles.qualityCardsGrid}>
                                {[
                                    {
                                        id: 'high',
                                        label: 'Ultra High',
                                        desc: '32-bit float processing • Best detail',
                                        icon: 'diamond-outline',
                                        color: '#fbbf24'
                                    },
                                    {
                                        id: 'medium',
                                        label: 'Balanced',
                                        desc: 'Efficient buffer • Stable performance',
                                        icon: 'flash-outline',
                                        color: theme.primary
                                    },
                                    {
                                        id: 'low',
                                        label: 'Power Saver',
                                        desc: 'Reduced CPU load • Fast loading',
                                        icon: 'leaf-outline',
                                        color: '#10b981'
                                    }
                                ].map((opt) => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[
                                            styles.premiumQualityCard,
                                            { backgroundColor: theme.background, borderColor: theme.cardBorder },
                                            audioQuality === opt.id && { borderColor: theme.primary, borderWidth: 2 }
                                        ]}
                                        onPress={() => {
                                            saveQuality(opt.id);
                                            setQualityModalVisible(false);
                                        }}
                                    >
                                        <View style={[styles.qualityLabelRow]}>
                                            <View style={[styles.miniIconCircle, { backgroundColor: opt.color + '20' }]}>
                                                <Ionicons name={opt.icon as any} size={18} color={opt.color} />
                                            </View>
                                            <Text style={[styles.premiumOptionLabel, { color: theme.text }]}>{opt.label}</Text>
                                            {audioQuality === opt.id && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                                        </View>
                                        <Text style={[styles.premiumOptionDesc, { color: theme.textSecondary }]}>{opt.desc}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.premiumCloseBtn, { backgroundColor: theme.primary }]}
                                onPress={() => setQualityModalVisible(false)}
                            >
                                <Text style={[styles.premiumCloseText, { color: '#fff' }]}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </ScrollView>

            <Modal
                visible={folderModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setFolderModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>
                                {pickerStep === 'storage' ? 'Select Storage' : 'Select Folders'}
                            </Text>
                            <TouchableOpacity onPress={() => setFolderModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        {pickerStep === 'storage' ? (
                            <View style={{ padding: 20 }}>
                                <TouchableOpacity
                                    style={[styles.storageOption, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                                    onPress={() => handleSelectStorage('Internal')}
                                >
                                    <View style={[styles.storageIcon, { backgroundColor: theme.primary + '15' }]}>
                                        <Ionicons name="phone-portrait-outline" size={24} color={theme.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.storageTitle, { color: theme.text }]}>Internal Storage</Text>
                                        <Text style={[styles.storageSubtitle, { color: theme.textSecondary }]}>Browse device files</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.storageOption, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                                    onPress={() => handleSelectStorage('SD Card')}
                                >
                                    <View style={[styles.storageIcon, { backgroundColor: (theme.secondary || theme.primary) + '15' }]}>
                                        <Ionicons name="save-outline" size={24} color={theme.secondary || theme.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.storageTitle, { color: theme.text }]}>SD Card</Text>
                                        <Text style={[styles.storageSubtitle, { color: theme.textSecondary }]}>External memory</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <FlatList
                                    data={availableFolders.filter(f => f.startsWith(targetStorage))}
                                    keyExtractor={item => item}
                                    contentContainerStyle={{ padding: 20 }}
                                    renderItem={({ item }) => {
                                        const isSelected = selectedFolders.includes(item);
                                        return (
                                            <TouchableOpacity
                                                style={styles.folderItem}
                                                onPress={() => toggleFolderSelection(item)}
                                            >
                                                <View style={styles.folderRow}>
                                                    <View style={[styles.folderIconWrapper, { backgroundColor: item.startsWith('SD Card') ? (theme.secondary || theme.primary) + '15' : theme.primary + '15' }]}>
                                                        <Ionicons
                                                            name={item.startsWith('SD Card') ? "save" : "folder"}
                                                            size={20}
                                                            color={item.startsWith('SD Card') ? theme.secondary || theme.primary : theme.primary}
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.folderName, { color: theme.text }]}>
                                                            {item.includes(' > ') ? item.split(' > ')[1] : item}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={[
                                                    styles.checkbox,
                                                    {
                                                        borderColor: isSelected ? theme.primary : theme.textSecondary + '40',
                                                        backgroundColor: isSelected ? theme.primary : 'transparent'
                                                    }
                                                ]}>
                                                    {isSelected && <Ionicons name="checkmark" size={14} color={theme.textOnPrimary} />}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                                <View style={[styles.modalFooter, { borderTopColor: theme.cardBorder }]}>
                                    <TouchableOpacity
                                        style={[styles.cancelButton, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1 }]}
                                        onPress={() => setPickerStep('storage')}
                                    >
                                        <Text style={[styles.buttonText, { color: theme.text }]}>Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.applyButton, { backgroundColor: theme.primary }]}
                                        onPress={handleConfirmFolders}
                                    >
                                        <Text style={[styles.buttonText, { color: theme.textOnPrimary }]}>
                                            Select ({selectedFolders.length})
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    backButton: {
        marginRight: 20,
        padding: 5,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.5,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 140,
        paddingTop: 10,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        color: colors.textSecondary,
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 12,
        paddingLeft: 10,
        letterSpacing: 0.5,
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    rowSubtitle: {
        fontSize: 12,
        marginTop: 2,
        opacity: 0.6,
    },
    dropdownContainer: {
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingLeft: 68,
    },
    dropdownText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContainer: {
        borderRadius: 32,
        maxHeight: '85%',
        overflow: 'hidden',
        borderWidth: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    folderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    folderIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    folderName: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 7,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        gap: 15,
    },
    cancelButton: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyButton: {
        flex: 2,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    storageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 15,
    },
    storageIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    storageTitle: {
        fontSize: 17,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 2,
    },
    storageSubtitle: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
        opacity: 0.6,
    },
    customSectionContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        paddingVertical: 5,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    toggleRowInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        marginHorizontal: 20,
    },
    premiumModal: {
        width: '94%',
        borderRadius: 40,
        padding: 24,
        paddingBottom: 32,
        borderWidth: 1,
        alignSelf: 'center',
    },
    modalIndictor: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'center',
        marginBottom: 24,
    },
    premiumModalHeader: {
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    premiumModalTitle: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.5,
    },
    premiumModalSub: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginTop: 4,
        opacity: 0.6,
    },
    qualityCardsGrid: {
        gap: 12,
    },
    premiumQualityCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
    },
    qualityLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    miniIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    premiumOptionLabel: {
        fontSize: 17,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        flex: 1,
    },
    premiumOptionDesc: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
        lineHeight: 18,
        opacity: 0.7,
    },
    premiumCloseBtn: {
        marginTop: 32,
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    premiumCloseText: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
});
