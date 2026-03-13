import React, { useState } from 'react';
import { useLiveQuery } from '../lib/pgliteHooks';
import { UserButton } from '@clerk/clerk-react';

interface AppSidebarProps {
    activeTab: 'database' | 'api' | 'settings' | 'docs';
    setActiveTab: (tab: any) => void;
    activeTableId: string;
    onSelectTable?: (tableName: string) => void;
    onDeleteTable?: (tableName: string) => void;
    // Multi-database management
    databases: { id: string, name: string }[];
    activeDbId: string;
    onSwitchDatabase: (id: string) => void;
    onCreateDatabase: (name: string) => void;
    onDeleteDatabase: (id: string) => void;
    onRenameDatabase: (id: string, newName: string) => void;
    onBackToHome?: () => void;
    isAuthEnabled?: boolean;
}

const clerkKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim();

export const AppSidebar: React.FC<AppSidebarProps> = ({
    activeTab,
    setActiveTab,
    activeTableId,
    onSelectTable,
    onDeleteTable,
    databases,
    activeDbId,
    onSwitchDatabase,
    onCreateDatabase,
    onDeleteDatabase,
    onRenameDatabase,
    isAuthEnabled,
}) => {
    // Fetch schema for all tables
    const schemasQuery = useLiveQuery<{ table_name: string; column_name: string; data_type: string }>(
        `SELECT c.table_name, c.column_name, c.data_type 
         FROM information_schema.columns c
         JOIN quaere_tables qt ON c.table_name = qt.name
         WHERE LEFT(c.column_name, 1) != '_'
         ORDER BY c.table_name, c.ordinal_position`,
        []
    );

    const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
    const [isCreatingDb, setIsCreatingDb] = useState(false);
    const [newDbName, setNewDbName] = useState('');

    const handleCreateDb = (e: React.FormEvent) => {
        e.preventDefault();
        if (newDbName.trim()) {
            onCreateDatabase(newDbName.trim());
            setNewDbName('');
            setIsCreatingDb(false);
        }
    };

    // Group columns by table
    const schemasByTable = React.useMemo(() => {
        const grouped: Record<string, typeof schemasQuery.rows> = {};
        if (!schemasQuery?.rows) return grouped;

        schemasQuery.rows.forEach(row => {
            if (!grouped[row.table_name]) {
                grouped[row.table_name] = [];
            }
            grouped[row.table_name].push(row);
        });
        return grouped;
    }, [schemasQuery?.rows]);

    // Auto-expand the active table when it changes
    React.useEffect(() => {
        if (activeTableId) {
            setExpandedTables(prev => ({ ...prev, [activeTableId]: true }));
        }
    }, [activeTableId]);

    const toggleTable = (tableName: string) => {
        setExpandedTables(prev => ({
            ...prev,
            [tableName]: !prev[tableName]
        }));
        if (onSelectTable) {
            onSelectTable(tableName);
        }
    };

    return (
        <div className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col p-4 flex-shrink-0 overflow-hidden text-slate-800 shadow-sm">
            <div className="flex items-center justify-between px-2 mb-8">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className="font-extrabold text-black tracking-tighter text-lg uppercase italic">Quaere</span>
                </div>
            </div>
            <div className="flex flex-col gap-1 px-1 mb-8">
                <button
                    onClick={() => setActiveTab('database')}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'database' ? 'bg-slate-100 text-black' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Workspace
                </button>
                <button
                    onClick={() => setActiveTab('docs')}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'docs' ? 'bg-slate-100 text-black' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Documentation
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-slate-100 text-black' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings & Billing
                </button>
            </div>

            <div className="flex flex-col gap-6 flex-grow overflow-hidden pt-2 px-2">
                {/* Databases Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between pl-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Databases</span>
                        <button
                            onClick={() => setIsCreatingDb(true)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                    {isCreatingDb && (
                        <form onSubmit={handleCreateDb} className="px-2">
                            <input
                                autoFocus
                                type="text"
                                value={newDbName}
                                onChange={e => setNewDbName(e.target.value)}
                                onBlur={() => !newDbName && setIsCreatingDb(false)}
                                placeholder="DB Name..."
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                            />
                        </form>
                    )}
                    <div className="space-y-1">
                        {databases.map(db => (
                            <div
                                key={db.id}
                                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${activeDbId === db.id ? 'bg-black text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                                onClick={() => onSwitchDatabase(db.id)}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 shrink-0 ${activeDbId === db.id ? 'text-white/70' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                    <span className="text-xs font-bold truncate">{db.name}</span>
                                </div>
                                {databases.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteDatabase(db.id); }}
                                        className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-red-500 transition-all ${activeDbId === db.id ? 'hover:bg-red-400/20 text-red-400' : ''}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Explorer Section */}
                <div className="space-y-3 flex-grow flex flex-col overflow-hidden">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-1">Explorer</div>
                    {Object.keys(schemasByTable).length > 0 ? (
                        <div className="flex flex-col bg-slate-50 text-slate-600 font-mono text-[11px] py-2 rounded-xl border border-slate-100 shadow-inner flex-grow overflow-y-auto custom-scrollbar">
                            {Object.entries(schemasByTable).map(([tableName, columns]) => (
                                <div key={tableName} className="flex flex-col">
                                    <button
                                        onClick={() => toggleTable(tableName)}
                                        className={`group px-2 py-1.5 flex items-center gap-1 hover:bg-slate-200/50 transition-colors w-full text-left select-none ${activeTableId === tableName ? 'bg-white text-black shadow-sm' : 'text-slate-500'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${expandedTables[tableName] ? 'rotate-90 text-black' : 'text-slate-300'}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                            </svg>
                                        </span>
                                        <span className={`truncate flex-1 tracking-tight font-bold ${activeTableId === tableName ? 'text-black' : 'text-slate-600'}`}>
                                            {tableName}
                                        </span>
                                        {onDeleteTable && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteTable(tableName); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-all"
                                                title="Delete Table"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </button>

                                    {/* Expandable Content */}
                                    {expandedTables[tableName] && (
                                        <div className="flex flex-col mt-0.5 mb-1 relative">
                                            {columns.map((col, idx) => {
                                                let displayType = "String";
                                                if (col.data_type.includes('int')) displayType = "Int";
                                                if (col.data_type === 'boolean') displayType = "Boolean";
                                                if (col.data_type.includes('time') || col.data_type === 'date') displayType = "DateTime";

                                                return (
                                                    <div key={idx} className="pl-7 pr-3 py-1 flex items-center gap-1.5 hover:bg-white/50 group relative select-none">
                                                        <div className="absolute left-[13px] top-0 bottom-0 w-px bg-slate-200 group-hover:bg-slate-300"></div>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                        </svg>
                                                        <span className="text-slate-700 truncate flex-1">{col.column_name}</span>
                                                        <span className="text-slate-400 text-[9px] ml-2 opacity-80 italic">{displayType}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-3 py-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center min-h-[120px]">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">No tables found</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100 cursor-default">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Local Instance</span>
                    </div>
                    {isAuthEnabled && <UserButton afterSignOutUrl="/" />}
                </div>
            </div>
        </div>
    );
};
