import { NativeModules, Platform } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { useState, useCallback, useEffect } from 'react';

const { EqualizerModule } = NativeModules;

export interface EqualizerInfo {
    numberOfBands: number;
    minLevel: number;
    maxLevel: number;
    bands: {
        index: number;
        centerFreq: number;
        level: number;
    }[];
    presets: string[];
}

export const useEqualizer = () => {
    const [info, setInfo] = useState<EqualizerInfo | null>(null);
    const [isEnabled, setIsEnabled] = useState(false);

    const initialize = useCallback(async () => {
        if (Platform.OS !== 'android') return;

        try {
            // react-native-track-player in this version doesn't expose getAudioSessionId
            // Passing 0 binds the Native Android Equalizer to the global audio output mix!
            const initResult = await EqualizerModule.initializeEqualizer(0);
            const range = await EqualizerModule.getBandLevelRange();
                const presets = await EqualizerModule.getPresets();
                const numBands = initResult.numberOfBands;

                const bands = [];
                for (let i = 0; i < numBands; i++) {
                    const freq = await EqualizerModule.getBandCenterFreq(i);
                    // Band frequency is in milliHertz, convert to Hz
                    bands.push({
                        index: i,
                        centerFreq: freq / 1000,
                        level: 0 // Default or fetch current if needed
                    });
                }

                setInfo({
                    numberOfBands: numBands,
                    minLevel: range[0],
                    maxLevel: range[1],
                    bands,
                    presets
                });
                
                // User requested Equalizer OFF by default on load
                await EqualizerModule.setEnabled(false);
                setIsEnabled(false);
        } catch (e) {
            console.error('[useEqualizer] Initialization failed:', e);
        }
    }, []);

    const setBandLevel = useCallback(async (band: number, level: number) => {
        if (Platform.OS !== 'android') return;
        try {
            await EqualizerModule.setBandLevel(band, level);
            setInfo(prev => {
                if (!prev) return null;
                const newBands = [...prev.bands];
                newBands[band] = { ...newBands[band], level };
                return { ...prev, bands: newBands };
            });
        } catch (e) {
            console.error('[useEqualizer] Set band level failed:', e);
        }
    }, []);

    const applyPreset = useCallback(async (index: number) => {
        if (Platform.OS !== 'android') return;
        try {
            await EqualizerModule.applyPreset(index);
            // Fetch updated levels from native
            const newLevels = await EqualizerModule.getBandLevels();
            setInfo(prev => {
                if (!prev) return null;
                const newBands = prev.bands.map((b, i) => ({ ...b, level: newLevels[i] }));
                return { ...prev, bands: newBands };
            });
        } catch (e) {
            console.error('[useEqualizer] Apply preset failed:', e);
        }
    }, []);

    const toggleEqualizer = useCallback(async (enabled: boolean) => {
        if (Platform.OS !== 'android') return;
        try {
            const newState = await EqualizerModule.setEnabled(enabled);
            setIsEnabled(newState);
        } catch (e) {
            console.error('[useEqualizer] Toggle failed:', e);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (Platform.OS === 'android') {
                EqualizerModule.release();
            }
        };
    }, []);

    return {
        info,
        isEnabled,
        initialize,
        setBandLevel,
        applyPreset,
        toggleEqualizer
    };
};
