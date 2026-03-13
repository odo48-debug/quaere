
import React, { useState, useEffect, useCallback } from 'react';
import { usePGlite, useLiveQuery } from '../lib/pgliteHooks';
import { generateEmbedding } from '../lib/embeddings';

/* ─────────────── Types ─────────────── */
interface EpisodicRow { id: number; content: string; source: string | null; tags: string[] | null; created_at: string; has_embedding: boolean; }
interface SemanticRow { id: number; subject: string; predicate: string; object: string; confidence: number; }
interface ProceduralRow { id: number; name: string; description: string | null; steps: any; }

type ViewTab = 'episodic' | 'semantic' | 'procedural';

/* ─────────────── Helpers ─────────────── */
const relativeTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
};

/* ─────────────── Sub-components ─────────────── */
const StatCard: React.FC<{ label: string; value: string | number; icon: string; color: string }> = ({ label, value, icon, color }) => (
    <div className={`flex items-center gap-3 bg-gradient-to-br ${color} rounded-2xl p-4 border border-white/10`}>
        <div className="text-2xl">{icon}</div>
        <div>
            <div className="text-2xl font-black text-white leading-none">{value}</div>
            <div className="text-xs font-bold text-white/60 uppercase tracking-widest mt-0.5">{label}</div>
        </div>
    </div>
);

const EpisodicCard: React.FC<{ row: EpisodicRow; onDelete: (id: number) => void }> = ({ row, onDelete }) => (
    <div className="group relative flex gap-4 py-4">
        {/* Timeline dot & line */}
        <div className="flex flex-col items-center shrink-0">
            <div className={`w-3 h-3 rounded-full mt-1 ring-2 ring-offset-2 ring-offset-slate-950 ${row.has_embedding ? 'bg-indigo-400 ring-indigo-500' : 'bg-slate-600 ring-slate-700'}`} />
            <div className="w-px flex-1 bg-slate-800 mt-2" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-4">
            <div className="flex items-start justify-between gap-2">
                <p className="text-slate-200 text-sm leading-relaxed">{row.content}</p>
                <button
                    onClick={() => onDelete(row.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-400"
                    title="Delete"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs text-slate-500">{relativeTime(row.created_at)}</span>
                {row.source && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">{row.source}</span>}
                {row.has_embedding && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">🧬 vectorized</span>}
                {row.tags?.map(tag => (
                    <span key={tag} className="text-[10px] bg-slate-800/80 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
            </div>
        </div>
    </div>
);

const SemanticTriple: React.FC<{ row: SemanticRow; onDelete: (id: number) => void }> = ({ row, onDelete }) => (
    <div className="group flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-indigo-500/40 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg text-sm font-bold truncate max-w-[180px]">{row.subject}</span>
            <span className="text-slate-500 text-xs italic whitespace-nowrap">—{row.predicate}→</span>
            <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-lg text-sm font-bold truncate max-w-[180px]">{row.object}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${row.confidence * 100}%` }} />
            </div>
            <button
                onClick={() => onDelete(row.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-400"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    </div>
);

/* ─────────────── Main Component ─────────────── */
export const BrainView: React.FC<{ activeTable: string }> = ({ activeTable }) => {
    const db = usePGlite() as any;
    const [tab, setTab] = useState<ViewTab>('episodic');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<EpisodicRow[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    /* ── Live data ── */
    const episodicData = useLiveQuery(
        `SELECT id, content, source, tags, created_at, (embedding IS NOT NULL) as has_embedding
         FROM brain_episodic ORDER BY created_at DESC LIMIT 100`
    );
    const semanticData = useLiveQuery(
        `SELECT id, subject, predicate, object, confidence FROM brain_semantic ORDER BY updated_at DESC LIMIT 100`
    );
    const proceduralData = useLiveQuery(
        `SELECT id, name, description, steps FROM brain_procedural ORDER BY updated_at DESC LIMIT 100`
    );

    /* ── Stats ── */
    const statsData = useLiveQuery(
        `SELECT 
            (SELECT COUNT(*) FROM brain_episodic)::text AS ep,
            (SELECT COUNT(*) FROM brain_semantic)::text AS sem,
            (SELECT COUNT(*) FROM brain_procedural)::text AS proc,
            (SELECT COUNT(*) FROM brain_episodic WHERE embedding IS NOT NULL)::text AS vec`
    );
    const stats = statsData?.rows?.[0] as { ep: string; sem: string; proc: string; vec: string } | undefined;

    const episodic = (episodicData?.rows as unknown as EpisodicRow[]) || [];
    const semantic = (semanticData?.rows as unknown as SemanticRow[]) || [];
    const procedural = (proceduralData?.rows as unknown as ProceduralRow[]) || [];

    /* ── Switch tab when active table changes ── */
    useEffect(() => {
        if (activeTable === 'brain_episodic') setTab('episodic');
        else if (activeTable === 'brain_semantic') setTab('semantic');
        else if (activeTable === 'brain_procedural') setTab('procedural');
    }, [activeTable]);

    /* ── Semantic search ── */
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim() || !db) return;
        setIsSearching(true);
        setSearchResults(null);
        try {
            const embedding = await generateEmbedding(searchQuery);
            if (embedding) {
                const embStr = JSON.stringify(embedding);
                const res = await db.query(
                    `SELECT id, content, source, tags, created_at, (embedding IS NOT NULL) as has_embedding
                     FROM brain_episodic
                     WHERE embedding IS NOT NULL
                     ORDER BY embedding <=> $1::vector
                     LIMIT 10`,
                    [embStr]
                );
                setSearchResults(res.rows as unknown as EpisodicRow[]);
            } else {
                // Fallback: full-text search
                const res = await db.query(
                    `SELECT id, content, source, tags, created_at, (embedding IS NOT NULL) as has_embedding
                     FROM brain_episodic
                     WHERE content ILIKE $1
                     ORDER BY created_at DESC LIMIT 10`,
                    [`%${searchQuery}%`]
                );
                setSearchResults(res.rows as unknown as EpisodicRow[]);
            }
        } catch (e) {
            console.error('[BrainView] Search failed:', e);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, db]);

    /* ── Delete helpers ── */
    const deleteEpisodic = useCallback(async (id: number) => {
        if (!confirm('Delete this memory?')) return;
        await db.exec(`DELETE FROM brain_episodic WHERE id = ${id}`);
    }, [db]);
    const deleteSemantic = useCallback(async (id: number) => {
        if (!confirm('Delete this fact?')) return;
        await db.exec(`DELETE FROM brain_semantic WHERE id = ${id}`);
    }, [db]);

    const displayedEpisodic = searchResults !== null ? searchResults : episodic;

    return (
        <div className="h-full bg-slate-950 flex flex-col text-white overflow-hidden">

            {/* ── Header ── */}
            <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xl">🧠</div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-white">Brain Control Panel</h1>
                        <p className="text-xs text-slate-500 font-medium">Local-first vector memory · powered by pgvector</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-3 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Pro Active</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                    <StatCard label="Episodes" value={stats?.ep || '0'} icon="💬" color="from-indigo-600/30 to-indigo-900/20" />
                    <StatCard label="Facts" value={stats?.sem || '0'} icon="🔗" color="from-blue-600/30 to-blue-900/20" />
                    <StatCard label="Skills" value={stats?.proc || '0'} icon="⚙️" color="from-violet-600/30 to-violet-900/20" />
                    <StatCard label="Vectorized" value={stats?.vec || '0'} icon="🧬" color="from-emerald-600/30 to-emerald-900/20" />
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="shrink-0 flex gap-1 px-6 py-3 border-b border-slate-800">
                {(['episodic', 'semantic', 'procedural'] as ViewTab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => { setTab(t); setSearchResults(null); setSearchQuery(''); }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                    >
                        {t === 'episodic' ? '🧠 Episodic' : t === 'semantic' ? '🔗 Semantic' : '⚙️ Procedural'}
                    </button>
                ))}
            </div>

            {/* ── Semantic Search (Episodic only) ── */}
            {tab === 'episodic' && (
                <div className="shrink-0 px-6 py-3 border-b border-slate-800">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Search memories by meaning... (semantic search)"
                                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery.trim()}
                            className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            {isSearching ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            Search
                        </button>
                        {searchResults !== null && (
                            <button
                                onClick={() => { setSearchResults(null); setSearchQuery(''); }}
                                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    {searchResults !== null && (
                        <p className="text-xs text-indigo-400 mt-1.5 ml-1">
                            {isSearching ? 'Searching vectors...' : `Found ${searchResults.length} related memories`}
                        </p>
                    )}
                </div>
            )}

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">

                {/* EPISODIC */}
                {tab === 'episodic' && (
                    <div>
                        {displayedEpisodic.length === 0 ? (
                            <EmptyState
                                icon="💬"
                                title="No memories yet"
                                desc='Send a REMEMBER command via the Agent Bridge to store episodic memories.'
                            />
                        ) : (
                            displayedEpisodic.map(row => (
                                <EpisodicCard key={row.id} row={row} onDelete={deleteEpisodic} />
                            ))
                        )}
                    </div>
                )}

                {/* SEMANTIC */}
                {tab === 'semantic' && (
                    <div className="flex flex-col gap-2">
                        {semantic.length === 0 ? (
                            <EmptyState
                                icon="🔗"
                                title="No facts yet"
                                desc='Use memory_type: "semantic" with subject, predicate, object to store structured facts.'
                            />
                        ) : (
                            semantic.map(row => <SemanticTriple key={row.id} row={row} onDelete={deleteSemantic} />)
                        )}
                    </div>
                )}

                {/* PROCEDURAL */}
                {tab === 'procedural' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {procedural.length === 0 ? (
                            <div className="col-span-2">
                                <EmptyState
                                    icon="⚙️"
                                    title="No skills yet"
                                    desc='Use memory_type: "procedural" with a name, description and steps JSON to store agent workflows.'
                                />
                            </div>
                        ) : (
                            procedural.map(row => (
                                <div key={row.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-violet-500/40 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-lg shrink-0">⚙️</div>
                                        <div>
                                            <h3 className="font-black text-white text-sm">{row.name}</h3>
                                            {row.description && <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{row.description}</p>}
                                        </div>
                                    </div>
                                    {row.steps && (
                                        <pre className="mt-3 text-[10px] text-slate-500 bg-slate-800/50 rounded-lg p-3 overflow-auto max-h-32 font-mono">
                                            {JSON.stringify(row.steps, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const EmptyState: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
    <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4 grayscale opacity-30">{icon}</div>
        <h3 className="text-slate-500 font-black uppercase tracking-widest text-sm mb-2">{title}</h3>
        <p className="text-slate-700 text-xs max-w-sm leading-relaxed">{desc}</p>
    </div>
);
