import * as SQLite from 'expo-sqlite';

interface Song {
    id: string;
    filename: string;
    uri: string;
    duration: number;
    title: string;
    artist: string;
    album?: string;
    genre?: string;
    year?: string;
    albumId?: string;
    coverImage?: string;
    dateAdded: number;
    playCount?: number;
    lastPlayed?: number;
    scanStatus?: 'pending' | 'enhanced' | 'cached';
    folder?: string;
}

interface DBStats {
    total: number;
    processed: number;
}

class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    async getDb(): Promise<SQLite.SQLiteDatabase> {
        await this.init();
        return this.db!;
    }

    async init(): Promise<void> {
        if (this.initPromise) return this.initPromise;
        this.initPromise = (async () => {
            try {
                if (this.db) return;
                console.log('[DatabaseService] Opening database...');
                this.db = await SQLite.openDatabaseAsync('music_library.db');

                // Optimized PRAGMAs for performance and concurrency
                await this.db.execAsync('PRAGMA journal_mode = WAL;');
                await this.db.execAsync('PRAGMA synchronous = NORMAL;');
                await this.db.execAsync('PRAGMA busy_timeout = 30000;'); // 30s timeout
                await this.db.execAsync('PRAGMA cache_size = -20000;'); // 20MB cache

                console.log('[DatabaseService] Creating tables...');
                // Schema creation (Use individual calls to avoid NPE in multi-statement parsing on some Android devices)
                await this.db.execAsync(`
                    CREATE TABLE IF NOT EXISTS songs (
                        id TEXT PRIMARY KEY,
                        filename TEXT,
                        uri TEXT,
                        duration INTEGER,
                        title TEXT,
                        artist TEXT,
                        album TEXT,
                        genre TEXT,
                        year TEXT,
                        albumId TEXT,
                        coverImage TEXT,
                        dateAdded INTEGER,
                        playCount INTEGER DEFAULT 0,
                        lastPlayed INTEGER DEFAULT 0,
                        scanStatus TEXT DEFAULT 'pending',
                        folder TEXT
                    );
                `);

                console.log('[DatabaseService] Handling schema migrations...');
                try {
                    // This handles backwards compatibility for users who created DB before 'genre' column existed
                    await this.db.execAsync(`ALTER TABLE songs ADD COLUMN genre TEXT;`);
                } catch (e) {
                    // Ignore column already exists error
                }

                console.log('[DatabaseService] Creating indices...');
                await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_scanStatus ON songs(scanStatus);');
                await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_dateAdded ON songs(dateAdded);');
                await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_artist ON songs(artist);');
                await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_album ON songs(album);');

                console.log('[DatabaseService] SQLite initialized successfully.');
            } catch (e: any) {
                console.error('[DatabaseService] Init Failed Critical:', e);
                this.initPromise = null;
                throw e;
            }
        })();
        return this.initPromise;
    }

    private sanitize(val: any) {
        if (val === undefined || val === null) return null;
        if (typeof val === 'number') {
            return isNaN(val) ? 0 : val;
        }
        if (typeof val === 'object') {
            return null; // Don't allow objects in SQLite columns
        }
        return val;
    }

    private transactionLock: Promise<void> = Promise.resolve();

    async upsertSongs(songs: Song[]) {
        if (songs.length === 0) return;
        const db = await this.getDb();

        const BATCH_SIZE = 500;
        const query = `
            INSERT OR REPLACE INTO songs 
            (id, filename, uri, duration, title, artist, album, genre, year, albumId, coverImage, dateAdded, playCount, lastPlayed, scanStatus, folder)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;

        for (let i = 0; i < songs.length; i += BATCH_SIZE) {
            const release = await this.acquireLock();
            try {
                const batch = songs.slice(i, i + BATCH_SIZE);
                let retries = 3;
                let success = false;

                while (retries > 0 && !success) {
                    try {
                        await db.withTransactionAsync(async () => {
                            const statement = await db.prepareAsync(query);
                            try {
                                for (const s of batch) {
                                    await statement.executeAsync([
                                        this.sanitize(s.id),
                                        this.sanitize(s.filename),
                                        this.sanitize(s.uri),
                                        this.sanitize(s.duration),
                                        this.sanitize(s.title),
                                        this.sanitize(s.artist),
                                        this.sanitize(s.album),
                                        this.sanitize(s.genre),
                                        this.sanitize(s.year),
                                        this.sanitize(s.albumId),
                                        this.sanitize(s.coverImage),
                                        this.sanitize(s.dateAdded),
                                        this.sanitize(s.playCount),
                                        this.sanitize(s.lastPlayed),
                                        this.sanitize(s.scanStatus),
                                        this.sanitize(s.folder)
                                    ]);
                                }
                            } finally {
                                try {
                                    await statement.finalizeAsync();
                                } catch (finalizeErr) {
                                    // Non-critical cleanup failure
                                }
                            }
                        });
                        success = true;
                    } catch (txErr: any) {
                        if (txErr.message?.includes('database is locked') && retries > 1) {
                            console.warn(`[DatabaseService] Batch locked, retrying... (${retries} left)`);
                            retries--;
                            await new Promise(r => setTimeout(r, 1000));
                        } else {
                            throw txErr;
                        }
                    }
                }
            } finally {
                release();
            }

            // Yield significantly to UI thread BETWEEN transactions
            if (i + BATCH_SIZE < songs.length) {
                await new Promise(r => setTimeout(r, 200));
            }
        }
        console.log(`[DatabaseService] Successfully upserted ${songs.length} songs.`);
    }

    private async acquireLock(): Promise<() => void> {
        let release: () => void;
        const nextLock = new Promise<void>((resolve) => {
            release = resolve;
        });

        const wait = this.transactionLock;
        this.transactionLock = nextLock;
        await wait;

        return release!;
    }

    async getUnenhancedSongs(limit = 50) {
        const db = await this.getDb();
        return await db.getAllAsync(`
            SELECT * FROM songs 
            WHERE scanStatus = 'pending' 
            LIMIT ?
        `, [limit]);
    }

    async getUnenhancedSongsCount(): Promise<number> {
        const db = await this.getDb();
        const result: any = await db.getFirstAsync(`
            SELECT COUNT(*) as count FROM songs 
            WHERE scanStatus = 'pending' 
        `);
        return result?.count || 0;
    }

    async getSongsCount(): Promise<number> {
        const db = await this.getDb();
        const result: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM songs');
        return result?.count || 0;
    }

    async getSongById(id: string) {
        const db = await this.getDb();
        return await db.getFirstAsync('SELECT * FROM songs WHERE id = ?', [id]) as any;
    }

    async updateSong(id: string, updates: any) {
        if (!updates || typeof updates !== 'object') return;
        const db = await this.getDb();
        const fields = Object.keys(updates);
        if (fields.length === 0) return;

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = [...Object.values(updates).map(v => this.sanitize(v)), id];

        const release = await this.acquireLock();
        try {
            await db.runAsync(`UPDATE songs SET ${setClause} WHERE id = ?`, values as any[]);
        } finally {
            release();
        }
    }

    // Efficiently get stats for progress bar
    async getSyncStatus(): Promise<DBStats> {
        const db = await this.getDb();
        const result: any = await db.getFirstAsync(`
            SELECT 
                COUNT(*) as total, 
                SUM(CASE WHEN scanStatus != 'pending' THEN 1 ELSE 0 END) as processed 
            FROM songs
        `);
        return {
            total: result?.total || 0,
            processed: result?.processed || 0
        };
    }

    async markIncompleteSongsAsPending() {
        const db = await this.getDb();
        const release = await this.acquireLock();
        try {
            await db.runAsync(`
                UPDATE songs 
                SET scanStatus = 'pending' 
                WHERE scanStatus != 'enhanced'
                  AND (album = 'Unknown Album' 
                   OR artist = 'Unknown Artist' 
                   OR genre IS NULL 
                   OR genre = 'undefined'
                   OR genre = 'Unknown Genre'
                   OR title = 'Unknown Title'
                   OR title = filename)
            `);
            console.log('[DatabaseService] Marked incomplete metadata songs as pending for resync.');
        } finally {
            release();
        }
    }

    async getAllSongs(folderNames?: string[]) {
        const db = await this.getDb();
        if (folderNames && folderNames.length > 0) {
            const placeholders = folderNames.map(() => '?').join(', ');
            return await db.getAllAsync(`SELECT * FROM songs WHERE folder IN (${placeholders}) ORDER BY dateAdded DESC`, folderNames);
        }
        return await db.getAllAsync('SELECT * FROM songs ORDER BY dateAdded DESC');
    }

    async deleteSong(id: string) {
        const db = await this.getDb();
        const release = await this.acquireLock();
        try {
            await db.runAsync('DELETE FROM songs WHERE id = ?', [id]);
        } finally {
            release();
        }
    }

    async reset() {
        const db = await this.getDb();
        const release = await this.acquireLock();
        try {
            await db.execAsync('DELETE FROM songs');
        } finally {
            release();
        }
    }
}

export const databaseService = new DatabaseService();
