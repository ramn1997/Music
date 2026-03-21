import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { MusicWidget } = NativeModules;

export interface WidgetData {
    title?: string;
    artist?: string;
    isPlaying?: boolean;
    isShuffleOn?: boolean;
    repeatMode?: string;
    artwork?: string;
    progress?: number;
    duration?: number;
    currentTimeStr?: string;
    totalTimeStr?: string;
    isLiked?: boolean;
}

export const updateWidget = (data: WidgetData) => {
    if (Platform.OS !== 'android' || !MusicWidget) return;

    // Convert numbers to integers as expected by Native Module
    const sanitizedData = {
        ...data,
        progress: data.progress ? Math.floor(data.progress) : 0,
        duration: data.duration ? Math.floor(data.duration) : 100,
    };

    MusicWidget.updateWidget(sanitizedData);
};

export const widgetEvents = Platform.OS === 'android' && MusicWidget
    ? new NativeEventEmitter(MusicWidget)
    : null;
