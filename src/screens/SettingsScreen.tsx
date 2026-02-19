import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, FlatList, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../hooks/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { usePlayerContext } from '../hooks/PlayerContext';
import { CompactImportProgress } from '../components/CompactImportProgress';

export const SettingsScreen = () => {
    const { theme, themeType, setThemeType, playerStyle, setPlayerStyle } = useTheme();
    const [themeExpanded, setThemeExpanded] = useState(false);
    const [styleExpanded, setStyleExpanded] = useState(false);
    const navigation = useNavigation<any>();
    const { fetchMusic, loading, scanForFolders, loadSongsFromFolders, refreshMetadata, savedFolders } = useMusicLibrary();
    const { gaplessEnabled, toggleGapless } = usePlayerContext();

    // Folder Picker State
    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [availableFolders, setAvailableFolders] = useState<string[]>([]);
    const [selectedFolders, setSelectedFolders] = useState<string[]>(savedFolders);

    // New state for 2-step picker
    const [pickerStep, setPickerStep] = useState<'storage' | 'folder'>('storage');
    const [targetStorage, setTargetStorage] = useState<string>('');

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
                <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
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
                            {(['dark', 'green', 'purple', 'blue', 'glass', 'black'] as const).map((t) => (
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
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Music Style</Text>
                    <TouchableOpacity
                        style={[styles.row, { backgroundColor: theme.card }]}
                        onPress={() => setStyleExpanded(!styleExpanded)}
                    >
                        <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
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
                        <View style={[styles.dropdownContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                            {(['square', 'sharp', 'rounded', 'soft', 'squircle', 'circle'] as const).map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.dropdownItem,
                                        { borderBottomColor: theme.cardBorder },
                                        playerStyle === s && { backgroundColor: theme.primary + '20' }
                                    ]}
                                    onPress={() => {
                                        setPlayerStyle(s);
                                        setStyleExpanded(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.dropdownText,
                                        { color: theme.text },
                                        playerStyle === s && { color: theme.primary, fontWeight: 'bold' }
                                    ]}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </Text>
                                    {playerStyle === s && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Playback</Text>
                    <View style={[styles.row, { backgroundColor: theme.card }]}>
                        <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                            <Ionicons name="flash-outline" size={20} color={theme.text} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.text }]}>Gapless Playback</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Preload next song for seamless transitions</Text>
                        </View>
                        <Switch
                            value={gaplessEnabled}
                            onValueChange={toggleGapless}
                            trackColor={{ false: theme.cardBorder, true: theme.primary }}
                            thumbColor={'#fff'}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Media Library</Text>
                    <TouchableOpacity
                        style={[styles.row, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1 }]}
                        onPress={handleOpenFolderPicker}
                        disabled={loading}
                    >
                        <View style={[styles.rowIcon, { backgroundColor: theme.secondary + '20' }]}>
                            <Ionicons name="folder-open" size={20} color={theme.secondary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.text }]}>Select Music Folders</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Pick specific folders to scan</Text>
                        </View>
                        {loading ? <Ionicons name="sync" size={20} color={theme.primary} /> : <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.row, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1, marginTop: 10 }]}
                        onPress={() => refreshMetadata()}
                        disabled={loading}
                    >
                        <View style={[styles.rowIcon, { backgroundColor: theme.primary + '20' }]}>
                            <Ionicons name="refresh-circle" size={20} color={theme.primary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.text }]}>Fix Metadata Issues</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Force a deep scan of all music</Text>
                        </View>
                        <Ionicons name="sparkles" size={20} color={theme.primary} />
                    </TouchableOpacity>

                    {/* Inline Import Progress */}
                    <CompactImportProgress />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>App Info</Text>
                    <View style={[styles.row, { backgroundColor: theme.card }]}>
                        <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                            <Ionicons name="information-circle" size={20} color={theme.text} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.text }]}>About</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Version 1.1.0</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={folderModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setFolderModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {pickerStep === 'folder' && availableFolders.some(f => f.startsWith('Internal')) && availableFolders.some(f => f.startsWith('SD Card')) && (
                                    <TouchableOpacity onPress={() => setPickerStep('storage')} style={{ marginRight: 10 }}>
                                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                                    </TouchableOpacity>
                                )}
                                <Text style={[styles.modalTitle, { color: theme.text }]}>
                                    {pickerStep === 'storage' ? 'Select Storage' : `Select Folders (${targetStorage})`}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setFolderModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {pickerStep === 'storage' ? (
                            <View style={{ padding: 20 }}>
                                {availableFolders.some(f => f.startsWith('Internal')) && (
                                    <TouchableOpacity
                                        style={[styles.storageOption, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                                        onPress={() => handleSelectStorage('Internal')}
                                    >
                                        <View style={[styles.storageIcon, { backgroundColor: theme.primary + '20' }]}>
                                            <Ionicons name="phone-portrait-outline" size={32} color={theme.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.storageTitle, { color: theme.text }]}>Internal Storage</Text>
                                            <Text style={[styles.storageSubtitle, { color: theme.textSecondary }]}>Device memory</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                )}

                                {availableFolders.some(f => f.startsWith('SD Card')) && (
                                    <TouchableOpacity
                                        style={[styles.storageOption, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                                        onPress={() => handleSelectStorage('SD Card')}
                                    >
                                        <View style={[styles.storageIcon, { backgroundColor: theme.secondary + '20' }]}>
                                            <Ionicons name="save-outline" size={32} color={theme.secondary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.storageTitle, { color: theme.text }]}>SD Card</Text>
                                            <Text style={[styles.storageSubtitle, { color: theme.textSecondary }]}>External storage</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <>
                                <FlatList
                                    data={availableFolders.filter(f => f.startsWith(targetStorage))}
                                    keyExtractor={item => item}
                                    contentContainerStyle={{ padding: 20 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.folderItem, { borderColor: theme.cardBorder }]}
                                            onPress={() => toggleFolderSelection(item)}
                                        >
                                            <View style={styles.folderRow}>
                                                <Ionicons
                                                    name={item.startsWith('SD Card') ? "save" : "folder"}
                                                    size={24}
                                                    color={item.startsWith('SD Card') ? theme.secondary : theme.primary}
                                                    style={{ marginRight: 12 }}
                                                />
                                                <View>
                                                    <Text style={[styles.folderName, { color: theme.text, fontWeight: '600' }]}>
                                                        {item.includes(' > ') ? item.split(' > ')[1] : item}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: selectedFolders.includes(item) ? colors.primary : 'transparent' }]}>
                                                {selectedFolders.includes(item) && <Ionicons name="checkmark" size={14} color="#fff" />}
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                                <View style={styles.modalFooter}>
                                    <TouchableOpacity
                                        style={[styles.cancelButton, { borderColor: theme.cardBorder }]}
                                        onPress={() => setFolderModalVisible(false)}
                                    >
                                        <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.applyButton, { backgroundColor: colors.primary }]}
                                        onPress={handleConfirmFolders}
                                    >
                                        <Text style={[styles.buttonText, { color: '#fff', fontWeight: 'bold' }]}>
                                            Show Songs ({selectedFolders.length})
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
        paddingBottom: 80, // Added padding for progress bar
        paddingTop: 20,
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
        borderRadius: 20,
        marginBottom: 10,
    },
    rowIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        borderRadius: 20,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContainer: {
        borderRadius: 24,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    folderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    folderName: {
        fontSize: 16,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 8,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        gap: 15,
    },
    cancelButton: {
        flex: 1,
        height: 54,
        borderRadius: 27,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyButton: {
        flex: 1,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
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
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    storageSubtitle: {
        fontSize: 14,
    }
});
