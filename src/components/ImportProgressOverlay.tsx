/**
 * ImportProgressOverlay.tsx
 * 
 * A wrapper component that displays the ImportProgressModal
 * using the MusicLibraryContext. This should be placed inside
 * the MusicLibraryProvider to access the import state.
 */

import React from 'react';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';
import { ImportProgressModal } from './ImportProgressModal';

export const ImportProgressOverlay: React.FC = () => {
    const { importProgress, cancelImport } = useMusicLibrary();

    if (!importProgress) {
        return null;
    }

    return (
        <ImportProgressModal
            visible={!!importProgress}
            progress={importProgress}
            onCancel={cancelImport}
        />
    );
};
