import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, PanResponder } from 'react-native';
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
    { name: 'Bass Boost', values: [6, 4, 2, 0, 0, 0] },
    { name: 'Rock', values: [4, 2, 1, 2, 4, 5] },
    { name: 'Pop', values: [-1, 2, 4, 3, 0, -1] },
    { name: 'Jazz', values: [3, 2, 1, 2, 1, 3] },
    { name: 'Electronic', values: [5, 3, 0, 2, 4, 5] },
];

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

                {/* Helper markers */}
                {[...Array(5)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.marker,
                            {
                                top: (SLIDER_HEIGHT / 4) * i,
                                backgroundColor: i === 2 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'
                            }
                        ]}
                    />
                ))}
            </View>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        </View>
    );
};

export const EqualizerScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [bandValues, setBandValues] = useState(BANDS.map(b => b.value));
    const [activePreset, setActivePreset] = useState('Flat');

    const handleBandChange = (index: number, val: number) => {
        const newValues = [...bandValues];
        newValues[index] = val;
        setBandValues(newValues);
        setActivePreset('Custom');
    };

    const applyPreset = (preset: typeof PRESETS[0]) => {
        setBandValues(preset.values);
        setActivePreset(preset.name);
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

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
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

                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Presets</Text>
                    <View style={styles.presetsGrid}>
                        {PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset.name}
                                style={[
                                    styles.presetItem,
                                    {
                                        backgroundColor: theme.card,
                                        borderColor: activePreset === preset.name ? theme.primary : theme.cardBorder
                                    }
                                ]}
                                onPress={() => applyPreset(preset)}
                            >
                                <Text style={[
                                    styles.presetText,
                                    { color: activePreset === preset.name ? theme.primary : theme.text }
                                ]}>
                                    {preset.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={[styles.infoCard, { backgroundColor: theme.card + '80' }]}>
                        <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                            These settings apply a simulated equalizer effect to your music playback.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </ScreenContainer>
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
    card: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 30,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    slidersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 280,
    },
    sliderContainer: {
        alignItems: 'center',
        width: (width - 80) / 6,
    },
    sliderTrackBg: {
        width: 6,
        height: 200,
        borderRadius: 3,
        position: 'relative',
        marginVertical: 10,
    },
    sliderTrackFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: 3,
    },
    sliderKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        position: 'absolute',
        left: -7,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    dbText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 10,
        marginTop: 5,
    },
    marker: {
        position: 'absolute',
        left: -2,
        right: -2,
        height: 1,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 15,
        marginLeft: 5,
    },
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 30,
    },
    presetItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 15,
        borderWidth: 1,
        minWidth: '30%',
        alignItems: 'center',
    },
    presetText: {
        fontSize: 14,
        fontWeight: '600',
    },
    infoCard: {
        flexDirection: 'row',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        gap: 10,
    },
    infoText: {
        fontSize: 12,
        flex: 1,
    },
});
