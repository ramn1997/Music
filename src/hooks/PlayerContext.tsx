import React, { createContext, useContext, ReactNode, useState } from 'react';
import { Song } from './useLocalMusic';

// Stub player context - player functionality removed
// This prevents crashes in components that still reference the player

interface PlayerContextType {
    currentTrack: Song | null;
    currentSong: Song | null;
    isPlaying: boolean;
    position: number;
    duration: number;
    play: (song: Song) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    stop: () => Promise<void>;
    seekTo: (position: number) => Promise<void>;
    playNext: () => Promise<void>;
    playPrevious: () => Promise<void>;
    setQueue: (songs: Song[], index?: number) => Promise<void>;
    playSongInPlaylist: (songs: Song[], index: number, playlistName?: string) => void;
    addToQueue: (song: Song) => void;
    addNext: (song: Song) => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    isShuffleOn: boolean;
    repeatMode: 'off' | 'one' | 'all';
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
    const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isShuffleOn, setIsShuffleOn] = useState(false);
    const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');

    const player: PlayerContextType = {
        currentTrack,
        currentSong: currentTrack,
        isPlaying,
        position: 0,
        duration: 0,
        isShuffleOn,
        repeatMode,
        play: async (song: Song) => {
            console.log('Player: play requested for', song.title);
            setCurrentTrack(song);
            setIsPlaying(true);
        },
        pause: async () => {
            console.log('Player: pause requested');
            setIsPlaying(false);
        },
        resume: async () => {
            console.log('Player: resume requested');
            setIsPlaying(true);
        },
        stop: async () => {
            console.log('Player: stop requested');
            setCurrentTrack(null);
            setIsPlaying(false);
        },
        seekTo: async (position: number) => {
            console.log('Player: seek requested to', position);
        },
        playNext: async () => {
            console.log('Player: playNext requested');
        },
        playPrevious: async () => {
            console.log('Player: playPrevious requested');
        },
        setQueue: async (songs: Song[], index?: number) => {
            console.log('Player: setQueue requested with', songs.length, 'songs');
            if (songs.length > 0) {
                setCurrentTrack(songs[index || 0]);
            }
        },
        playSongInPlaylist: (songs: Song[], index: number, playlistName?: string) => {
            console.log('Player: playSongInPlaylist requested for', playlistName || 'playlist', 'at index', index);
            if (songs.length > index) {
                setCurrentTrack(songs[index]);
                setIsPlaying(true);
            }
        },
        addToQueue: (song: Song) => {
            console.log('Player: addToQueue requested for', song.title);
        },
        addNext: (song: Song) => {
            console.log('Player: addNext requested for', song.title);
        },
        toggleShuffle: () => {
            console.log('Player: toggleShuffle requested');
            setIsShuffleOn(!isShuffleOn);
        },
        toggleRepeat: () => {
            console.log('Player: toggleRepeat requested');
            const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
            const currentIndex = modes.indexOf(repeatMode);
            setRepeatMode(modes[(currentIndex + 1) % modes.length]);
        },
    };

    return (
        <PlayerContext.Provider value={player}>
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayerContext = () => {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error('usePlayerContext must be used within a PlayerProvider');
    }
    return context;
};
