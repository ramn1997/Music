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

export async function deleteAudioFileAsync(songId: string, filePath: string): Promise<boolean> {
    return await MusicScannerModule.deleteAudioFileAsync(songId, filePath);
}

export default MusicScannerModule;
