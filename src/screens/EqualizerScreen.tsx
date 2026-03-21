import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, PanResponder, Dimensions, Animated } from 'react-native';
import { useEqualizer } from '../hooks/useEqualizer';
import { useTheme } from '../hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const VerticalSlider = ({ value, min, max, onValueChange, activeColor, inactiveColor }: any) => {
    const sliderHeight = 180;
    const thumbSize = 24;

    const animatedValue = useRef(new Animated.Value(value)).current;
    const startValueRef = useRef(value);
    const currentValueRef = useRef(value);
    
    useEffect(() => {
        currentValueRef.current = value;
        Animated.spring(animatedValue, {
            toValue: value,
            useNativeDriver: false,
            friction: 7,
            tension: 40
        }).start();
    }, [value]);

    const calculateValueFromDy = (dy: number, startVal: number) => {
        // Negative dy means dragging UP, which increases the value
        const percentageMove = -(dy / sliderHeight); 
        const valChange = percentageMove * (max - min);
        const newVal = startVal + valChange;
        return Math.max(min, Math.min(newVal, max));
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                startValueRef.current = currentValueRef.current;
            },
            onPanResponderMove: (evt, gestureState) => {
                const val = calculateValueFromDy(gestureState.dy, startValueRef.current);
                currentValueRef.current = val;
                animatedValue.setValue(val);
            },
            onPanResponderRelease: (evt, gestureState) => {
                const val = calculateValueFromDy(gestureState.dy, startValueRef.current);
                currentValueRef.current = val;
                animatedValue.setValue(val);
                onValueChange(val);
            },
        })
    ).current;

    const fillHeight = animatedValue.interpolate({
        inputRange: [min, max],
        outputRange: [0, sliderHeight],
        extrapolate: 'clamp'
    });

    const thumbBottom = animatedValue.interpolate({
        inputRange: [min, max],
        outputRange: [-thumbSize / 2, sliderHeight - thumbSize / 2],
        extrapolate: 'clamp'
    });

    return (
        <View style={[styles.sliderWrapper, { height: sliderHeight }]} {...panResponder.panHandlers}>
            <View style={[styles.sliderTrack, { backgroundColor: inactiveColor }]}>
                <Animated.View style={[styles.sliderFill, { height: fillHeight, backgroundColor: activeColor }]} />
            </View>
            <Animated.View style={[
                styles.sliderThumb, 
                { 
                    backgroundColor: '#fff', 
                    bottom: thumbBottom,
                    borderColor: activeColor
                }
            ]} />
        </View>
    );
};

export const EqualizerScreen = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const { info, isEnabled, initialize, setBandLevel, applyPreset, toggleEqualizer } = useEqualizer();
    const [activePreset, setActivePreset] = useState<number | null>(null);

    useEffect(() => {
        initialize();
    }, [initialize]);

    const handlePresetChange = (index: number) => {
        setActivePreset(index);
        applyPreset(index);
    };

    const renderBand = (band: { index: number; centerFreq: number; level: number }) => {
        const freqLabel = band.centerFreq >= 1000 
            ? `${(band.centerFreq / 1000).toFixed(1)}k` 
            : `${band.centerFreq}`;

        return (
            <View key={band.index} style={styles.bandColumn}>
                <Text style={[styles.levelDbText, { color: theme.primary }]}>
                    {(band.level / 100).toFixed(1)}
                </Text>
                
                <VerticalSlider 
                    value={band.level}
                    min={info?.minLevel || -1500}
                    max={info?.maxLevel || 1500}
                    onValueChange={(val: number) => {
                        setActivePreset(null);
                        setBandLevel(band.index, Math.round(val));
                    }}
                    activeColor={theme.primary}
                    inactiveColor={theme.cardBorder}
                />
                
                <Text style={[styles.freqText, { color: theme.textSecondary }]}>{freqLabel}</Text>
            </View>
        );
    };

    return (
        <ScreenContainer variant="settings">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Audio Equalizer</Text>
                <Switch 
                    value={isEnabled} 
                    onValueChange={toggleEqualizer}
                    trackColor={{ false: theme.cardBorder, true: theme.primary }}
                    thumbColor="#fff"
                />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Visualizer Header */}
                <View style={[styles.visualizerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                     <LinearGradient
                        colors={[theme.primary + '30', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    />
                    <View style={styles.cardHeader}>
                        <Ionicons name="pulse" size={24} color={theme.primary} />
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Frequency Control</Text>
                    </View>
                    
                    <View style={styles.slidersContainer}>
                        {info?.bands.map(renderBand)}
                        {!info && (
                            <Text style={{ color: theme.textSecondary, textAlign: 'center', width: '100%', padding: 40 }}>
                                Initializing Audio Engine...
                            </Text>
                        )}
                    </View>
                </View>

                {/* Presets Grid */}
                <View style={styles.presetsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Sound Profiles</Text>
                    <View style={styles.presetsGrid}>
                        {info?.presets.map((preset, index) => {
                            const isActive = activePreset === index;
                            return (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[
                                        styles.presetPill, 
                                        { 
                                            backgroundColor: isActive ? theme.primary : theme.card,
                                            borderColor: isActive ? theme.primary : theme.cardBorder 
                                        }
                                    ]}
                                    onPress={() => handlePresetChange(index)}
                                >
                                    <Text style={[
                                        styles.presetText, 
                                        // Use background color for extreme contrast since primary colors are distinct
                                        { color: isActive ? theme.background : theme.text }
                                    ]}>
                                        {preset}
                                    </Text>
                                    {isActive && <Ionicons name="checkmark-circle" size={16} color={theme.background} style={{ marginLeft: 6 }} />}
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                <View style={{ height: 80 }} />
            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backBtn: { marginRight: 15 },
    title: {
        flex: 1,
        fontSize: 26,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.5,
    },
    content: {
        paddingHorizontal: 16,
    },
    visualizerCard: {
        borderRadius: 32,
        padding: 24,
        marginBottom: 30,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginLeft: 10,
    },
    slidersContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 250, 
    },
    bandColumn: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
    },
    levelDbText: {
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 10,
    },
    freqText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginTop: 15,
        opacity: 0.8,
    },
    sliderWrapper: {
        width: 30,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    sliderTrack: {
        position: 'absolute',
        width: 6,
        height: 180,
        borderRadius: 3,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    sliderFill: {
        width: '100%',
        borderRadius: 3,
    },
    sliderThumb: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    presetsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 15,
        paddingLeft: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    presetPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        marginRight: 12,
        marginBottom: 12,
    },
    presetText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    }
});
