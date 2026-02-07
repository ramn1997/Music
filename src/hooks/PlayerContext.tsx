import React, { createContext, useContext, ReactNode, useState } from 'react';
import { Song } from './useLocalMusic';

// Stub player context - player functionality removed
// This prevents crashes in components that still reference the player

interface PlayerContextType {
    currentTrack: Song | null;
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
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
    const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const player: PlayerContextType = {
        currentTrack,
        isPlaying,
        position: 0,
        duration: 0,
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
