import React from 'react';
import type { LocalDatabase, DatabaseColumn } from '../types';

interface TagsPanelProps {
    database: LocalDatabase;
    onInsertTag?: (tag: string) => void;
    onEditColumn?: (col: DatabaseColumn) => void;
    onDeleteColumn?: (colId: string) => void;
}

export const TagsPanel: React.FC<TagsPanelProps> = ({
    database,
    onInsertTag,
    onEditColumn,
    onDeleteColumn,
}) => {
    const typeColors: Record<string, string> = {
        string: 'bg-blue-50 text-blue-700 border-blue-200',
        number: 'bg-amber-50 text-amber-700 border-amber-200',
        date: 'bg-green-50 text-green-700 border-green-200',
        boolean: 'bg-purple-50 text-purple-700 border-purple-200',
        json: 'bg-rose-50 text-rose-700 border-rose-200',
    };

    const typeIcons: Record<string, string> = {
        string: 'Aa',
        number: '123',
        date: '📅',
        boolean: '✓',
        json: '{}',
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-r border-gray-100 w-48 flex-shrink-0">
            {/* Header */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest">Tags</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Click to insert</p>
            </div>

            {/* Tags list */}
            <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {/* System tags */}
                <div className="mb-2">
                    <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">System</p>
                    <button
                        onClick={() => onInsertTag?.('autoNumber')}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors text-left"
                        title="Insert Row Number"
                    >
                        <span className="text-[9px] font-bold opacity-50 w-6 text-center flex-shrink-0">#</span>
                        <span className="truncate">autoNumber</span>
                    </button>
                    <button
                        onClick={() => onInsertTag?.('createdAt')}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs border mt-1 bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors text-left"
                        title="Insert Creation Date"
                    >
                        <span className="text-[9px] font-bold opacity-50 w-6 text-center flex-shrink-0">📅</span>
                        <span className="truncate">createdAt</span>
                    </button>
                </div>

                {/* User-defined columns */}
                {database.columns.length > 0 && (
                    <div>
                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">Columns</p>
                        <div className="space-y-1">
                            {database.columns.map(col => (
                                <div
                                    key={col.id}
                                    className={`group relative flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs border cursor-pointer transition-colors
                                        ${col.formula
                                            ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
                                            : (typeColors[col.type] || 'bg-blue-50 text-blue-700 border-blue-200') + ' hover:opacity-90'
                                        }`}
                                    onClick={() => onInsertTag?.(col.id)}
                                    title={col.formula ? `∑ ${col.formula}` : `Type: ${col.type}. Click to insert.`}
                                >
                                    <span className="text-[9px] font-bold opacity-50 w-6 text-center flex-shrink-0">
                                        {col.formula ? '∑' : (typeIcons[col.type] || 'Aa')}
                                    </span>
                                    <span className="truncate flex-1">{col.id}</span>

                                    {/* Edit/Delete on hover */}
                                    <div className="hidden group-hover:flex items-center gap-0.5 absolute right-1 top-1/2 -translate-y-1/2 bg-white rounded shadow-sm border border-gray-100">
                                        {onEditColumn && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditColumn(col); }}
                                                className="p-0.5 text-gray-400 hover:text-blue-500 rounded"
                                                title="Edit column"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </button>
                                        )}
                                        {onDeleteColumn && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteColumn(col.id); }}
                                                className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                                                title="Delete column"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {database.columns.length === 0 && (
                    <div className="text-center py-6 px-2">
                        <p className="text-[10px] text-gray-400">No tags yet.</p>
                        <p className="text-[10px] text-gray-400">Add columns in the DB panel.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
