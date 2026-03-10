
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DatabaseView, DatabaseViewRef } from './components/DatabaseView';
import { AppSidebar } from './components/AppSidebar';
import { DatabaseSchemaView } from './components/DatabaseSchemaView';
import { IconLayout, IconColumns, IconX, IconSparkles } from './components/icons';
import { usePGlite, useLiveQuery } from './lib/pgliteHooks';
import { createTable } from './lib/pglite';
import { createAgentBridge } from './lib/agentBridge';

const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'database' | 'api' | 'settings' | 'docs'>('database');
  const [workspaceView, setWorkspaceView] = useState<'classic' | 'visual'>('classic');
  const databaseViewRef = useRef<DatabaseViewRef>(null);

  // PGlite database state natively via context hooks
  const db = usePGlite() as any;
  const [activeTable, setActiveTable] = useState<string | null>(() => localStorage.getItem('quaere_active_table'));

  // Multi-database management
  const [databases, setDatabases] = useState<{ id: string; name: string }[]>(() => {
    const stored = localStorage.getItem('quaere_database_list');
    return stored ? JSON.parse(stored) : [{ id: 'default', name: 'Main Database' }];
  });

  const activeDbId = localStorage.getItem('quaere_active_db') || 'default';

  // Multi-tab leader status
  const [isDbLeader, setIsDbLeader] = useState(db?.isLeader || false);

  useEffect(() => {
    if (!db) return;
    setIsDbLeader(db.isLeader);
    const unsubs = db.onLeaderChange(() => {
      setIsDbLeader(db.isLeader);
    });

    // Initialize Agent Bridge
    const closeBridge = createAgentBridge(db);

    return () => {
      if (typeof unsubs === 'function') unsubs();
      closeBridge();
    };
  }, [db]);

  const handleCreateDatabase = useCallback((name: string) => {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (!id) return;
    if (databases.find(db => db.id === id)) {
      alert('A database with this identifier already exists.');
      return;
    }
    const newList = [...databases, { id, name }];
    setDatabases(newList);
    localStorage.setItem('quaere_database_list', JSON.stringify(newList));
    handleSwitchDatabase(id);
  }, [databases]);

  const handleSwitchDatabase = useCallback((id: string) => {
    localStorage.setItem('quaere_active_db', id);
    localStorage.removeItem('quaere_active_table'); // Reset active table for new DB
    window.location.reload();
  }, []);

  const handleRenameDatabase = useCallback((id: string, newName: string) => {
    const newList = databases.map(db => db.id === id ? { ...db, name: newName } : db);
    setDatabases(newList);
    localStorage.setItem('quaere_database_list', JSON.stringify(newList));
  }, [databases]);

  const handleDeleteDatabase = useCallback((id: string) => {
    if (databases.length <= 1) {
      alert('You must have at least one database.');
      return;
    }
    const dbName = databases.find(d => d.id === id)?.name || id;
    if (!confirm(`Are you sure you want to delete the database "${dbName}"? All its tables will be permanently deleted.`)) return;

    const newList = databases.filter(db => db.id !== id);
    setDatabases(newList);
    localStorage.setItem('quaere_database_list', JSON.stringify(newList));

    if (activeDbId === id) {
      handleSwitchDatabase(newList[0].id);
    }
  }, [databases, activeDbId, handleSwitchDatabase]);

  const handleDeleteTable = useCallback(async (tableName: string) => {
    if (!confirm(`Are you sure you want to delete the table "${tableName}"? All data will be permanently lost.`)) return;
    try {
      await db.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      await db.query(`DELETE FROM quaere_tables WHERE name = $1`, [tableName]);
      if (activeTable === tableName) {
        setActiveTable(null);
      }
    } catch (e) {
      alert("Error deleting table.");
    }
  }, [db, activeTable]);

  // Reactive list of user-created tables
  const tablesResult = useLiveQuery('SELECT name, display_name FROM quaere_tables ORDER BY created_at DESC');
  const tables = (tablesResult?.rows || []) as any[];
  const isReady = !!db;

  // Persist active table selection
  useEffect(() => {
    if (activeTable) {
      localStorage.setItem('quaere_active_table', activeTable);
    } else {
      localStorage.removeItem('quaere_active_table');
    }
  }, [activeTable]);

  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  return (
    <div className="h-screen flex bg-[#f8fafc] text-slate-900 antialiased overflow-hidden">
      <div className="flex w-full h-full">
        {/* COLUMN 1: Sidebar */}
        <AppSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeTableId={activeTable || ''}
          onSelectTable={setActiveTable}
          onDeleteTable={handleDeleteTable}
          onBackToHome={() => { }} // No home in this version
          databases={databases}
          activeDbId={activeDbId}
          onSwitchDatabase={handleSwitchDatabase}
          onCreateDatabase={handleCreateDatabase}
          onDeleteDatabase={handleDeleteDatabase}
          onRenameDatabase={handleRenameDatabase}
        />

        {/* COLUMN 2: Workspace (Center) */}
        <main className="flex-grow flex flex-col h-full bg-white overflow-hidden">
          {/* Workspace Header */}
          <header className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-black tracking-tighter uppercase italic mr-4">Quaere Engine</h1>
              <div className="h-4 w-[1px] bg-gray-200"></div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {activeTable || 'No Table Selected'}
              </h2>
              <div className="h-4 w-[1px] bg-gray-200"></div>

              {/* DB Leader Badge */}
              <div
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-tight transition-all duration-500 ${isDbLeader
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                title={isDbLeader ? "This tab is directly connected to the database" : "This tab is proxying queries through a leader tab"}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isDbLeader ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]' : 'bg-amber-500'} transition-colors duration-500`}></div>
                {isDbLeader ? 'LEADER' : 'FOLLOWER'}
              </div>

              <div className="h-4 w-[1px] bg-gray-200"></div>
              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                <button
                  onClick={() => setWorkspaceView('classic')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${workspaceView === 'classic' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <IconColumns className="w-3.5 h-3.5" />
                  Classic
                </button>
                <button
                  onClick={() => setWorkspaceView('visual')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${workspaceView === 'visual' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <IconLayout className="w-3.5 h-3.5" />
                  Visual
                </button>
              </div>
            </div>
          </header>

          {/* Workspace Content */}
          <div className="flex-grow overflow-hidden flex flex-col p-6 bg-[#fcfdfe]">
            {workspaceView === 'classic' ? (
              <div className="flex-1 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] border border-slate-200/60 overflow-hidden">
                <DatabaseView
                  ref={databaseViewRef}
                  activeTableName={activeTable}
                  activeRowId={activeRowId}
                  onSetActiveRow={setActiveRowId}
                  onInsertTag={() => { }}
                  onRenameTag={() => { }}
                  onOpenExtractModal={() => { }} // Feature removed in core
                  isExtracting={false}
                  onSuggestSchema={() => { }} // Feature removed in core
                  isSuggestingSchema={false}
                  canExtract={false}
                  onAICellAction={() => { }}
                  onTableCreated={(name) => setActiveTable(name)}
                />
              </div>
            ) : (
              <div className="flex-1">
                <DatabaseSchemaView
                  activeTable={activeTable}
                  setActiveTable={setActiveTable}
                  tables={tables}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
