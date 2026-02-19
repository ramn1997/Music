import { useState, useEffect } from 'react';
import { databaseService } from '../services/DatabaseService';

export const useLibrarySync = () => {
    const [status, setStatus] = useState({ progress: 0, isSyncing: false, total: 0, processed: 0 });

    const updateStatus = async () => {
        try {
            const result = await databaseService.getSyncStatus();
            if (result && result.total > 0) {
                const progress = Math.round((result.processed / result.total) * 100);
                // Consider syncing if processed < total. 
                // However, we might want to be more specific. 
                // Let's assume if processed < total, we are syncing or could sync.
                // But ImportService drives the sync. 
                // We'll just report what the DB says.
                const isSyncing = result.processed < result.total;

                setStatus({
                    progress,
                    isSyncing,
                    total: result.total,
                    processed: result.processed
                });
            } else {
                setStatus({ progress: 100, isSyncing: false, total: 0, processed: 0 });
            }
        } catch (e) {
            // ignore
        }
    };

    useEffect(() => {
        // Initial check
        updateStatus();

        // Poll every 2 seconds
        const interval = setInterval(() => {
            updateStatus();
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return status;
};
