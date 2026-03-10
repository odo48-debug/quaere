
import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import type { DatabaseColumn, DatabaseRow } from '../types';
import { IconPlus, IconX, IconDatabase, IconHash, IconTextSize, IconCalendar, IconCheck, IconSettings, IconTrash, IconDownload, IconUpload } from './icons';
import { usePGlite, useLiveQuery } from '../lib/pgliteHooks';

// --------------- Create Table Modal ----------------------------------------
interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (tableName: string) => void;
}

const COL_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'numeric', label: 'Number' },
    { value: 'timestamptz', label: 'Date / Time' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'jsonb', label: 'JSON' },
];

const CreateTableModal: React.FC<CreateTableModalProps> = ({ isOpen, onClose, onCreated }) => {
    const db = usePGlite() as any;
    const [tableName, setTableName] = useState('');
    const [colDefs, setColDefs] = useState<{ id: string; name: string; type: string }[]>([
        { id: crypto.randomUUID(), name: '', type: 'text' }
    ]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addCol = () => setColDefs(prev => [...prev, { id: crypto.randomUUID(), name: '', type: 'text' }]);
    const removeCol = (id: string) => setColDefs(prev => prev.filter(c => c.id !== id));
    const updateCol = (id: string, field: 'name' | 'type', val: string) =>
        setColDefs(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));

    const handleCreate = async () => {
        setError(null);
        const raw = tableName.trim();
        if (!raw) { setError('Table name is required.'); return; }
        const sqlName = raw.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const validCols = colDefs.filter(c => c.name.trim());
        if (validCols.length === 0) { setError('Add at least one column.'); return; }

        setCreating(true);
        try {
            const colsSql = validCols
                .map(c => `"${c.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}" ${c.type}`)
                .join(', ');
            await db.exec(`CREATE TABLE IF NOT EXISTS "${sqlName}" (_id SERIAL, ${colsSql})`);
            await db.query(
                `INSERT INTO quaere_tables (name, display_name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
                [sqlName, raw]
            );
            onCreated(sqlName);
            // Reset
            setTableName('');
            setColDefs([{ id: crypto.randomUUID(), name: '', type: 'text' }]);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Error creating table.');
        } finally {
            setCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-800 uppercase italic tracking-tighter">Create new table</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <IconX className="w-4 h-4" />
                    </button>
                </div>

                {/* Table Name */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Table name</label>
                    <input
                        autoFocus
                        type="text"
                        value={tableName}
                        onChange={e => setTableName(e.target.value)}
                        placeholder="e.g. Invoices 2024"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                    />
                </div>

                {/* Column Builder */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Columns</label>
                        <button
                            onClick={addCol}
                            className="flex items-center gap-1 text-[10px] text-black font-extrabold hover:underline transition-all"
                        >
                            <IconPlus className="w-3.5 h-3.5" /> ADD COLUMN
                        </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {colDefs.map((col, idx) => (
                            <div key={col.id} className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                <input
                                    type="text"
                                    value={col.name}
                                    onChange={e => updateCol(col.id, 'name', e.target.value)}
                                    placeholder={`Column ${idx + 1} name`}
                                    className="flex-1 px-2.5 py-1.5 text-xs bg-transparent focus:outline-none placeholder:text-slate-300 font-bold"
                                    onKeyDown={e => { if (e.key === 'Enter') addCol(); }}
                                />
                                <select
                                    value={col.type}
                                    onChange={e => updateCol(col.id, 'type', e.target.value)}
                                    className="px-2 py-1.5 text-[10px] font-black uppercase tracking-tight bg-white border border-slate-200 rounded text-slate-600 focus:outline-none"
                                >
                                    {COL_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                {colDefs.length > 1 && (
                                    <button
                                        onClick={() => removeCol(col.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <IconX className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{error}</p>}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-white bg-black rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-colors shadow-lg"
                    >
                        {creating ? 'Creating...' : 'Create table'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------

interface DatabaseViewProps {
    activeTableName: string | null;
    activeRowId: string | null;
    onSetActiveRow: (rowId: string | null) => void;
    onInsertTag?: (tag: string) => void;
    onRenameTag?: (oldTag: string, newTag: string) => void;
    onOpenExtractModal?: () => void;
    isExtracting?: boolean;
    onSuggestSchema?: () => void;
    isSuggestingSchema?: boolean;
    canExtract?: boolean;
    onAICellAction?: (rowId: string, colId: string) => void;
    onTableCreated?: (tableName: string) => void;
}

export interface DatabaseViewRef {
    startEditingColumn: (colId: string) => void;
}

const DatabaseViewComponent = forwardRef<DatabaseViewRef, DatabaseViewProps>(({
    activeTableName,
    activeRowId,
    onSetActiveRow,
    onRenameTag,
    onTableCreated
}, ref) => {
    const db = usePGlite();

    // Live query for columns
    const columnsResult = useLiveQuery<{ id: string; name: string; type: string; formula?: string }>(
        `SELECT column_name as id, column_name as name, data_type as type 
         FROM information_schema.columns 
         WHERE table_name = $1 AND column_name NOT IN ('id', '_id', 'created_at', 'updated_at')
         ORDER BY ordinal_position`,
        [activeTableName || '']
    );
    const allColumns = columnsResult?.rows || [];

    // Auto-clean orphaned columns logic preserved
    useEffect(() => {
        if (!db || !activeTableName) return;
        const orphans = allColumns.filter((c: any) => /__(?:tmp|bak)_\d+$/.test(c.id));
        if (orphans.length === 0) return;
        (async () => {
            for (const orphan of orphans) {
                try {
                    await db.query(`ALTER TABLE "${activeTableName}" DROP COLUMN "${orphan.id}" CASCADE`);
                } catch (e) { /* ignore */ }
            }
        })();
    }, [allColumns.map((c: any) => c.id).join(','), activeTableName, db]);

    const columns = allColumns.filter((c: any) => !/__(?:tmp|bak)_\d+$/.test(c.id));
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // Live query for rows
    const orderByClause = sortConfig
        ? `ORDER BY "${sortConfig.key}" ${sortConfig.direction === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`
        : `ORDER BY _id`;

    const rowsResult = useLiveQuery<any>(
        activeTableName
            ? `SELECT * FROM "${activeTableName}" ${orderByClause} LIMIT 100`
            : `SELECT 1 AS _noop WHERE FALSE`
    );
    const rows = rowsResult?.rows || [];

    // Row count
    const countResult = useLiveQuery<{ count: number }>(
        activeTableName
            ? `SELECT COUNT(*)::int as count FROM "${activeTableName}"`
            : `SELECT 0 AS count WHERE FALSE`
    );
    const totalRowsCount = countResult?.rows[0]?.count || 0;
    const isPreviewMode = totalRowsCount > 100;

    const [newColName, setNewColName] = useState('');
    const [newColType, setNewColType] = useState<any>('string');
    const [editingColId, setEditingColId] = useState<string | null>(null);
    const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        const stored = localStorage.getItem(`quaere_col_widths_${activeTableName || 'default'}`);
        return stored ? JSON.parse(stored) : {};
    });

    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const resizingRef = React.useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

    useImperativeHandle(ref, () => ({
        startEditingColumn: (colId: string) => {
            const col = columns.find(c => c.id === colId);
            if (col) handleStartEdit(col);
        }
    }));

    const handleStartEdit = (col: any) => {
        setEditingColId(col.id);
        setNewColName(col.name);
        setNewColType(col.type === 'numeric' ? 'number' : col.type === 'timestamptz' ? 'date' : col.type === 'jsonb' ? 'json' : col.type === 'boolean' ? 'boolean' : 'string');
    };

    const handleAddColumn = async () => {
        if (!newColName.trim() || !activeTableName) return;
        const colId = newColName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (columns.some(col => col.id === colId)) return;
        try {
            let pgType = 'text';
            if (newColType === 'number') pgType = 'numeric';
            else if (newColType === 'date') pgType = 'timestamptz';
            else if (newColType === 'boolean') pgType = 'boolean';
            else if (newColType === 'json') pgType = 'jsonb';
            await db.query(`ALTER TABLE "${activeTableName}" ADD COLUMN "${colId}" ${pgType}`);
            setNewColName('');
        } catch (e) { alert("Error adding column."); }
    };

    const handleUpdateColumn = async () => {
        if (!editingColId || !newColName.trim() || !activeTableName) return;
        const oldCol = columns.find(c => c.id === editingColId);
        if (!oldCol) return;
        const newId = newColName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const isIdChanged = newId !== oldCol.id;
        try {
            if (isIdChanged) {
                await db.query(`ALTER TABLE "${activeTableName}" RENAME COLUMN "${oldCol.id}" TO "${newId}"`);
            }
            // Skipping complex type change logic for this clean version to keep it robust
            setEditingColId(null);
            setNewColName('');
        } catch (e) { alert("Error updating column."); }
    };

    const handleDeleteColumn = async () => {
        if (!editingColId || !activeTableName) return;
        if (!confirm(`Are you sure you want to delete the column "${editingColId}"? This cannot be undone.`)) return;

        try {
            await db.query(`ALTER TABLE "${activeTableName}" DROP COLUMN "${editingColId}" CASCADE`);
            setEditingColId(null);
            setNewColName('');
        } catch (e) {
            alert("Error deleting column.");
        }
    };

    const handleAddRow = async () => {
        if (!activeTableName) return;
        await db.query(`INSERT INTO "${activeTableName}" DEFAULT VALUES`);
    };

    const handleUpdateCell = async (rowId: any, colId: string, value: string) => {
        if (!activeTableName) return;
        await db.query(`UPDATE "${activeTableName}" SET "${colId}" = $1 WHERE _id = $2`, [value, rowId]);
    };

    const handleDeleteRow = async (rowId: any) => {
        if (!activeTableName) return;
        await db.query(`DELETE FROM "${activeTableName}" WHERE _id = $1`, [rowId]);
    };

    const handleResizeStart = (e: React.MouseEvent, colId: string, currentWidth: number) => {
        e.preventDefault();
        resizingRef.current = { colId, startX: e.clientX, startWidth: currentWidth };
        const onMouseMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const delta = ev.clientX - resizingRef.current.startX;
            const newWidth = Math.max(60, resizingRef.current.startWidth + delta);
            setColumnWidths(prev => ({ ...prev, [colId]: newWidth }));
        };
        const onMouseUp = () => {
            if (resizingRef.current) {
                setColumnWidths(prev => {
                    localStorage.setItem(`quaere_col_widths_${activeTableName || 'default'}`, JSON.stringify(prev));
                    return prev;
                });
            }
            resizingRef.current = null;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <>
            <CreateTableModal isOpen={isCreateTableOpen} onClose={() => setIsCreateTableOpen(false)} onCreated={onTableCreated!} />
            <div className="flex flex-col h-full bg-white">
                <div className="p-4 flex items-center justify-between border-b border-slate-50 shrink-0">
                    <div className="flex items-center gap-2">
                        <IconDatabase className="w-5 h-5 text-black" />
                        <h2 className="text-sm font-black uppercase italic tracking-tighter">Local Engine Audit</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsCreateTableOpen(true)}
                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-black text-white rounded-lg hover:bg-slate-900 shadow-sm"
                        >
                            + New Table
                        </button>
                        <div className="w-[1px] h-4 bg-slate-100 mx-1"></div>
                        <button
                            onClick={async () => {
                                if (!activeTableName) return;
                                if (confirm("Truncate all rows?")) await db.query(`TRUNCATE TABLE "${activeTableName}"`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Empty Table"
                        >
                            <IconTrash className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                const blob = new Blob([JSON.stringify({ columns, rows }, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${activeTableName}_export.json`;
                                a.click();
                            }}
                            className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-50 rounded-lg transition-all"
                            title="Export JSON"
                        >
                            <IconDownload className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-hidden flex flex-col">
                    {/* Schema / Quick Add bar */}
                    <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-slate-400">Schema</span>
                        <div className="flex-grow flex items-center gap-2">
                            <input
                                type="text"
                                value={newColName}
                                onChange={e => setNewColName(e.target.value)}
                                placeholder={editingColId ? "Rename column..." : "Add column..."}
                                className="flex-grow max-w-[200px] px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none"
                            />
                            {!editingColId && (
                                <select
                                    value={newColType}
                                    onChange={e => setNewColType(e.target.value)}
                                    className="px-2 py-1 text-[10px] font-black uppercase border border-slate-200 bg-white rounded-md"
                                >
                                    <option value="string">Text</option>
                                    <option value="number">Numeric</option>
                                    <option value="date">Date</option>
                                    <option value="boolean">Bool</option>
                                </select>
                            )}
                            <button
                                onClick={editingColId ? handleUpdateColumn : handleAddColumn}
                                className="px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 rounded hover:border-black active:scale-95 transition-all"
                            >
                                {editingColId ? 'Save' : 'Add'}
                            </button>
                            {editingColId && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleDeleteColumn}
                                        className="px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100 transition-all"
                                        title="Delete Column"
                                    >
                                        Delete
                                    </button>
                                    <button onClick={() => setEditingColId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                        <IconX className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-grow overflow-auto relative custom-scrollbar bg-slate-50/30" ref={scrollContainerRef}>
                        <table className="w-full text-xs border-collapse table-fixed">
                            <thead>
                                <tr className="sticky top-0 z-20 bg-white">
                                    <th className="w-10 px-2 py-2.5 text-center text-[10px] font-black uppercase text-slate-300 border-b border-r border-slate-100 bg-white">#</th>
                                    {columns.map(col => {
                                        const width = columnWidths[col.id] || 150;
                                        return (
                                            <th
                                                key={col.id}
                                                style={{ width, minWidth: width }}
                                                className="px-4 py-2.5 text-left border-b border-r border-slate-100 group bg-white"
                                            >
                                                <div className="flex items-center justify-between gap-1 overflow-hidden" onClick={() => handleStartEdit(col)}>
                                                    <div className="flex items-center gap-2 overflow-hidden cursor-pointer">
                                                        <span className="text-[10px] font-black uppercase tracking-tight truncate">{col.name}</span>
                                                        <span className="text-[9px] font-black text-slate-300 uppercase px-1 rounded border border-slate-100 shrink-0">{col.type.replace('character varying', 'text')}</span>
                                                    </div>
                                                    <div
                                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-black/10 transition-colors"
                                                        onMouseDown={(e) => handleResizeStart(e, col.id, width)}
                                                    />
                                                </div>
                                            </th>
                                        );
                                    })}
                                    <th className="w-10 border-b border-slate-100 bg-white"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length + 2} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                                                    <IconDatabase className="w-6 h-6 text-slate-200" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">No data records found</p>
                                                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-tight">Listening for agent writes or manual entry</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => (
                                        <tr key={row._id} className="group hover:bg-slate-50/80 transition-all border-b border-slate-50">
                                            <td className="px-2 py-2 text-center text-[9px] font-black text-slate-300 font-mono border-r border-slate-50">{idx + 1}</td>
                                            {columns.map(col => (
                                                <td key={col.id} className="px-0 py-0 border-r border-slate-50">
                                                    <input
                                                        type="text"
                                                        value={row[col.id] || ''}
                                                        onChange={e => handleUpdateCell(row._id, col.id, e.target.value)}
                                                        className="w-full px-4 py-3 bg-transparent text-[11px] font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-black placeholder:text-slate-200"
                                                        placeholder="—"
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-1 text-center">
                                                <button onClick={() => handleDeleteRow(row._id)} className="p-1 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                                                    <IconTrash className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={columns.length + 2} className="px-4 py-3 bg-slate-50/20">
                                        <button
                                            onClick={handleAddRow}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all active:translate-x-1"
                                        >
                                            <IconPlus className="w-4 h-4" />
                                            Append manual record
                                        </button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {isPreviewMode && (
                    <div className="px-4 py-2 bg-slate-900 text-white flex items-center justify-between shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Showing 100 of {totalRowsCount} records</span>
                        <span className="text-[9px] font-bold uppercase tracking-tighter text-indigo-400">Memory audit active</span>
                    </div>
                )}
            </div>
        </>
    );
});

DatabaseViewComponent.displayName = 'DatabaseView';
export const DatabaseView = React.memo(DatabaseViewComponent);
