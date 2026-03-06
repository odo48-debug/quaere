import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import type { LocalDatabase, DatabaseColumn, DatabaseRow } from '../types';
import { IconPlus, IconX } from './icons';

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
                    <h2 className="text-base font-bold text-slate-800">Create new table</h2>
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
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Column Builder */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Columns</label>
                        <button
                            onClick={addCol}
                            className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
                        >
                            <IconPlus className="w-3.5 h-3.5" /> Add column
                        </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {colDefs.map((col, idx) => (
                            <div key={col.id} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={col.name}
                                    onChange={e => updateCol(col.id, 'name', e.target.value)}
                                    placeholder={`Column ${idx + 1} name`}
                                    className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    onKeyDown={e => { if (e.key === 'Enter') addCol(); }}
                                />
                                <select
                                    value={col.type}
                                    onChange={e => updateCol(col.id, 'type', e.target.value)}
                                    className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                >
                                    {COL_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                {colDefs.length > 1 && (
                                    <button
                                        onClick={() => removeCol(col.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                                    >
                                        <IconX className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="flex-1 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {creating ? 'Creating...' : 'Create table'}
                    </button>
                </div>
            </div>
        </div>
    );
};
// ---------------------------------------------------------------------------

// Replace direct LocalDatabase prop with live PGlite queries
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

import { usePGlite, useLiveQuery } from '../lib/pgliteHooks';

const DatabaseViewComponent = forwardRef<DatabaseViewRef, DatabaseViewProps>(({
    activeTableName,
    activeRowId,
    onSetActiveRow,
    onInsertTag,
    onRenameTag,
    onOpenExtractModal,
    isExtracting = false,
    onSuggestSchema,
    isSuggestingSchema = false,
    canExtract = false,
    onAICellAction,
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
    // Auto-clean orphaned __tmp_ / __bak_ columns left by interrupted type-change operations
    useEffect(() => {
        if (!db || !activeTableName) return;
        const orphans = allColumns.filter((c: any) => /__(?:tmp|bak)_\d+$/.test(c.id));
        if (orphans.length === 0) return;
        (async () => {
            for (const orphan of orphans) {
                try {
                    await db.query(`ALTER TABLE "${activeTableName}" DROP COLUMN "${orphan.id}" CASCADE`);
                    console.log('[cleanup] Dropped orphan column:', orphan.id);
                } catch (e) { /* ignore */ }
            }
        })();
    }, [allColumns.map((c: any) => c.id).join(','), activeTableName]);
    // Hide internal columns from the schema panel
    const columns = allColumns.filter((c: any) => !/__(?:tmp|bak)_\d+$/.test(c.id));


    // Live query for rows - limited to 100 for performance
    const rowsResult = useLiveQuery<any>(
        activeTableName
            ? `SELECT * FROM "${activeTableName}" ORDER BY _id LIMIT 100`
            : `SELECT 1 AS _noop WHERE FALSE`
    );
    const rows = rowsResult?.rows || [];

    // Live query for total row count
    const countResult = useLiveQuery<{ count: number }>(
        activeTableName
            ? `SELECT COUNT(*)::int as count FROM "${activeTableName}"`
            : `SELECT 0 AS count WHERE FALSE`
    );
    const totalRowsCount = countResult?.rows[0]?.count || 0;
    const isPreviewMode = totalRowsCount > 100;

    const [newColName, setNewColName] = useState('');
    const [newColFormula, setNewColFormula] = useState('');
    const [newColType, setNewColType] = useState<DatabaseColumn['type']>('string');
    const [editingColId, setEditingColId] = useState<string | null>(null);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);

    // Drag-to-scroll state
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const dragScrollRef = React.useRef<{
        isDragging: boolean;
        startX: number;
        scrollLeft: number;
    }>({ isDragging: false, startX: 0, scrollLeft: 0 });

    const handleDragScrollMouseDown = (e: React.MouseEvent) => {
        // Only trigger if clicking on the container or non-interactive elements
        const target = e.target as HTMLElement;
        if (
            target.closest('button') ||
            target.closest('input') ||
            target.closest('textarea') ||
            target.closest('.cursor-col-resize')
        ) {
            return;
        }

        if (!scrollContainerRef.current) return;

        dragScrollRef.current = {
            isDragging: true,
            startX: e.pageX - scrollContainerRef.current.offsetLeft,
            scrollLeft: scrollContainerRef.current.scrollLeft
        };
        scrollContainerRef.current.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    };

    const handleDragScrollMouseMove = (e: React.MouseEvent) => {
        if (!dragScrollRef.current.isDragging || !scrollContainerRef.current) return;

        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - dragScrollRef.current.startX) * 1.5; // multiplier for speed
        scrollContainerRef.current.scrollLeft = dragScrollRef.current.scrollLeft - walk;
    };

    const handleDragScrollStop = () => {
        dragScrollRef.current.isDragging = false;
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.cursor = 'grab';
        }
        document.body.style.userSelect = '';
    };

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        const stored = localStorage.getItem(`quaere_col_widths_${activeTableName || 'default'}`);
        return stored ? JSON.parse(stored) : {};
    });

    const resizingRef = React.useRef<{
        colId: string;
        startX: number;
        startWidth: number;
    } | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(`quaere_col_widths_${activeTableName || 'default'}`);
        if (stored) {
            setColumnWidths(JSON.parse(stored));
        } else {
            setColumnWidths({});
        }
    }, [activeTableName]);

    const handleResizeStart = (e: React.MouseEvent, colId: string, currentWidth: number) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = {
            colId,
            startX: e.clientX,
            startWidth: currentWidth
        };

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!resizingRef.current) return;
            const delta = moveEvent.clientX - resizingRef.current.startX;
            const newWidth = Math.max(40, resizingRef.current.startWidth + delta);

            setColumnWidths(prev => ({
                ...prev,
                [colId]: newWidth
            }));
        };

        const onMouseUp = () => {
            if (resizingRef.current) {
                // Persist widths to localStorage
                setColumnWidths(prev => {
                    localStorage.setItem(`quaere_col_widths_${activeTableName || 'default'}`, JSON.stringify(prev));
                    return prev;
                });
            }
            resizingRef.current = null;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    useImperativeHandle(ref, () => ({
        startEditingColumn: (colId: string) => {
            const col = columns.find(c => c.id === colId);
            if (col) {
                handleStartEdit(col);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }));

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                (e.target as HTMLElement).isContentEditable
            ) {
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (rows.length === 0) return;

                e.preventDefault();

                if (!activeRowId) {
                    onSetActiveRow(rows[0]._id);
                    return;
                }

                const currentIndex = rows.findIndex(r => r._id === activeRowId);
                if (currentIndex === -1) return;

                let nextIndex = currentIndex;
                if (e.key === 'ArrowDown' && currentIndex < rows.length - 1) {
                    nextIndex = currentIndex + 1;
                } else if (e.key === 'ArrowUp' && currentIndex > 0) {
                    nextIndex = currentIndex - 1;
                }

                if (nextIndex !== currentIndex) {
                    const nextId = rows[nextIndex]._id;
                    onSetActiveRow(nextId);
                    setExpandedRowId(null);

                    setTimeout(() => {
                        const el = document.getElementById(`row-card-${nextId}`);
                        if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }, 50);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [rows, activeRowId, onSetActiveRow]);

    const handleAddColumn = async () => {
        if (!newColName.trim() || !activeTableName) return;

        const colId = newColName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

        if (columns.some(col => col.id === colId)) {
            alert("A column with a similar name already exists.");
            return;
        }

        try {
            // Simplified for now: map internal types to Postgres types
            let pgType = 'text';
            if (newColType === 'number') pgType = 'numeric';
            else if (newColType === 'date') pgType = 'timestamptz';
            else if (newColType === 'boolean') pgType = 'boolean';
            else if (newColType === 'json') pgType = 'jsonb';

            await db.query(`ALTER TABLE "${activeTableName}" ADD COLUMN "${colId}" ${pgType}`);

            setNewColName('');
            setNewColFormula('');
            setNewColType('string');
        } catch (e) {
            console.error("Failed to add column:", e);
            alert("Error adding column to database.");
        }
    };

    const handleStartEdit = (col: any) => {
        setEditingColId(col.id);
        setNewColName(col.name);
        setNewColFormula(col.formula || '');
        setNewColType(col.type as any);
    };

    const handleUpdateColumn = async () => {
        if (!editingColId || !newColName.trim() || !activeTableName) return;

        const oldCol = columns.find(c => c.id === editingColId);
        if (!oldCol) {
            console.warn('[handleUpdateColumn] oldCol not found for editingColId:', editingColId, 'available:', columns.map(c => c.id));
            return;
        }

        const newId = newColName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const isIdChanged = newId !== oldCol.id;

        console.log('[handleUpdateColumn] rename:', oldCol.id, '→', newId, '| isIdChanged:', isIdChanged);

        try {
            // Map UI type to Postgres type
            const pgTypeMap: Record<string, string> = {
                string: 'text',
                number: 'numeric',
                date: 'timestamptz',
                boolean: 'boolean',
                json: 'jsonb',
            };

            // Work on the final column id (after possible rename)
            const workingId = isIdChanged ? newId : oldCol.id;

            if (isIdChanged) {
                await db.query(`ALTER TABLE "${activeTableName}" RENAME COLUMN "${oldCol.id}" TO "${newId}"`);
            }

            // Change type if it differs
            const currentPgType = oldCol.type?.toLowerCase() || 'text';
            const targetType = pgTypeMap[newColType] || 'text';
            // Normalise the type coming from information_schema (e.g. "character varying" → "text")
            const typeChanged = !currentPgType.includes(targetType.replace('tz', '')) && targetType !== 'text' || (targetType === 'text' && !currentPgType.includes('text') && !currentPgType.includes('character'));

            if (typeChanged) {
                // PGlite live queries attach internal PG rules to each column name.
                // Strategy: RENAME old column first (rules move with the name), then ADD new one,
                // copy data, and DROP the renamed backup — which now has no "live" rules on it.
                const bakId = `${workingId}__bak_${Date.now()}`;
                const castMap: Record<string, string> = {
                    'numeric': `"${bakId}"::text::numeric`,
                    'timestamptz': `"${bakId}"::text::timestamptz`,
                    'boolean': `("${bakId}"::text IN ('true','1','yes'))`,
                    'jsonb': `"${bakId}"::text::jsonb`,
                    'text': `"${bakId}"::text`,
                };
                const castExpr = castMap[targetType] || `"${bakId}"::text`;

                // 1. Rename old column → backup (live-query rules follow the rename)
                await db.query(`ALTER TABLE "${activeTableName}" RENAME COLUMN "${workingId}" TO "${bakId}"`);
                // 2. Add new column with target type (no rules attached yet)
                await db.query(`ALTER TABLE "${activeTableName}" ADD COLUMN "${workingId}" ${targetType}`);
                // 3. Copy data with cast
                await db.query(`UPDATE "${activeTableName}" SET "${workingId}" = ${castExpr}`);
                // 4. Drop backup CASCADE (drops the rules that were on the original column)
                await db.query(`ALTER TABLE "${activeTableName}" DROP COLUMN "${bakId}" CASCADE`);
            }

            if (isIdChanged && onRenameTag) {
                onRenameTag(oldCol.id, newId);
            }

            setEditingColId(null);
            setNewColName('');
            setNewColFormula('');
            setNewColType('string');
        } catch (e) {
            console.error("Failed to update column:", e);
            alert("Error updating column in database.");
        }
    };

    const handleCancelEdit = () => {
        setEditingColId(null);
        setNewColName('');
        setNewColFormula('');
        setNewColType('string');
    };

    const handleAddRow = async () => {
        if (!activeTableName) return;
        try {
            await db.query(`INSERT INTO "${activeTableName}" DEFAULT VALUES`);
            // We can't immediately auto-select the new row ID easily without returning it, 
            // but the LiveQuery will refresh the table automatically.
        } catch (e) {
            console.error("Failed to add row:", e);
        }
    };

    const handleUpdateCell = async (rowId: string, colId: string, value: string) => {
        if (!activeTableName) return;
        try {
            await db.query(
                `UPDATE "${activeTableName}" SET "${colId}" = $1 WHERE _id = $2`,
                [value, rowId]
            );
        } catch (e) {
            console.error("Failed to update cell:", e);
        }
    };

    const handleDeleteColumn = async (colId: string) => {
        if (!activeTableName) return;
        const confirmDelete = window.confirm("Are you sure you want to delete this column?");
        if (!confirmDelete) return;

        try {
            await db.query(`ALTER TABLE "${activeTableName}" DROP COLUMN "${colId}"`);
        } catch (e) {
            console.error("Failed to delete column:", e);
        }
    };

    const handleDeleteRow = async (rowId: string) => {
        if (!activeTableName) return;
        try {
            await db.query(`DELETE FROM "${activeTableName}" WHERE _id = $1`, [rowId]);
        } catch (e) {
            console.error("Failed to delete row:", e);
        }
    };

    return (
        <>
            <CreateTableModal
                isOpen={isCreateTableOpen}
                onClose={() => setIsCreateTableOpen(false)}
                onCreated={(name) => { onTableCreated?.(name); }}
            />
            <div className="flex flex-col h-full bg-white text-gray-800">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Database</h2>
                        <p className="text-xs text-gray-500">Define tags and populate data.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setIsCreateTableOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 hover:border-slate-300 transition-colors"
                            title="Manually create a new table with custom columns"
                        >
                            <IconPlus className="w-3.5 h-3.5" />
                            New Table
                        </button>
                        {onOpenExtractModal && (
                            <button
                                onClick={onOpenExtractModal}
                                disabled={isExtracting}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                title="Extract data from a document, URL or text"
                            >
                                {isExtracting ? (
                                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                )}
                                Extract data
                            </button>
                        )}
                        <button
                            onClick={async () => {
                                if (!activeTableName) return;
                                if (window.confirm("Are you sure you want to EMPTY the current table? All data will be deleted but columns will remain.")) {
                                    await db.query(`TRUNCATE TABLE "${activeTableName}"`);
                                }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Empty table"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                        <button
                            onClick={() => {
                                const blob = new Blob([JSON.stringify({ columns, rows }, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${activeTableName || 'ejemplo'}_export_${new Date().toISOString().split('T')[0]}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                            title="Export data (JSON)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                        <label className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors cursor-pointer" title="Import data (JSON)">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (re) => {
                                        try {
                                            const imported = JSON.parse(re.target?.result as string);
                                            if (imported.columns && imported.rows && activeTableName) {
                                                if (window.confirm("Importing will add these columns and rows to the current table. Continue?")) {
                                                    // 1. Ensure columns exist
                                                    for (const col of imported.columns) {
                                                        const colId = col.id.replace(/[^a-z0-9_]/g, '');
                                                        if (!columns.some(c => c.id === colId)) {
                                                            db.query(`ALTER TABLE "${activeTableName}" ADD COLUMN IF NOT EXISTS "${colId}" text`).catch(console.error);
                                                        }
                                                    }
                                                    // 2. Insert rows
                                                    for (const row of imported.rows) {
                                                        const keys = Object.keys(row).filter(k => k !== 'id' && k !== 'autoNumber' && k !== 'createdAt');
                                                        if (keys.length === 0) continue;
                                                        const cols = keys.map(k => `"${k.replace(/[^a-z0-9_]/g, '')}"`).join(', ');
                                                        const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
                                                        const args = keys.map(k => row[k] ? String(row[k]) : null);
                                                        db.query(`INSERT INTO "${activeTableName}" (${cols}) VALUES (${vals})`, args).catch(console.error);
                                                    }
                                                }
                                            } else {
                                                alert("Invalid database file format or no active table.");
                                            }
                                        } catch (err) {
                                            alert("Error parsing database file.");
                                        }
                                    };
                                    reader.readAsText(file);
                                    e.target.value = '';
                                }}
                            />
                        </label>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                    {/* Columns / Schema Management */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold">Schema</h3>
                            <button
                                onClick={onSuggestSchema}
                                disabled={!canExtract || isSuggestingSchema}
                                className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition-colors
                                ${(!canExtract || isSuggestingSchema)
                                        ? 'text-gray-400 bg-gray-50'
                                        : 'text-secondary bg-secondary/5 hover:bg-secondary/10 border border-secondary/20'}`}
                                title="Let Gemini suggest the database schema from the document"
                            >
                                {isSuggestingSchema ? (
                                    <>
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Suggesting...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                                        </svg>
                                        Auto-Generate
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="space-y-2 mb-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newColName}
                                    onChange={(e) => setNewColName(e.target.value)}
                                    placeholder="e.g. Total Price"
                                    className="flex-grow px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            editingColId ? handleUpdateColumn() : handleAddColumn();
                                        }
                                    }}
                                />
                                <select
                                    value={newColType}
                                    onChange={(e) => setNewColType(e.target.value as any)}
                                    className="px-2 py-1.5 text-xs border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="string">String</option>
                                    <option value="number">Number</option>
                                    <option value="date">Date</option>
                                    <option value="json">JSON / List</option>
                                    <option value="boolean">Boolean</option>
                                </select>
                                <button
                                    onClick={editingColId ? handleUpdateColumn : handleAddColumn}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${editingColId ? 'bg-secondary text-white hover:bg-secondary-dark' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    {editingColId ? 'Update' : 'Add'}
                                </button>
                                {editingColId && (
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={newColFormula}
                                onChange={(e) => setNewColFormula(e.target.value)}
                                placeholder="Formula (optional): {price} * {qty}"
                                className="w-full px-3 py-1.5 text-xs border rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-secondary italic"
                                title="Use tags like {tag_name} and math operators (+, -, *, /)"
                            />
                        </div>
                    </div>

                    {/* Preview Mode Banner */}
                    {isPreviewMode && (
                        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-amber-100 rounded">
                                    <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <span className="text-[11px] font-medium text-amber-800">
                                    Preview Mode: Showing 100 of {totalRowsCount.toLocaleString()} rows for performance.
                                    <span className="ml-1 font-normal opacity-70 italic">
                                        (The AI assistant has access to all {totalRowsCount.toLocaleString()} rows via SQL)
                                    </span>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Classic Spreadsheet Table */}
                    <div
                        ref={scrollContainerRef}
                        className="overflow-auto rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing"
                        onMouseDown={handleDragScrollMouseDown}
                        onMouseMove={handleDragScrollMouseMove}
                        onMouseUp={handleDragScrollStop}
                        onMouseLeave={handleDragScrollStop}
                    >
                        <table className="w-full text-xs border-collapse table-fixed">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    {/* Row number column */}
                                    <th className="w-10 px-2 py-2.5 text-center text-gray-400 font-medium border-r border-gray-200 sticky left-0 bg-gray-50">#</th>
                                    {columns.map(col => {
                                        const width = columnWidths[col.id] || 120;
                                        return (
                                            <th
                                                key={col.id}
                                                style={{ width, minWidth: width }}
                                                className="px-3 py-2.5 text-left font-semibold text-gray-600 border-r border-gray-200 whitespace-nowrap cursor-pointer hover:bg-gray-100 group relative"
                                                onClick={() => handleStartEdit(col)}
                                                title="Click to edit column"
                                            >
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <span className="truncate">{col.name}</span>
                                                    <span className="text-[9px] font-normal text-gray-400 bg-gray-200 px-1 rounded uppercase shrink-0">{col.type}</span>
                                                    {col.formula && <span className="text-[9px] font-normal text-blue-400 bg-blue-50 px-1 rounded italic shrink-0">ƒ</span>}
                                                </div>
                                                {/* Resizer Handle */}
                                                <div
                                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary transition-colors z-10"
                                                    onMouseDown={(e) => handleResizeStart(e, col.id, width)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </th>
                                        );
                                    })}
                                    {/* Actions column */}
                                    <th className="w-10 px-2 py-2.5 text-center text-gray-400 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length + 2} className="text-center py-10 text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
                                                </svg>
                                                <span className="text-sm">No data. Extract data from a document or add a row.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, index) => {
                                        const isActive = activeRowId === row.id;
                                        return (
                                            <tr
                                                key={row._id}
                                                id={`row-card-${row._id}`}
                                                onClick={() => onSetActiveRow(row._id)}
                                                className={`border-b border-gray-100 transition-colors cursor-pointer ${isActive ? 'bg-primary/5' : 'hover:bg-gray-50/70'}`}
                                            >
                                                {/* Row number */}
                                                <td className="px-2 py-1.5 text-center text-gray-400 font-mono border-r border-gray-100 sticky left-0 bg-inherit text-[10px]">
                                                    {row.autoNumber || index + 1}
                                                </td>

                                                {/* Data cells */}
                                                {columns.map(col => {
                                                    const width = columnWidths[col.id] || 120;
                                                    return (
                                                        <td
                                                            key={col.id}
                                                            style={{ width, minWidth: width }}
                                                            className="px-1 py-1 border-r border-gray-100 group/cell relative overflow-hidden"
                                                        >
                                                            {col.type === 'boolean' ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={row[col.id] === 'true'}
                                                                    disabled={!!col.formula}
                                                                    onChange={(e) => handleUpdateCell(row.id, col.id, e.target.checked.toString())}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="h-3.5 w-3.5 text-primary border-gray-300 rounded ml-2"
                                                                />
                                                            ) : col.type === 'json' ? (
                                                                <textarea
                                                                    value={row[col.id] || ''}
                                                                    readOnly={!!col.formula}
                                                                    onChange={(e) => handleUpdateCell(row.id, col.id, e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    rows={1}
                                                                    className={`w-full px-2 py-1 text-xs rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none bg-transparent min-w-0 max-h-16 ${col.formula ? 'text-gray-400 italic' : ''}`}
                                                                    placeholder="[]"
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                                                                        value={row[col.id] || ''}
                                                                        readOnly={!!col.formula}
                                                                        onChange={(e) => handleUpdateCell(row.id, col.id, e.target.value)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className={`w-full px-2 py-1 text-xs rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-0 ${col.formula ? 'bg-gray-50 text-gray-500 italic' : 'bg-transparent'}`}
                                                                        placeholder={col.formula ? 'Auto' : '—'}
                                                                    />
                                                                    {!col.formula && onAICellAction && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); onAICellAction(row.id, col.id); }}
                                                                            className="opacity-0 group-hover/cell:opacity-100 p-1 rounded hover:bg-primary/10 transition-all shrink-0"
                                                                            title={`Ask AI: ${col.name}`}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                                                                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* Delete button */}
                                                <td className="px-1 py-1 text-center">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteRow(row._id); }}
                                                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete row"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {/* Footer: Add Row button */}
                            <tfoot>
                                <tr>
                                    <td
                                        colSpan={columns.length + 2}
                                        className="px-3 py-2 border-t border-dashed border-gray-200 bg-gray-50/50"
                                    >
                                        <button
                                            onClick={handleAddRow}
                                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add row
                                        </button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
});

DatabaseViewComponent.displayName = 'DatabaseView';
export const DatabaseView = React.memo(DatabaseViewComponent);
