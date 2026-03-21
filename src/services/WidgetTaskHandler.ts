import TrackPlayer, { State } from 'react-native-track-player';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';

/**
 * Headless JS Task Handler for the Music Widget.
 * This runs in a separate JS context when the app is in the background or closed.
 */
const WidgetTaskHandler = async (taskData: any) => {
    const { eventName } = taskData;
    console.log(`[WidgetTaskHandler] Received event: ${eventName}`);

    try {
        // Ensure stores are initialized in this Headless context
        const libraryStore = useLibraryStore.getState();
        if (libraryStore.songs.length === 0) {
            console.log('[WidgetTaskHandler] Initializing library store...');
            await libraryStore.initLibrary();
        }

        const playerStore = usePlayerStore.getState();
        if (!playerStore.isPlayerReady) {
            console.log('[WidgetTaskHandler] Setting up player store...');
            await playerStore.setupPlayer();
        }

        switch (eventName) {
            case 'WIDGET_PLAY_PAUSE':
                const state = await TrackPlayer.getState();
                if (state === State.Playing) {
                    await TrackPlayer.pause();
                } else {
                    await TrackPlayer.play();
                }
                break;

            case 'WIDGET_NEXT':
                // Use the store's nextTrack logic if possible, or direct TrackPlayer
                await usePlayerStore.getState().nextTrack();
                break;

            case 'WIDGET_PREVIOUS':
                await usePlayerStore.getState().prevTrack();
                break;

            case 'WIDGET_LIKE':
                const currentTrack = await TrackPlayer.getActiveTrack();
                if (currentTrack) {
                    // Use library store to toggle like
                    // Song object in library store might be slightly different from Track object
                    // but they share 'id'.
                    const songId = String(currentTrack.id);
                    const songs = useLibraryStore.getState().songs;
                    const song = songs.find(s => String(s.id) === songId);
                    if (song) {
                        useLibraryStore.getState().toggleLike(song);
                    }
                }
                break;

            default:
                console.warn(`[WidgetTaskHandler] Unknown event: ${eventName}`);
        }

        // Update widget UI after action
        await usePlayerStore.getState().syncWidget();

    } catch (error) {
        console.error(`[WidgetTaskHandler] Error handling event ${eventName}:`, error);
    }
};

export default WidgetTaskHandler;
