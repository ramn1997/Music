import { useState, useEffect, useCallback, useRef } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { NativeModules } from 'react-native';

export interface VoiceCommandState {
    isListening: boolean;
    lastTranscript: string;
    error: string | null;
    startListening: () => void;
    stopListening: () => void;
}

export const useVoiceCommand = (onCommand: (command: string) => void): VoiceCommandState => {
    const [isListening, setIsListening] = useState(false);
    const [lastTranscript, setLastTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const isVoiceReady = useRef(false);

    const checkVoice = async () => {
        // Wait for native modules to be ready (critical for New Arch bridge interop)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const allModules = Object.keys(NativeModules);
        console.log('[Voice] Diagnostic - Available NativeModules:', allModules);

        const voiceObj = NativeModules.Voice;
        const rctVoiceObj = NativeModules.RCTVoice;
        const voiceModuleObj = NativeModules.VoiceModule;

        const activeModule = voiceObj || rctVoiceObj || voiceModuleObj;
        const moduleName = voiceObj ? 'Voice' : (rctVoiceObj ? 'RCTVoice' : (voiceModuleObj ? 'VoiceModule' : 'None'));

        console.log('[Voice] Diagnostic - Active Module:', {
            found: !!activeModule,
            nameUsed: moduleName,
            voiceReady: !!Voice,
            methods: activeModule ? Object.keys(activeModule).filter(k => typeof (activeModule as any)[k] === 'function') : []
        });

        const hasNativeVoice = !!activeModule;
        isVoiceReady.current = !!Voice && hasNativeVoice;

        if (!hasNativeVoice) {
            console.error('[Voice] CRITICAL: No native voice module found in NativeModules!');
        }

        return hasNativeVoice;
    };

    useEffect(() => {
        checkVoice().then(present => {
            console.log('[Voice] Native module detection:', present);
            if (Voice && present) {
                Voice.onSpeechStart = onSpeechStart;
                Voice.onSpeechEnd = onSpeechEnd;
                Voice.onSpeechResults = onSpeechResults;
                Voice.onSpeechError = onSpeechError;
            }
        });

        return () => {
            if (Voice) {
                Voice.destroy().then(Voice.removeAllListeners);
            }
        };
    }, []);

    const onSpeechStart = (e: any) => {
        setIsListening(true);
        setError(null);
    };

    const onSpeechEnd = (e: any) => {
        setIsListening(false);
    };

    const onSpeechResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
            const result = e.value[0];
            setLastTranscript(result);
            onCommand(result);
        }
    };

    const onSpeechError = (e: SpeechErrorEvent) => {
        setIsListening(false);
        setError(e.error?.message || 'Unknown error occurred');
        console.error('Speech error:', e.error);
    };

    const startListening = useCallback(async () => {
        if (!isVoiceReady.current) {
            setError("Native Voice module not detected. Please ensure you are not using Expo Go and have rebuilt the app locally (npx expo run:android).");
            console.error('[Voice] Cannot start: Native module is missing');
            return;
        }
        try {
            // Extra safety check: if the library internal state is null, it will crash
            if (!(Voice as any)._voice && !NativeModules.VoiceModule && !NativeModules.RCTVoice) {
                throw new Error("Native Voice engine is not initialized. Rebuild required.");
            }

            setLastTranscript('');
            setError(null);
            await Voice.start('en-US');
            setIsListening(true);
        } catch (e: any) {
            console.error('Failed to start voice recognition', e);
            setError(e.message);
            setIsListening(false);
        }
    }, []);

    const stopListening = useCallback(async () => {
        if (!isVoiceReady.current) return;
        try {
            await Voice.stop();
            setIsListening(false);
        } catch (e) {
            console.error('Failed to stop voice recognition', e);
        }
    }, []);

    return {
        isListening,
        lastTranscript,
        error,
        startListening,
        stopListening,
    };
};
