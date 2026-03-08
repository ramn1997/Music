import React, { ReactNode, useEffect } from 'react';
import { useLibraryStore, Song, Playlist, ArtistMetadata } from '../store/useLibraryStore';

export const MusicLibraryProvider = ({ children }: { children: ReactNode }) => {
    // The initLibrary handles its own "run once" logic
    useEffect(() => {
        useLibraryStore.getState().initLibrary();
    }, []);

    return <>{children}</>;
};

export const useMusicLibrary = () => {
    return useLibraryStore();
};

export { Song, Playlist, ArtistMetadata };
