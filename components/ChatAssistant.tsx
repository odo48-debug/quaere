import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { IconSparkles, IconLoader } from './icons';
import { usePGlite, useLiveQuery } from '../lib/pgliteHooks';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from 'react-error-boundary';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip as ChartTooltip,
    Legend as ChartLegend,
    Filler,
    RadialLinearScale
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    ChartTooltip,
    ChartLegend,
    Filler,
    RadialLinearScale
);

interface Message {
    role: 'user' | 'assistant';
    content: string;
    actions?: any[];
    queryResult?: { columns: string[]; rows: any[][]; rawRows?: any[]; error?: string };
}

interface ChatAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    activeTable: string | null;
    context: {
        rowId?: string;
        colId?: string;
        colName?: string;
        rowIdValue?: string | number;
    } | null;
    onApplyActions?: (actions: any[]) => Promise<void> | void;
}

// Renders text with ```lang ... ``` code blocks highlighted
const MessageContent: React.FC<{ content: string }> = ({ content }) => {
    const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);
    return (
        <div className="space-y-2">
            {parts.map((part, i) => {
                const codeMatch = part.match(/^```([\w]*)\n([\s\S]*?)```$/);
                if (codeMatch) {
                    const lang = codeMatch[1];
                    const code = codeMatch[2];
                    return (
                        <div key={i} className="rounded-lg overflow-hidden border border-gray-800/30">
                            {lang && (
                                <div className="px-3 py-1 bg-gray-800 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                                    {lang}
                                </div>
                            )}
                            <pre className="p-3 bg-gray-900 text-green-400 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {code}
                            </pre>
                        </div>
                    );
                }
                return (
                    <span key={i} className="whitespace-pre-wrap text-xs leading-relaxed">
                        {part.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
                            const bold = seg.match(/^\*\*([^*]+)\*\*$/);
                            return bold ? <strong key={j}>{bold[1]}</strong> : seg;
                        })}
                    </span>
                );
            })}
        </div>
    );
};

// ------------------------------------------------------------------------------------------------
// GMAIL SYNC CARD
// ------------------------------------------------------------------------------------------------

// Fuzzy-maps Gmail email data to existing table columns based on keyword matching.
function mapEmailToSchema(
    item: Record<string, any>,
    schema: { id: string; name: string }[]
): { key: string; value: string }[] {
    const GMAIL_FIELDS: { value: string; keywords: string[] }[] = [
        { value: item.date, keywords: ['date', 'fecha', 'time', 'when', 'sent', 'received', 'created', 'recib', 'enviad', 'timestamp'] },
        { value: item.sender, keywords: ['from', 'sender', 'email', 'remit', 'author', 'contact', 'mail', 'correo'] },
        { value: item.subject, keywords: ['subject', 'title', 'asunto', 'titulo', 'heading', 'nombre'] },
        { value: item.content_preview, keywords: ['content', 'conten', 'body', 'text', 'message', 'snippet', 'cuerpo', 'descripcion', 'preview', 'summary', 'nota', 'mensaje'] },
        { value: 'gmail', keywords: ['source', 'fuente', 'origin', 'origen'] },
    ];

    return schema
        .filter(col => col.id !== 'id' && col.id !== '_id')
        .map(col => {
            const colLower = col.id.toLowerCase();
            const match = GMAIL_FIELDS.find(gf =>
                gf.keywords.some(kw => colLower.includes(kw))
            );
            return { key: col.id, value: match?.value ?? '' };
        })
        .filter(pair => pair.value !== '');
}

const GmailSyncCard: React.FC<{
    query: string;
    limit?: number;
    userId: string;
    schema: { id: string; name: string }[];
    onApplyActions?: (actions: any[]) => void;
}> = ({ query, limit = 5, userId, schema, onApplyActions }) => {
    const [status, setStatus] = useState<'loading' | 'needs_auth' | 'success' | 'error'>('loading');
    const [authUrl, setAuthUrl] = useState<string | null>(null);
    const [data, setData] = useState<any[]>([]);
    const [syncing, setSyncing] = useState(false);

    const performSync = useCallback(async () => {
        setSyncing(true);
        setStatus('loading');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const resp = await fetch(`${apiUrl}/gmail/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, query, limit })
            });
            const result = await resp.json();
            if (result.status === 'needs_auth') {
                setStatus('needs_auth');
                setAuthUrl(result.auth_url);
            } else if (result.status === 'success') {
                setData(result.data || []);
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (e) {
            console.error("Gmail sync failed:", e);
            setStatus('error');
        } finally {
            setSyncing(false);
        }
    }, [userId, query, limit]);

    useEffect(() => {
        performSync();
    }, [performSync]);

    const handleImport = () => {
        if (!onApplyActions || data.length === 0) return;

        const actions = data.map(item => ({
            type: 'ADD_ROW',
            payload: {
                values: schema.length > 0
                    ? mapEmailToSchema(item, schema)
                    // Fallback if no schema (e.g. table not selected)
                    : [
                        { key: 'date', value: item.date },
                        { key: 'sender', value: item.sender },
                        { key: 'subject', value: item.subject },
                        { key: 'content', value: item.content_preview },
                        { key: 'source', value: 'gmail' }
                    ]
            }
        }));

        onApplyActions(actions);
    };

    // Build a preview of the column mapping for the user to see
    const previewMapping = schema.length > 0 ? mapEmailToSchema(
        { date: '...', sender: '...', subject: '...', content_preview: '...', source: 'gmail' },
        schema
    ) : [];

    return (
        <div className="mt-4 bg-white border border-indigo-100 rounded-xl shadow-sm overflow-hidden text-gray-800">
            <div className="bg-gradient-to-r from-red-50 to-white px-4 py-2 border-b border-red-100 flex items-center gap-2">
                <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Gmail Sync</span>
                {status === 'loading' && <IconLoader className="w-3 h-3 animate-spin text-red-300 ml-auto" />}
            </div>

            <div className="p-4">
                {status === 'loading' && (
                    <div className="flex flex-col items-center py-4 space-y-2">
                        <div className="text-xs text-gray-500">Searching your inbox for "{query}"...</div>
                    </div>
                )}

                {status === 'needs_auth' && (
                    <div className="space-y-3">
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                            To scan your emails, you need to authorize the application. Click below to connect via OAuth.
                        </p>
                        <a
                            href={authUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                        >
                            Connect Gmail Account
                        </a>
                        <p className="text-[9px] text-gray-400 italic">
                            *This will open a new tab. Once authorized, return here to continue.
                        </p>
                        <button
                            onClick={performSync}
                            className="block text-[10px] text-indigo-600 hover:underline mt-2"
                        >
                            I've connected, try again
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-3">
                        <p className="text-[11px] text-green-600 font-semibold">
                            Found {data.length} relevant emails.
                        </p>
                        {/* Column mapping preview */}
                        {previewMapping.length > 0 && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2">
                                <p className="text-[9px] font-bold uppercase text-indigo-500 mb-1">Column mapping</p>
                                <div className="flex flex-wrap gap-1">
                                    {previewMapping.map(pair => (
                                        <span key={pair.key} className="text-[9px] bg-white border border-indigo-200 px-1.5 py-0.5 rounded text-gray-700">
                                            <span className="text-indigo-500 font-bold">{pair.key}</span>
                                        </span>
                                    ))}
                                </div>
                                {previewMapping.length < schema.filter(c => c.id !== 'id' && c.id !== '_id').length && (
                                    <p className="text-[8px] text-amber-500 mt-1">⚠ Some columns could not be auto-mapped.</p>
                                )}
                            </div>
                        )}
                        <div className="max-h-40 overflow-y-auto space-y-2 bg-gray-50 p-2 rounded-lg border border-gray-100 custom-scrollbar">
                            {data.map((item, idx) => (
                                <div key={idx} className="bg-white p-2 rounded border border-gray-200 shadow-xs">
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <div className="text-[10px] font-bold text-gray-800 truncate flex-1">{item.subject}</div>
                                        <div className="text-[8px] text-gray-400 whitespace-nowrap">{item.date}</div>
                                    </div>
                                    <div className="text-[9px] text-gray-500 line-clamp-1 italic">From: {item.sender}</div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleImport}
                            className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95"
                        >
                            Import these {data.length} records to table
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-red-500 text-xs py-2">
                        Failed to sync Gmail. Please check your connection or try again.
                    </div>
                )}
            </div>
        </div>
    );
};

// Collapsible SQL card
const ExecutedSqlCard: React.FC<{ sql: string }> = ({ sql }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="mt-2 rounded-lg border border-gray-800/20 shadow-sm overflow-hidden bg-white text-gray-800">
            <div
                className="px-3 py-2 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-700">Executed SQL</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transform transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {expanded && (
                <div className="border-t border-gray-100 p-3 bg-gray-900 overflow-x-auto">
                    <pre className="text-[10px] font-mono leading-relaxed text-green-400 whitespace-pre-wrap">
                        {sql}
                    </pre>
                </div>
            )}
        </div>
    );
};

// Inline table to show SELECT results
const QueryResultTable: React.FC<{ columns?: string[]; rows?: any[][] }> = ({ columns, rows }) => {
    if (!columns || columns.length === 0 || !rows) return null;
    return (
        <div className="mt-2 rounded-lg border border-indigo-100 overflow-hidden text-[10px]">
            <div className="px-3 py-1.5 bg-indigo-50 text-indigo-600 font-semibold flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                </svg>
                {rows.length} row{rows.length !== 1 ? 's' : ''}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {columns.map(col => (
                                <th key={col} className="px-2 py-1 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {row.map((cell, j) => (
                                    <td key={j} className="px-2 py-1 text-gray-700 max-w-[120px] truncate whitespace-nowrap">
                                        {cell === null ? <span className="text-gray-300 italic">null</span> : String(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="px-2 py-2 text-center text-gray-400 italic">
                                    No results
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Refined Chart component using Chart.js + Framer Motion
const GeneratedChart: React.FC<{ config: any }> = ({ config }) => {
    if (!config) return null;

    return (
        <ErrorBoundary
            fallbackRender={() => (
                <div className="bg-red-50 px-4 py-3 rounded-xl border border-red-100 text-red-600 text-[10px] mt-4 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Error loading chart
                </div>
            )}
        >
            <motion.div
                className="relative w-full h-[220px] my-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                <Chart
                    type={config.type}
                    data={config.data}
                    options={{
                        ...config.options,
                        maintainAspectRatio: false,
                        responsive: true,
                    }}
                />
            </motion.div>
        </ErrorBoundary>
    );
};

const SUGGESTED_PROMPTS = [
    'Create a database for invoices',
    'Generate a database for customers',
    'Show a bar chart of my data',
    'Design a schema for sales orders',
];

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
    isOpen,
    onClose,
    activeTable,
    context,
    onApplyActions
}) => {
    const db = usePGlite() as any;

    // Fetch column metadata for context
    const columnQuery = useLiveQuery<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = $1 AND LEFT(column_name, 1) != '_'
         ORDER BY ordinal_position`,
        [activeTable || '']
    );

    const columns = columnQuery?.rows.map(r => ({
        id: r.column_name,
        name: r.column_name.replace(/_/g, ' '),
        type: r.data_type
    })) || [];

    // Fetch rows (up to 50) as context for the AI
    const rowsQuery = useLiveQuery<any>(
        activeTable
            ? `SELECT * FROM "${activeTable}" ORDER BY _id DESC LIMIT 50`
            : `SELECT 1 AS _noop WHERE FALSE`
    );
    const rowsForContext = rowsQuery?.rows || [];

    // Fetch the list of all available tables with their full schema for cross-table AI analysis
    const tablesQuery = useLiveQuery<{ name: string; display_name: string; schema: any[] }>(
        `SELECT 
            t.name, 
            t.display_name,
            (
                SELECT json_agg(json_build_object('id', column_name, 'type', data_type))
                FROM information_schema.columns 
                WHERE table_name = t.name AND LEFT(column_name, 1) != '_'
            ) as schema
         FROM quaere_tables t
         ORDER BY t.created_at DESC`
    );
    const availableTables = tablesQuery?.rows || [];

    // Fetch total row count for preview indicator
    const countQuery = useLiveQuery<{ count: number }>(
        activeTable
            ? `SELECT COUNT(*)::int as count FROM "${activeTable}"`
            : `SELECT 0 AS count WHERE FALSE`
    );
    const totalRowsCount = countQuery?.rows[0]?.count || 0;

    const { user } = useUser();
    const userId = user?.id || 'anonymous';

    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I am your Data Assistant. I can create databases, answer questions, run queries and modify your data. What do you need?" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Execute SELECT queries from SQL_EXEC directly in the browser against PGlite
    const runSelectInBrowser = useCallback(async (sql: string): Promise<{ columns: string[]; rows: any[][]; rawRows: any[]; error?: string } | null> => {
        const trimmed = sql.trim().toUpperCase();
        const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');
        if (!isSelect) return null; // Not a SELECT/query action
        if (!db) return null;
        try {
            const result = await db.query(sql);
            if (!result?.rows) return { columns: [], rows: [], rawRows: [], error: 'No response from database' };
            if (result.rows.length === 0) return { columns: result?.fields?.map((f: any) => f.name) || [], rows: [], rawRows: [] };
            const cols = Object.keys(result.rows[0]).filter(k => k !== '_id');
            const rows = result.rows.map((r: any) => cols.map(c => r[c]));
            return { columns: cols, rows, rawRows: result.rows };
        } catch (e: any) {
            console.warn('[ChatAssistant] SELECT error:', e);
            return { columns: [], rows: [], rawRows: [], error: e.message || String(e) };
        }
    }, [db]);

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;

        const userMsg: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    active_table: activeTable,
                    available_tables: availableTables, // List of {name, display_name}
                    database_schema: columns,           // Columns of the active table
                    database_rows: rowsForContext,     // Rows of the active table
                    context: context,
                    userId: userId
                })
            });

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            // Auto-inject a system tip if data is truncated
            if (activeTable && totalRowsCount > 100 && data.answer.toLowerCase().includes(' rows')) {
                data.answer += `\n\n> [!NOTE]\n> Note: The table view shows the first 100 rows, but I have access to all ${totalRowsCount.toLocaleString()} rows in the database for my analysis.`;
            }

            // Run any SELECT SQLs in the browser first, before showing the message
            let queryResult: { columns: string[]; rows: any[][] } | undefined;
            const mutatingActions: any[] = [];

            if (data.actions?.length) {
                for (const action of data.actions) {
                    if (action.type === 'SQL_EXEC' && action.payload?.sql) {
                        const result = await runSelectInBrowser(action.payload.sql);
                        if (result) {
                            if (result.error) {
                                // If SELECT failed, keep the error in queryResult but don't treat as mutating
                                queryResult = result;
                            } else {
                                queryResult = result; // Success SELECT
                            }
                        } else {
                            // Truly mutating (INSERT, UPDATE, DELETE, CREATE)
                            mutatingActions.push(action);
                        }
                    } else {
                        mutatingActions.push(action);
                    }
                }
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.answer,
                actions: data.actions,
                queryResult: { ...queryResult, rawRows: (queryResult as any)?.rawRows }
            }]);

            // Apply only the mutating (non-SELECT) actions
            if (mutatingActions.length > 0 && onApplyActions) {
                await onApplyActions(mutatingActions);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Could not connect to the backend. Is the Python server running?"
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const hasOnlyInitialMessage = messages.length === 1;

    return (
        <section className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                        <IconSparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">Data Assistant</h3>
                        {context ? (
                            <p className="text-[10px] text-gray-500 truncate max-w-[180px]">
                                {context.colName ? `Focus: ${context.colName}` : `Focus: row ${context.rowIdValue}`}
                            </p>
                        ) : (
                            <p className="text-[10px] text-gray-400">
                                {activeTable ? `📊 ${activeTable} · ${rowsForContext.length} rows` : 'Operations base'}
                                {activeTable && totalRowsCount > 100 && (
                                    <span className="ml-1 text-amber-500 font-medium">
                                        (Preview Mode active)
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] p-3 rounded-2xl shadow-sm
              ${msg.role === 'user'
                                ? 'bg-primary text-white rounded-br-none text-xs'
                                : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'}`}
                        >
                            {msg.role === 'assistant' ? (
                                <>
                                    <MessageContent content={msg.content} />
                                    {/* Inline SELECT result table or error */}
                                    {msg.queryResult && (
                                        msg.queryResult.error ? (
                                            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-[10px] text-red-600 font-mono">
                                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span className="truncate">{msg.queryResult.error}</span>
                                            </div>
                                        ) : (
                                            <QueryResultTable columns={msg.queryResult.columns} rows={msg.queryResult.rows} />
                                        )
                                    )}
                                    {/* Collapsible SQL cards for mutating actions */}
                                    {msg.actions?.map((action, actionIdx) => {
                                        if (action.type === 'SQL_EXEC' && action.payload?.sql) {
                                            return <ExecutedSqlCard key={actionIdx} sql={action.payload.sql} />;
                                        }
                                        if (action.type === 'RENDER_CHART' && action.payload?.chartConfigJson) {
                                            try {
                                                const config = JSON.parse(action.payload.chartConfigJson);
                                                return (
                                                    <GeneratedChart
                                                        key={actionIdx}
                                                        config={config}
                                                    />
                                                );
                                            } catch (e) {
                                                console.error("Failed to parse chartConfigJson:", e);
                                                return (
                                                    <div key={actionIdx} className="bg-red-50 px-4 py-3 rounded-xl border border-red-100 text-red-600 text-[10px] mt-4 flex items-center gap-2">
                                                        Failed to parse chart configuration.
                                                    </div>
                                                );
                                            }
                                        }
                                        if (action.type === 'SYNC_GMAIL' && action.payload?.gmailQuery) {
                                            return (
                                                <GmailSyncCard
                                                    key={actionIdx}
                                                    query={action.payload.gmailQuery}
                                                    limit={action.payload.gmailSyncLimit}
                                                    userId={userId}
                                                    schema={columns}
                                                    onApplyActions={onApplyActions}
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                </>
                            ) : (
                                <span className="text-xs">{msg.content}</span>
                            )}
                        </div>
                    </div>
                ))}

                {/* Suggested prompts on initial state */}
                {hasOnlyInitialMessage && (
                    <div className="space-y-2 pt-2">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Suggestions</p>
                        {SUGGESTED_PROMPTS.map((prompt, i) => (
                            <button
                                key={i}
                                onClick={() => sendMessage(prompt)}
                                className="w-full text-left text-xs px-3 py-2 rounded-lg border border-dashed border-gray-200 text-gray-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                )}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-none border border-gray-200">
                            <IconLoader className="w-4 h-4 animate-spin text-gray-400" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
                <div className="relative">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(inputValue);
                            }
                        }}
                        placeholder="Type a command... e.g.: 'show the 5 most recent invoices'"
                        rows={2}
                        className="w-full px-4 py-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all resize-none"
                    />
                    <button
                        onClick={() => sendMessage(inputValue)}
                        disabled={!inputValue.trim()}
                        className="absolute right-3 bottom-3 p-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <p className="text-[9px] text-gray-400 text-center mt-2">
                    AI can make mistakes. Verify important information.
                </p>
            </div>
        </section>
    );
};
