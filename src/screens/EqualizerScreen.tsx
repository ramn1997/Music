import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, PanResponder, Alert, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { AudioEqualizer } = NativeModules;
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const BANDS = [
    { label: '60Hz', value: 0 },
    { label: '150Hz', value: 0 },
    { label: '400Hz', value: 0 },
    { label: '1.1kHz', value: 0 },
    { label: '2.4kHz', value: 0 },
    { label: '15kHz', value: 0 },
];

const PRESETS = [
    { name: 'Flat', values: [0, 0, 0, 0, 0, 0] },
    { name: 'Bass Boost', values: [8, 6, 3, 1, 0, 0] },
    { name: 'Rock', values: [5, 4, 3, 4, 5, 6] },
    { name: 'Pop', values: [-2, 1, 4, 5, 2, -1] },
    { name: 'Jazz', values: [4, 3, 1, 3, 2, 4] },
    { name: 'Classical', values: [5, 4, 0, 0, 0, 4] },
    { name: 'Dance', values: [6, 0, 2, 4, 5, 0] },
    { name: 'Acoustic', values: [4, 4, 2, 3, 4, 2] },
    { name: 'Electronic', values: [7, 5, 0, 3, 6, 7] },
];

const EQUALIZER_STATE_KEY = 'equalizer_settings_v1';

interface SliderProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    theme: any;
}

const VerticalSlider = ({ label, value, onChange, theme }: SliderProps) => {
    const SLIDER_HEIGHT = 200;
    const RANGE = 12; // -12 to +12 dB

    const getPosFromValue = (val: number) => {
        // val is -12 to 12
        const percentage = (val + RANGE) / (RANGE * 2);
        return SLIDER_HEIGHT * (1 - percentage);
    };

    const getValueFromPos = (pos: number) => {
        const percentage = 1 - (pos / SLIDER_HEIGHT);
        const val = (percentage * RANGE * 2) - RANGE;
        return Math.round(val);
    };

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
            const pos = Math.min(Math.max(evt.nativeEvent.locationY, 0), SLIDER_HEIGHT);
            onChange(getValueFromPos(pos));
        },
        onPanResponderMove: (evt) => {
            const pos = Math.min(Math.max(evt.nativeEvent.locationY, 0), SLIDER_HEIGHT);
            onChange(getValueFromPos(pos));
        },
    });

    const knobPos = getPosFromValue(value);

    return (
        <View style={styles.sliderContainer}>
            <Text style={[styles.dbText, { color: theme.textSecondary }]}>{value > 0 ? `+${value}` : value}dB</Text>
            <View style={[styles.sliderTrackBg, { backgroundColor: 'rgba(255,255,255,0.05)' }]} {...panResponder.panHandlers}>
                <View style={[styles.sliderTrackFill, { height: SLIDER_HEIGHT - knobPos, backgroundColor: theme.primary }]} />
                <View style={[styles.sliderKnob, { top: knobPos - 10, backgroundColor: theme.text }]} />

                <View style={[styles.centerLine, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
            </View>
            <Text style={[styles.dbText, { color: theme.textSecondary }]}>{value > 0 ? `+${value}` : value}</Text>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        </View>
    );
};

export const EqualizerScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [bandValues, setBandValues] = useState(BANDS.map(b => b.value));
    const [activePreset, setActivePreset] = useState('Flat');
    const [isDolbyEnabled, setIsDolbyEnabled] = useState(false);
    const [isHardwareSupported, setIsHardwareSupported] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    React.useEffect(() => {
        loadSettings();
    }, []);

    const applyToNative = async (values: number[]) => {
        if (!AudioEqualizer) return;
        try {
            await AudioEqualizer.applyBands(values);
        } catch (e) {
            console.warn('Native EQ apply failed', e);
        }
    };

    const loadSettings = async () => {
        try {
            const saved = await AsyncStorage.getItem(EQUALIZER_STATE_KEY);
            if (saved) {
                const { values, preset, dolbyEnabled } = JSON.parse(saved);
                setBandValues(values);
                setActivePreset(preset);
                setIsDolbyEnabled(!!dolbyEnabled);
                applyToNative(values);
                if (dolbyEnabled && AudioEqualizer) {
                    AudioEqualizer.setDolbyEnabled(true);
                }
            } else {
                applyToNative(bandValues);
            }

            // Check hardware support
            if (AudioEqualizer) {
                const supported = await AudioEqualizer.isHardwareDolbySupported();
                setIsHardwareSupported(!!supported);
            }
        } catch (e) {
            console.error('Failed to load EQ settings', e);
        } finally {
            setIsLoaded(true);
        }
    };

    const saveSettings = async (values: number[], preset: string, dolby: boolean = isDolbyEnabled) => {
        try {
            await AsyncStorage.setItem(EQUALIZER_STATE_KEY, JSON.stringify({
                values,
                preset,
                dolbyEnabled: dolby,
                updatedAt: Date.now()
            }));
        } catch (e) {
            console.error('Failed to save EQ settings', e);
        }
    };

    const toggleDolby = async () => {
        const newState = !isDolbyEnabled;
        setIsDolbyEnabled(newState);
        saveSettings(bandValues, activePreset, newState);
        if (AudioEqualizer) {
            try {
                await AudioEqualizer.setDolbyEnabled(newState);
            } catch (e) {
                console.warn('Failed to toggle Dolby', e);
            }
        }
    };

    // Debounce native updates for smoother interaction
    const nativeTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleBandChange = (index: number, val: number) => {
        const newValues = [...bandValues];
        newValues[index] = val;
        setBandValues(newValues);
        setActivePreset('Custom');
        saveSettings(newValues, 'Custom');

        if (nativeTimerRef.current) clearTimeout(nativeTimerRef.current);
        nativeTimerRef.current = setTimeout(() => {
            applyToNative(newValues);
        }, 500);
    };

    const applyPreset = (preset: typeof PRESETS[0]) => {
        setBandValues(preset.values);
        setActivePreset(preset.name);
        saveSettings(preset.values, preset.name);
        applyToNative(preset.values);
    };

    return (
        <ScreenContainer variant="settings">
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Equalizer</Text>
                    <TouchableOpacity
                        onPress={() => applyPreset(PRESETS[0])}
                        style={styles.resetButton}
                    >
                        <Text style={{ color: theme.primary, fontWeight: '600' }}>Reset</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.premiumCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                        <View style={styles.dolbyHeader}>
                            <View style={styles.dolbyTitleWrapper}>
                                <Text style={[styles.premiumTitle, { color: theme.text }]}>Dolby Audio</Text>
                                <Text style={[styles.premiumSub, { color: theme.textSecondary }]}>
                                    {isHardwareSupported ? 'Hardware Output Enabled' : 'Software Logic Applied'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={toggleDolby}
                                style={[
                                    styles.premiumToggle,
                                    {
                                        backgroundColor: isDolbyEnabled ? theme.primary : 'rgba(255,255,255,0.05)',
                                    }
                                ]}
                            >
                                <Ionicons name={isDolbyEnabled ? "flash" : "flash-outline"} size={18} color={isDolbyEnabled ? "#fff" : theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {isHardwareSupported && (
                            <TouchableOpacity
                                onPress={() => AudioEqualizer?.openSystemEffects()}
                                style={styles.systemShortcut}
                            >
                                <Text style={[styles.shortcutText, { color: theme.primary }]}>Open Hardware Panel</Text>
                                <Ionicons name="open-outline" size={14} color={theme.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={[styles.mainEqualizerBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                        <Text style={[styles.boxTitle, { color: theme.textSecondary }]}>Fine Tune Frequency</Text>
                        <View style={styles.slidersRow}>
                            {BANDS.map((band, index) => (
                                <VerticalSlider
                                    key={band.label}
                                    label={band.label}
                                    value={bandValues[index]}
                                    onChange={(val) => handleBandChange(index, val)}
                                    theme={theme}
                                />
                            ))}
                        </View>
                    </View>

                    <Text style={[styles.sectionHeader, { color: theme.text }]}>Audio Profiles</Text>
                    <View style={styles.presetsWrapper}>
                        {PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset.name}
                                style={[
                                    styles.modernPreset,
                                    {
                                        backgroundColor: activePreset === preset.name ? theme.primary : theme.card,
                                        borderColor: activePreset === preset.name ? theme.primary : theme.cardBorder
                                    }
                                ]}
                                onPress={() => applyPreset(preset)}
                            >
                                <Text style={[
                                    styles.modernPresetText,
                                    { color: activePreset === preset.name ? '#fff' : theme.text }
                                ]}>
                                    {preset.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={[styles.minimalInfo, { backgroundColor: 'transparent' }]}>
                        <Text style={[styles.minimalInfoText, { color: theme.textSecondary }]}>
                            Adjustments may take a moment to reflect in playback.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView >
        </ScreenContainer >
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    resetButton: {
        padding: 5,
    },
    content: {
        padding: 20,
    },
    premiumCard: {
        padding: 24,
        borderRadius: 30,
        borderWidth: 1,
        marginBottom: 20,
        flexDirection: 'column',
    },
    dolbyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dolbyTitleWrapper: {
        flex: 1,
    },
    premiumTitle: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        letterSpacing: -0.5,
    },
    premiumSub: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        opacity: 0.6,
        marginTop: 2,
    },
    premiumToggle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    systemShortcut: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 15,
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    shortcutText: {
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    mainEqualizerBox: {
        padding: 24,
        borderRadius: 30,
        borderWidth: 1,
        marginBottom: 30,
    },
    boxTitle: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 25,
        textAlign: 'center',
        opacity: 0.5,
    },
    slidersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 250,
    },
    sliderContainer: {
        alignItems: 'center',
        width: (width - 100) / 6,
    },
    sliderWrapper: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sliderTrackBg: {
        width: 14,
        height: 180,
        borderRadius: 7,
        position: 'relative',
        overflow: 'hidden',
    },
    sliderTrackFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: 7,
    },
    sliderKnob: {
        width: 14,
        height: 24,
        borderRadius: 7,
        position: 'absolute',
        left: 0,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    centerLine: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 1,
    },
    dbText: {
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginTop: 12,
    },
    label: {
        fontSize: 9,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginTop: 4,
        opacity: 0.6,
    },
    sectionHeader: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 15,
        marginLeft: 5,
    },
    presetsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 30,
    },
    modernPreset: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
    },
    modernPresetText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    minimalInfo: {
        padding: 20,
        alignItems: 'center',
    },
    minimalInfoText: {
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_500Medium',
        textAlign: 'center',
        opacity: 0.5,
    },
});
