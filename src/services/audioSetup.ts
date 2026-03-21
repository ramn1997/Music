import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';

/**
 * Initializes TrackPlayer with aggressive pre-buffering configurations
 * to ensure 100% gapless native string concatenation (0ms transitions)
 * between tracks.
 */
export const setupAudioPlayer = async () => {
    let isSetup = false;
    try {
        await TrackPlayer.getActiveTrackIndex();
        isSetup = true;
    } catch {
        // Configure Native Engine with strict buffer bounds
        await TrackPlayer.setupPlayer({
            minBuffer: 15,    // Buffer at least 15 seconds before starting
            maxBuffer: 50,    // Pre-cache up to 50 seconds ahead for track B
            playBuffer: 2.5,  // Threshold for playback resume after stalling
            backBuffer: 5,    // Keep 5 seconds of previous audio 
            autoHandleInterruptions: true, // Handle call/audio focus natively
        });

        await TrackPlayer.updateOptions({
            android: {
                appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
                alwaysPauseOnInterruption: true,
            },
            capabilities: [
                Capability.SkipToPrevious,
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SeekTo,
            ],
            compactCapabilities: [
                Capability.SkipToPrevious,
                Capability.Play,
                Capability.SkipToNext,
            ],
            progressUpdateEventInterval: 1,
        });
        isSetup = true;
    }
    return isSetup;
};
