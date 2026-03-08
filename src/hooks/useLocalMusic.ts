import { useLibraryStore, Song } from '../store/useLibraryStore';

export { Song };

export const useLocalMusic = () => {
    return useLibraryStore();
};
