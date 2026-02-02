import React, { createContext, useContext, ReactNode } from 'react';
import { usePlayer } from './usePlayer';
import { Song } from './useLocalMusic';

type PlayerContextType = ReturnType<typeof usePlayer>;

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
    const player = usePlayer();
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
