import React, { useState } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useUsageLimit } from '../hooks/useUsageLimit';
import { useSubscription } from '../hooks/useSubscription';

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => (
    <div
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group
            ${active
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
    >
        <div className={`${active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'}`}>
            {icon}
        </div>
        <span className="text-sm font-medium">{label}</span>
    </div>
);

interface AppSidebarProps {
    activeTab: 'database' | 'api' | 'settings' | 'docs';
    setActiveTab: (tab: any) => void;
    onNewDatabase?: () => void; // Existing: trigger new table in active DB
    databases: { id: string; name: string }[];
    activeDbId: string;
    onSwitchDatabase: (id: string) => void;
    onCreateDatabase: (name: string) => void;
    onRenameDatabase: (id: string, newName: string) => void;
    onDeleteDatabase: (id: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
    activeTab,
    setActiveTab,
    onNewDatabase,
    databases,
    activeDbId,
    onSwitchDatabase,
    onCreateDatabase,
    onRenameDatabase,
    onDeleteDatabase
}) => {
    const { user } = useUser();
    const [isCreatingDb, setIsCreatingDb] = useState(false);
    const [newDbName, setNewDbName] = useState('');
    const [editingDbId, setEditingDbId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const { usage, limits, getRemainingPages, isFreeTrialActive, isPaidUser } = useUsageLimit();
    const { plan } = useSubscription();

    const fullName = user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';
    const email = user?.emailAddresses?.[0]?.emailAddress || '';

    const usedPages = usage.pagesProcessedThisMonth;
    const totalPages = limits.pagesPerMonth;
    const remainingPages = getRemainingPages();
    const usagePercent = Math.min(100, (usedPages / totalPages) * 100);

    const planLabel = isFreeTrialActive ? 'Free Trial' :
        plan === 'plan_100' ? 'Starter' :
            plan === 'plan_500' ? 'Pro' :
                plan === 'plan_2000' ? 'Business' : 'Free';

    const barColor = usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-primary';

    const handleCreateDb = () => {
        if (!newDbName.trim()) return;
        onCreateDatabase(newDbName);
        setNewDbName('');
        setIsCreatingDb(false);
    };

    const handleStartRename = (db: { id: string, name: string }) => {
        setEditingDbId(db.id);
        setEditingName(db.name);
    };

    const handleSaveRename = () => {
        if (editingDbId && editingName.trim()) {
            onRenameDatabase(editingDbId, editingName);
        }
        setEditingDbId(null);
    };

    return (
        <div className="w-64 h-screen bg-gray-50 border-r border-gray-200 flex flex-col p-4 flex-shrink-0 overflow-hidden text-slate-900">
            <div className="flex items-center gap-2 px-2 mb-8">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                </div>
                <span className="font-bold text-gray-900 tracking-tight text-lg">Extract<span className="text-primary italic">API</span></span>
            </div>

            <div className="flex flex-col gap-1 flex-grow overflow-y-auto no-scrollbar">
                {/* NEW DATABASE BUTTON */}
                {!isCreatingDb ? (
                    <button
                        onClick={() => setIsCreatingDb(true)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md mb-6"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        New Database
                    </button>
                ) : (
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm mb-6 space-y-2">
                        <input
                            autoFocus
                            type="text"
                            value={newDbName}
                            onChange={(e) => setNewDbName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateDb();
                                if (e.key === 'Escape') setIsCreatingDb(false);
                            }}
                            placeholder="Name..."
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleCreateDb} className="flex-1 py-1.5 bg-primary text-white text-xs font-bold rounded-lg">Create</button>
                            <button onClick={() => setIsCreatingDb(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg">✕</button>
                        </div>
                    </div>
                )}

                {/* DATABASE LIST SECTION */}
                <div className="mb-6">
                    <h4 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">My Databases</h4>
                    <div className="space-y-1">
                        {databases.map(db => (
                            <div key={db.id} className="group relative">
                                {editingDbId === db.id ? (
                                    <div className="flex items-center gap-1 px-1 py-1 bg-white border border-indigo-200 rounded-lg shadow-sm mx-1">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveRename();
                                                if (e.key === 'Escape') setEditingDbId(null);
                                            }}
                                            className="min-w-0 flex-1 px-2 py-1 text-xs outline-none"
                                        />
                                        <button onClick={handleSaveRename} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">✓</button>
                                        <button onClick={() => setEditingDbId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">✕</button>
                                    </div>
                                ) : (
                                    <>
                                        <SidebarItem
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${activeDbId === db.id ? 'text-primary' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                                </svg>
                                            }
                                            label={db.name}
                                            active={activeDbId === db.id}
                                            onClick={() => onSwitchDatabase(db.id)}
                                        />
                                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleStartRename(db); }}
                                                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                title="Rename"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteDatabase(db.id); }}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="my-2 border-t border-gray-200"></div>

                <SidebarItem
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>}
                    label="Documentation"
                    active={activeTab === 'docs'}
                    onClick={() => setActiveTab('docs')}
                />
                <SidebarItem
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>}
                    label="Settings"
                    active={activeTab === 'settings'}
                    onClick={() => setActiveTab('settings')}
                />
            </div>

            <div className="mt-auto pt-4 border-t border-gray-200 space-y-3">
                {/* Plan + pages usage widget */}
                <div className="px-2">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Plan</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isFreeTrialActive ? 'bg-amber-100 text-amber-700' : isPaidUser ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                            {planLabel}
                        </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-gray-400">{usedPages} used</span>
                        <span className="text-[10px] font-semibold text-gray-600">{remainingPages} remaining</span>
                    </div>
                </div>

                {/* User info */}
                <div className="flex items-center gap-3 px-2 pt-1 border-t border-gray-100">
                    <UserButton afterSignOutUrl="/" />
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-gray-900 truncate">{fullName}</span>
                        <span className="text-[10px] text-gray-500 truncate">{email}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
