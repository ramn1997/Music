import MusicScannerModule from './src/MusicScannerModule';

export interface AudioFile {
    id: string;
    uri: string;
    filename: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    dateAdded: number;
    albumId?: string;
}

export async function scanAudioFilesAsync(): Promise<AudioFile[]> {
    return await MusicScannerModule.scanAudioFilesAsync();
}
