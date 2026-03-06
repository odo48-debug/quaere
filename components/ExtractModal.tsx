import React, { useState, useRef, useCallback } from 'react';
import { IconSparkles, IconLoader, IconCheck, IconChevronDown, IconChevronRight } from './icons';

type Tab = 'file' | 'url' | 'text';

export type ExtractSource =
    | { type: 'file'; files: File[] }
    | { type: 'url'; url: string }
    | { type: 'text'; text: string };

// Multi-table extraction
export type MultiTableTarget = {
    tableName: string;
    displayName: string;
    columns: { id: string; name: string; type: string }[];
};

interface ExtractModalProps {
    isOpen: boolean;
    onClose: () => void;
    columns: { id: string; name: string }[];
    onExtract: (source: ExtractSource) => Promise<void>;
    onExtractMultiTable?: (source: ExtractSource, targets: MultiTableTarget[]) => Promise<void>;
    isExtracting: boolean;
    batchProgress?: { current: number; total: number; fileName?: string; results?: { name: string; ok: boolean; error?: string }[] };
    allTables?: MultiTableTarget[]; // passed from App.tsx
    activeTableName?: string | null;
}

const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/jpg,image/tiff,text/plain,text/csv,.xlsx,.docx';

export const ExtractModal: React.FC<ExtractModalProps> = ({
    isOpen, onClose, columns, onExtract, onExtractMultiTable,
    isExtracting, batchProgress, allTables = [], activeTableName
}) => {
    const [tab, setTab] = useState<Tab>('file');
    const [dragOver, setDragOver] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [urlInput, setUrlInput] = useState('');
    const [textInput, setTextInput] = useState('');
    const [selectedTables, setSelectedTables] = useState<Set<string>>(
        new Set(activeTableName ? [activeTableName] : [])
    );
    const [showTableSelector, setShowTableSelector] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) setSelectedFiles(files);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) setSelectedFiles(files);
    };

    const toggleTable = (tableName: string) => {
        setSelectedTables(prev => {
            const next = new Set(prev);
            if (next.has(tableName)) { next.delete(tableName); } else { next.add(tableName); }
            return next;
        });
    };

    const isCsvOnly = selectedFiles.length === 1 && selectedFiles[0].name.toLowerCase().endsWith('.csv');
    const isCreateMode = columns.length === 0 && isCsvOnly;
    const isMultiTable = selectedTables.size > 1;
    const targets = allTables.filter(t => selectedTables.has(t.tableName));

    const handleExtract = async () => {
        let source: ExtractSource | undefined;
        if (tab === 'file' && selectedFiles.length > 0) source = { type: 'file', files: selectedFiles };
        else if (tab === 'url' && urlInput.trim()) source = { type: 'url', url: urlInput.trim() };
        else if (tab === 'text' && textInput.trim()) source = { type: 'text', text: textInput.trim() };
        if (!source) return;

        if (isMultiTable && onExtractMultiTable && targets.length > 1) {
            await onExtractMultiTable(source, targets);
        } else {
            await onExtract(source);
        }
    };

    const canExtract = (tab === 'file' && selectedFiles.length > 0) || (tab === 'url' && !!urlInput.trim()) || (tab === 'text' && !!textInput.trim());
    const isBatch = tab === 'file' && selectedFiles.length > 1;

    const handleClose = () => {
        if (!isExtracting) {
            setSelectedFiles([]);
            onClose();
        }
    };

    if (!isOpen) return null;

    const bp = batchProgress;
    const batchRunning = isExtracting && bp && bp.total > 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg text-white overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                            <IconSparkles className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h2 className="font-semibold text-sm">
                            {batchRunning ? `Batch Processing...` : (isCreateMode ? 'Create New Table from CSV' : isMultiTable ? 'Multi-Table Extraction' : 'Add Rows from Source')}
                        </h2>
                        {!batchRunning && !isMultiTable && columns.length > 0 && (
                            <>
                                <span className="text-white/30 text-sm">→</span>
                                <span className="text-indigo-400 text-xs font-medium truncate max-w-[180px]">
                                    {columns.slice(0, 3).map(c => c.name).join(', ')}{columns.length > 3 ? `... +${columns.length - 3}` : ''}
                                </span>
                            </>
                        )}
                    </div>
                    <button onClick={handleClose} disabled={isExtracting} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Batch progress view */}
                {batchRunning && bp ? (
                    <div className="p-5 flex flex-col gap-4">
                        {/* Overall progress bar */}
                        <div>
                            <div className="flex justify-between text-xs text-white/50 mb-1.5">
                                <span>File {bp.current} of {bp.total}</span>
                                <span>{Math.round((bp.current / bp.total) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(bp.current / bp.total) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Current file */}
                        {bp.fileName && (
                            <div className="flex items-center gap-2 text-xs text-white/60 bg-white/5 px-3 py-2 rounded-lg">
                                <IconLoader className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                                <span className="truncate">{bp.fileName}</span>
                            </div>
                        )}

                        {/* Results so far */}
                        {bp.results && bp.results.length > 0 && (
                            <div className="max-h-40 overflow-y-auto flex flex-col gap-1 custom-scrollbar">
                                {bp.results.map((r, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs px-2 py-1">
                                        <span className={r.ok ? 'text-green-400' : 'text-red-400'}>{r.ok ? '✓' : '✗'}</span>
                                        <span className="text-white/50 truncate flex-1">{r.name}</span>
                                        {r.error && <span className="text-red-400/70 text-[10px] truncate max-w-[120px]">{r.error}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex gap-1 px-5 pt-4">
                            {(['file', 'url', 'text'] as Tab[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all capitalize ${tab === t
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                                        }`}
                                >
                                    {t === 'file' && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    )}
                                    {t === 'url' && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    )}
                                    {t === 'text' && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                        </svg>
                                    )}
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            {tab === 'file' && (
                                <div
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/15 hover:border-white/30 hover:bg-white/5'
                                        }`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ACCEPTED_TYPES}
                                        className="hidden"
                                        multiple
                                        onChange={handleFileChange}
                                    />
                                    {selectedFiles.length > 0 ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center relative">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {selectedFiles.length > 1 && (
                                                    <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                        {selectedFiles.length}
                                                    </span>
                                                )}
                                            </div>
                                            {selectedFiles.length === 1 ? (
                                                <>
                                                    <p className="text-sm font-medium text-white">{selectedFiles[0].name}</p>
                                                    <p className="text-xs text-white/40">{(selectedFiles[0].size / 1024).toFixed(1)} KB — Click to change</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-medium text-white">{selectedFiles.length} selected files</p>
                                                    <p className="text-xs text-white/40 text-center leading-relaxed">
                                                        {selectedFiles.slice(0, 3).map(f => f.name).join(', ')}
                                                        {selectedFiles.length > 3 ? ` and ${selectedFiles.length - 3} more` : ''}
                                                    </p>
                                                    <p className="text-xs text-indigo-400/80 mt-1">Batch mode · They will be processed one by one</p>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            <p className="text-sm text-white/60">Drag and drop files or click to select</p>
                                            <p className="text-xs text-white/30">PDF, PNG, JPG, CSV, XLSX, TXT — Multiple files supported</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === 'url' && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-white/40">Enter the URL of a web page or public document.</p>
                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={e => setUrlInput(e.target.value)}
                                        placeholder="https://example.com/invoice.pdf"
                                        className="w-full px-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                                    />
                                </div>
                            )}

                            {tab === 'text' && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-white/40">Paste or type the text from which you want to extract data.</p>
                                    <textarea
                                        value={textInput}
                                        onChange={e => setTextInput(e.target.value)}
                                        placeholder="Paste the document content here..."
                                        rows={7}
                                        className="w-full px-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none custom-scrollbar"
                                    />
                                </div>
                            )}

                            {/* ── Multi-table selector ── */}
                            {allTables.length > 1 && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => setShowTableSelector(v => !v)}
                                        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors w-full"
                                    >
                                        {showTableSelector ? <IconChevronDown className="w-3.5 h-3.5" /> : <IconChevronRight className="w-3.5 h-3.5" />}
                                        <span>Target tables</span>
                                        <span className="ml-auto text-indigo-400 font-semibold">{selectedTables.size} selected</span>
                                    </button>

                                    {showTableSelector && (
                                        <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                                            {allTables.map(t => (
                                                <label
                                                    key={t.tableName}
                                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                                                >
                                                    <div
                                                        onClick={() => toggleTable(t.tableName)}
                                                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${selectedTables.has(t.tableName) ? 'bg-indigo-600 border-indigo-600' : 'border-white/30 bg-transparent'}`}
                                                    >
                                                        {selectedTables.has(t.tableName) && <IconCheck className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                    <span className="text-xs text-white/70">{t.displayName}</span>
                                                    <span className="text-[10px] text-white/30 ml-auto">{t.columns.length} cols</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {isMultiTable && (
                                        <div className="mt-2 p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10">
                                            <p className="text-[11px] text-indigo-300 font-medium mb-1">🔗 Relational extraction active</p>
                                            <p className="text-[10px] text-indigo-300/60 leading-relaxed">
                                                {isBatch
                                                    ? `AI will process ${selectedFiles.length} files sequentially, extracting relational data for ${selectedTables.size} tables from each.`
                                                    : `A single AI call will extract data for all ${selectedTables.size} tables simultaneously, automatically linking them with a shared key.`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Columns preview (single-table mode) */}
                            {!isMultiTable && columns.length > 0 && (
                                <p className="mt-4 text-[11px] text-white/30 leading-relaxed">
                                    <span className="text-white/50">Quaere will extract the following columns: </span>
                                    {columns.map(c => c.name).join(', ')}
                                </p>
                            )}
                            {isCreateMode && (
                                <p className="mt-4 text-[11px] text-indigo-400/80 leading-relaxed bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                                    <span className="font-bold block mb-1">New table detected</span>
                                    This CSV file will be used to create a table automatically with its columns and data.
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 pb-5 flex justify-end">
                            <button
                                onClick={handleExtract}
                                disabled={!canExtract || isExtracting}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:text-indigo-400 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                            >
                                {isExtracting ? (
                                    <>
                                        <IconLoader className="w-4 h-4 animate-spin" />
                                        {isCreateMode ? 'Creating table...' : 'Extracting...'}
                                    </>
                                ) : (
                                    <>
                                        <IconSparkles className="w-4 h-4" />
                                        {isCreateMode
                                            ? 'Import CSV & Create Table'
                                            : isMultiTable
                                                ? (isBatch ? `Batch Extract (${selectedFiles.length} files) ➔ ${selectedTables.size} tables` : `Extract into ${selectedTables.size} tables`)
                                                : (isBatch ? `Extract ${selectedFiles.length} files` : 'Extract with AI')}
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
