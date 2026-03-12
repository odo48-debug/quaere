import React, { useState, useEffect } from 'react';
import App from '../App';
import { PGliteWorker } from '@electric-sql/pglite/worker';
import { PGliteProvider } from '@electric-sql/pglite-react';
import { live } from '@electric-sql/pglite/live';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import LandingPage from './LandingPage';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// Use a stable singleton promise that survives HMR reloads and React StrictMode double-mounts
const PGLITE_SINGLETON_KEY = '__PGLITE_WORKER_PROMISE__';

function getOrCreatePGlite() {
    const global = window as any;

    // Read the active database name from localStorage
    const activeDb = localStorage.getItem('quaere_active_db') || 'default';
    const singletonKey = `${PGLITE_SINGLETON_KEY}_${activeDb}`;

    if (global[singletonKey]) return global[singletonKey];

    global[singletonKey] = (async () => {
        console.log(`[PGlite] Initializing Multi-Tab Worker for: ${activeDb}...`);

        // Create the worker
        const worker = new Worker(
            new URL('../pglite.worker.ts', import.meta.url),
            { type: 'module' }
        );

        // Constructor pattern for better leader election support
        const instance = new PGliteWorker(worker, {
            // Map 'default' to the legacy path to preserve existing data
            dataDir: activeDb === 'default' ? 'idb://quaere-db-v17' : `idb://quaere-db-${activeDb}-v17`,
            extensions: { live },
            relaxedDurability: true
        });

        // Monitor leadership
        console.log(`[PGlite] Initial leader status: ${instance.isLeader ? 'LEADER' : 'FOLLOWER'}`);
        instance.onLeaderChange(() => {
            console.log(`[PGlite] Leadership changed: This tab is now a ${instance.isLeader ? 'LEADER' : 'FOLLOWER'}`);
        });

        // Wait for ready
        await instance.ready;

        console.log(`[PGlite] Worker ready for ${activeDb}, setting up system tables...`);
        await instance.exec(`
            CREATE TABLE IF NOT EXISTS quaere_tables (
                name text PRIMARY KEY,
                display_name text,
                created_at timestamptz DEFAULT now()
            );
        `);

        // Activate extensions
        await instance.exec(`CREATE EXTENSION IF NOT EXISTS vector;`);

        // Brain memory tables (embeddings are optional — column is nullable)
        await instance.exec(`
            CREATE TABLE IF NOT EXISTS brain_episodic (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                source TEXT,
                tags TEXT[],
                embedding vector(768),
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS brain_episodic_emb_idx
                ON brain_episodic USING hnsw (embedding vector_cosine_ops)
                WHERE embedding IS NOT NULL;

            CREATE TABLE IF NOT EXISTS brain_semantic (
                id SERIAL PRIMARY KEY,
                subject TEXT NOT NULL,
                predicate TEXT NOT NULL,
                object TEXT NOT NULL,
                confidence REAL DEFAULT 1.0,
                embedding vector(768),
                updated_at TIMESTAMPTZ DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS brain_procedural (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                steps JSONB,
                embedding vector(768),
                updated_at TIMESTAMPTZ DEFAULT now()
            );
        `);

        // Migration: ensure every registered table has _id SERIAL (required by live queries)
        const userTables = await instance.query<{ name: string }>(
            `SELECT name FROM quaere_tables`
        );
        for (const t of userTables.rows) {
            try {
                await instance.exec(`ALTER TABLE "${t.name}" ADD COLUMN IF NOT EXISTS _id SERIAL`);
            } catch {
                // Table might not exist or already has _id — safe to ignore
            }
        }

        return instance;
    })();

    return global[singletonKey];
}

async function wipeDatabaseAndReload() {
    if (!confirm('Esto borrará todos tus datos locales de forma permanente. ¿Estás seguro?')) return;

    // Attempt to delete IndexedDB
    const dbs = await window.indexedDB.databases();
    for (const dbInfo of dbs) {
        if (dbInfo.name && (dbInfo.name.includes('quaere-db') || dbInfo.name.includes('pglite'))) {
            console.log('[Wipe] Deleting DB:', dbInfo.name);
            window.indexedDB.deleteDatabase(dbInfo.name);
        }
    }

    // Clear Singleton
    delete (window as any)[PGLITE_SINGLETON_KEY];

    // Reload
    window.location.reload();
}

function AppLoaderInner() {
    const [db, setDb] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('Booting PostgreSQL worker...');

    useEffect(() => {
        let mounted = true;

        getOrCreatePGlite()
            .then((instance) => {
                if (mounted) {
                    setDb(instance);
                    setStatus('Ready');
                }
            })
            .catch((err) => {
                console.error('[AppLoader] Worker Error:', err);
                if (mounted) {
                    setError(err.message || String(err));
                }
            });

        return () => { mounted = false; };
    }, []);

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-900 text-white p-6">
                <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-red-500/30">
                    <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                        <span>⚠️</span> PGlite Engine Error
                    </h2>
                    <p className="text-slate-300 text-sm mb-6 leading-relaxed bg-black/20 p-4 rounded-lg font-mono">
                        {error}
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all"
                        >
                            Try again
                        </button>
                        <button
                            onClick={wipeDatabaseAndReload}
                            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition-all text-xs border border-slate-600/30"
                        >
                            Wipe & Start Fresh
                        </button>
                    </div>
                    <p className="mt-4 text-[10px] text-slate-500 text-center uppercase tracking-widest">
                        Check your internet connection or browser settings
                    </p>
                </div>
            </div>
        );
    }

    if (!db) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
                <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden mb-8">
                    <div className="h-full bg-indigo-500 animate-[loading_1.5s_infinite_ease-in-out]" style={{ width: '40%' }}></div>
                </div>
                <h1 className="text-2xl font-black mb-2 tracking-tighter uppercase italic">PGlite Engine</h1>
                <p className="text-indigo-400 font-mono text-xs animate-pulse lowercase tracking-widest">
                    {status}
                </p>
                <style>{`
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(250%); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <PGliteProvider db={db}>
            <App />
        </PGliteProvider>
    );
}

// ---- Root with optional Clerk wrapper ------------------------------------
export function AppLoader() {
    // If no Clerk key is provided (e.g. open-source local dev), skip auth entirely
    if (!CLERK_KEY) {
        return <AppLoaderInner />;
    }

    return (
        <ClerkProvider publishableKey={CLERK_KEY}>
            <SignedOut>
                <LandingPage />
            </SignedOut>
            <SignedIn>
                <AppLoaderInner />
            </SignedIn>
        </ClerkProvider>
    );
}
