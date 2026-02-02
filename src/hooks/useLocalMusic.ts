import { useMusicLibrary, Song } from './MusicLibraryContext';

export { Song };

export const useLocalMusic = () => {
    return useMusicLibrary();
};
