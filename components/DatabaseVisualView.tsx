import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePGlite, useLiveQuery } from '../lib/pgliteHooks';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label
} from 'recharts';
import { IconChartBar, IconChartLine, IconChartPie, IconChartArea, IconLoader, IconChevronDown, IconRefresh, IconSparkles, IconBox } from './icons';

interface ColumnInfo { column_name: string; data_type: string; }
interface TableMeta { name: string; display_name: string; }

interface DatabaseVisualViewProps {
    activeTable: string | null;
    setActiveTable: (name: string | null) => void;
    tables: TableMeta[];
    onToggleFlow?: () => void;
}

const CHART_TYPES = [
    { id: 'bar', label: 'Bar', icon: IconChartBar },
    { id: 'line', label: 'Line', icon: IconChartLine },
    { id: 'area', label: 'Area', icon: IconChartArea },
    { id: 'pie', label: 'Pie', icon: IconChartPie },
] as const;

const AGGREGATIONS = [
    { id: 'count', label: 'Count' },
    { id: 'sum', label: 'Sum' },
    { id: 'avg', label: 'Avg' },
    { id: 'min', label: 'Min' },
    { id: 'max', label: 'Max' },
] as const;

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

// ── Mini ERD Component ──────────────────────────────────────────────────────
const MiniERD: React.FC<{ tables: TableMeta[]; relations: { from: string; to: string; key: string }[] }> = ({ tables, relations }) => {
    if (tables.length === 0) return null;
    const W = 130, H = 44, GAP_X = 220, GAP_Y = 70;
    const cols = Math.ceil(Math.sqrt(tables.length));
    const svgW = Math.max(cols * GAP_X + 20, 400);
    const svgH = Math.ceil(tables.length / cols) * GAP_Y + 60;
    const pos: Record<string, { x: number; y: number }> = {};
    tables.forEach((t, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        pos[t.name] = { x: col * GAP_X + 20, y: row * GAP_Y + 20 };
    });
    return (
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minHeight: svgH }}>
            {/* Relation edges */}
            {relations.map((r, i) => {
                const from = pos[r.from]; const to = pos[r.to];
                if (!from || !to) return null;
                const fx = from.x + W, fy = from.y + H / 2;
                const tx = to.x, ty = to.y + H / 2;
                const mx = (fx + tx) / 2;
                return (
                    <g key={i}>
                        <path d={`M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}`}
                            fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
                        <text x={mx} y={Math.min(fy, ty) - 4} textAnchor="middle" fontSize="8" fill="#6366f1" opacity="0.8">{r.key}</text>
                        {/* Arrowhead */}
                        <polygon points={`${tx},${ty} ${tx - 7},${ty - 4} ${tx - 7},${ty + 4}`} fill="#6366f1" opacity="0.6" />
                    </g>
                );
            })}
            {/* Table nodes */}
            {tables.map((t, i) => {
                const p = pos[t.name];
                return (
                    <g key={t.name} transform={`translate(${p.x},${p.y})`}>
                        <rect x="0" y="0" width={W} height={H} rx="8" fill="white"
                            stroke={relations.some(r => r.from === t.name || r.to === t.name) ? '#6366f1' : '#e2e8f0'}
                            strokeWidth="1.5" />
                        <rect x="0" y="0" width={W} height="14" rx="8" fill={COLORS[i % COLORS.length]} opacity="0.15" />
                        <rect x="0" y="8" width={W} height="6" fill={COLORS[i % COLORS.length]} opacity="0.15" />
                        <text x={W / 2} y="10" textAnchor="middle" fontSize="9" fontWeight="700" fill={COLORS[i % COLORS.length]}>
                            {t.display_name || t.name}
                        </text>
                        <text x={W / 2} y="30" textAnchor="middle" fontSize="8" fill="#94a3b8">
                            table
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// ── Main Component ──────────────────────────────────────────────────────────
export const DatabaseVisualView: React.FC<DatabaseVisualViewProps> = ({ activeTable, setActiveTable, tables, onToggleFlow }) => {
    const db = usePGlite() as any;

    // ── Configuration
    const [chartType, setChartType] = useState<typeof CHART_TYPES[number]['id']>('bar');
    const [xAxis, setXAxis] = useState('');
    const [yAxis, setYAxis] = useState('');
    const [aggregation, setAggregation] = useState<typeof AGGREGATIONS[number]['id']>('count');
    const [joinTable, setJoinTable] = useState<string>('');
    const [joinKey, setJoinKey] = useState<string>('');
    const [showERD, setShowERD] = useState(false);
    const [aisuggestLoading, setAiSuggestLoading] = useState(false);

    // ── Data
    const [chartData, setChartData] = useState<any[]>([]);
    const [summary, setSummary] = useState({ total: 0, distinct: 0, aggValue: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detectedRelations, setDetectedRelations] = useState<{ from: string; to: string; key: string }[]>([]);

    // ── Live column queries
    const col1Result = useLiveQuery<ColumnInfo>(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_name = $1 AND column_name NOT IN ('id','_id','created_at','updated_at')
         ORDER BY ordinal_position`,
        [activeTable || '']
    );
    const columns1 = useMemo(() => col1Result?.rows || [], [col1Result]);

    const col2Result = useLiveQuery<ColumnInfo>(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_name = $1 AND column_name NOT IN ('id','_id','created_at','updated_at')
         ORDER BY ordinal_position`,
        [joinTable || '']
    );
    const columns2 = useMemo(() => col2Result?.rows || [], [col2Result]);

    // Combined columns for axis selectors
    const allCols = useMemo(() => {
        const c1 = columns1.map(c => ({ ...c, tbl: activeTable || '' }));
        const c2 = joinTable ? columns2.map(c => ({ ...c, tbl: joinTable })) : [];
        return [...c1, ...c2];
    }, [columns1, columns2, activeTable, joinTable]);

    const numericCols = useMemo(() => allCols.filter(c =>
        ['numeric', 'integer', 'bigint', 'double precision', 'real', 'money'].includes(c.data_type.toLowerCase())
    ), [allCols]);

    // ── Auto-detect JOIN key when a second table is selected
    useEffect(() => {
        if (!joinTable || columns1.length === 0 || columns2.length === 0) { setJoinKey(''); return; }
        const ids1 = new Set(columns1.map(c => c.column_name));
        const shared = columns2.find(c => ids1.has(c.column_name));
        if (shared) setJoinKey(shared.column_name);
    }, [joinTable, columns1, columns2]);

    // ── Auto-detect all relations between all tables (for ERD)
    useEffect(() => {
        if (!db || tables.length < 2) return;
        (async () => {
            try {
                const res = await db.query(
                    `SELECT t1.table_name as t1, t2.table_name as t2, c1.column_name as key
                     FROM information_schema.tables t1
                     JOIN information_schema.columns c1 ON c1.table_name = t1.table_name
                     JOIN information_schema.columns c2 ON c2.column_name = c1.column_name AND c2.table_name != t1.table_name
                     JOIN information_schema.tables t2 ON t2.table_name = c2.table_name
                     WHERE t1.table_schema = 'public' AND t2.table_schema = 'public'
                       AND c1.column_name NOT IN ('id', '_id', 'created_at', 'updated_at')
                       AND t1.table_name NOT LIKE 'quaere_%'
                       AND t2.table_name NOT LIKE 'quaere_%'
                       AND t1.table_name < t2.table_name
                     LIMIT 30`
                );
                setDetectedRelations(res.rows.map((r: any) => ({ from: r.t1, to: r.t2, key: r.key })));
            } catch { /* ignore */ }
        })();
    }, [tables, db]);

    // ── Reset on table change
    useEffect(() => {
        if (columns1.length > 0) {
            setXAxis(columns1[0].column_name);
            const firstNum = numericCols.find(c => c.tbl === activeTable);
            setYAxis(firstNum?.column_name || '');
            setAggregation(firstNum ? 'sum' : 'count');
        }
    }, [activeTable, columns1]);

    // ── Build and run the SQL query
    const fetchData = useCallback(async () => {
        if (!db || !activeTable || !xAxis) return;
        setLoading(true); setError(null);
        try {
            const isJoin = !!(joinTable && joinKey);
            const fromClause = isJoin
                ? `"${activeTable}" t1 JOIN "${joinTable}" t2 ON t1."${joinKey}" = t2."${joinKey}"`
                : `"${activeTable}"`;

            // Qualify xAxis column with table alias if needed
            const xCol = isJoin
                ? (columns1.some(c => c.column_name === xAxis) ? `t1."${xAxis}"` : `t2."${xAxis}"`)
                : `"${xAxis}"`;

            let valueExpr = 'COUNT(*)';
            if (aggregation !== 'count' && yAxis) {
                const yInT1 = columns1.some(c => c.column_name === yAxis);
                const yCol = isJoin ? (yInT1 ? `t1."${yAxis}"` : `t2."${yAxis}"`) : `"${yAxis}"`;
                valueExpr = `${aggregation.toUpperCase()}(${yCol})`;
            }

            const query = `
                SELECT ${xCol} as name, ${valueExpr} as value
                FROM ${fromClause}
                GROUP BY ${xCol}
                ORDER BY value DESC
                LIMIT 30
            `;
            const result = await db.query(query);
            setChartData(result.rows);

            // Summary
            const totalRes = await db.query(
                isJoin
                    ? `SELECT COUNT(*) as total, COUNT(DISTINCT ${xCol}) as distinct FROM ${fromClause}`
                    : `SELECT COUNT(*) as total, COUNT(DISTINCT "${xAxis}") as distinct FROM "${activeTable}"`
            );
            const aggRes = aggregation !== 'count' && yAxis
                ? await db.query(`SELECT ${valueExpr} as agg FROM ${fromClause}`)
                : null;
            setSummary({
                total: parseInt(totalRes.rows[0]?.total || '0'),
                distinct: parseInt(totalRes.rows[0]?.distinct || '0'),
                aggValue: parseFloat(aggRes?.rows[0]?.agg || '0'),
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [db, activeTable, joinTable, joinKey, xAxis, yAxis, aggregation, columns1]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const otherTables = tables.filter(t => t.name !== activeTable);

    // ── Select: qualifies column labels with table name when joining
    const axisLabel = (col: typeof allCols[0]) =>
        joinTable ? `${col.tbl === activeTable ? '→' : '⤷'} ${col.column_name}` : col.column_name;

    // ── Render ──────────────────────────────────────────────────────────────
    if (!activeTable) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                    <IconChartBar className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-sm font-bold text-slate-600">No active table</p>
                <p className="text-xs">Select or create a table to begin</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <IconChartBar className="w-4 h-4 text-white" />
                    </div>
                    Analytics Dashboard
                </h1>

                {onToggleFlow && (
                    <button
                        onClick={onToggleFlow}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors border border-slate-200"
                    >
                        <IconBox className="w-3.5 h-3.5 text-indigo-500" />
                        <span>BACK TO SCHEMA</span>
                    </button>
                )}
            </div>

            {/* ── Config Bar ─────────────────────────────────────────────── */}
            <div className="flex border-b border-slate-100 px-4 py-3 gap-3 flex-wrap items-end bg-slate-50/60 shrink-0">

                {/* Chart Type */}
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Chart</label>
                    <div className="flex bg-white border border-slate-200 p-0.5 rounded-lg shadow-sm">
                        {CHART_TYPES.map(t => {
                            const Icon = t.icon;
                            return (
                                <button key={t.id} onClick={() => setChartType(t.id)} title={t.label}
                                    className={`p-1.5 rounded-md transition-all ${chartType === t.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Join Table */}
                {otherTables.length > 0 && (
                    <div className="space-y-1 min-w-[130px]">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">+ Join Table</label>
                        <div className="relative">
                            <select value={joinTable} onChange={e => { setJoinTable(e.target.value); setJoinKey(''); }}
                                className="w-full h-8 pl-2 pr-7 text-xs bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                                <option value="">— none —</option>
                                {otherTables.map(t => <option key={t.name} value={t.name}>{t.display_name || t.name}</option>)}
                            </select>
                            <IconChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* Join Key */}
                {joinTable && (
                    <div className="space-y-1 min-w-[110px]">
                        <label className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Join on</label>
                        <div className="relative">
                            <select value={joinKey} onChange={e => setJoinKey(e.target.value)}
                                className="w-full h-8 pl-2 pr-7 text-xs bg-indigo-50 border border-indigo-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-semibold text-indigo-700">
                                <option value="">select…</option>
                                {columns1.filter(c => columns2.some(c2 => c2.column_name === c.column_name)).map(c =>
                                    <option key={c.column_name} value={c.column_name}>{c.column_name}</option>
                                )}
                            </select>
                            <IconChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-400 pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* X Axis */}
                <div className="space-y-1 min-w-[130px]">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Group by (X)</label>
                    <div className="relative">
                        <select value={xAxis} onChange={e => setXAxis(e.target.value)}
                            className="w-full h-8 pl-2 pr-7 text-xs bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                            {allCols.map(c => <option key={`${c.tbl}.${c.column_name}`} value={c.column_name}>{axisLabel(c)}</option>)}
                        </select>
                        <IconChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Aggregation */}
                <div className="space-y-1 min-w-[90px]">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Method</label>
                    <div className="relative">
                        <select value={aggregation} onChange={e => setAggregation(e.target.value as any)}
                            className="w-full h-8 pl-2 pr-7 text-xs bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                            {AGGREGATIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                        <IconChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Y Axis */}
                {aggregation !== 'count' && (
                    <div className="space-y-1 min-w-[130px]">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Value (Y)</label>
                        <div className="relative">
                            <select value={yAxis} onChange={e => setYAxis(e.target.value)}
                                className="w-full h-8 pl-2 pr-7 text-xs bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                                <option value="">select…</option>
                                {numericCols.map(c => <option key={`${c.tbl}.${c.column_name}`} value={c.column_name}>{axisLabel(c)}</option>)}
                            </select>
                            <IconChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 ml-auto items-end pb-0.5">
                    {/* ERD toggle */}
                    {tables.length > 1 && (
                        <button onClick={() => setShowERD(v => !v)}
                            className={`h-8 px-3 text-xs rounded-lg border transition-all shadow-sm font-medium ${showERD ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}>
                            Schema
                        </button>
                    )}
                    <button onClick={fetchData} title="Refresh"
                        className="h-8 w-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm">
                        <IconRefresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Mini ERD Panel ─────────────────────────────────────────── */}
            {showERD && (
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Schema Relationships — {tables.length} tables
                        {detectedRelations.length > 0 && <span className="ml-2 text-indigo-500">{detectedRelations.length} link{detectedRelations.length > 1 ? 's' : ''} detected</span>}
                    </p>
                    <div className="overflow-x-auto">
                        <MiniERD tables={tables} relations={detectedRelations} />
                    </div>
                </div>
            )}

            {/* ── Dashboard Content ──────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/30 min-h-0">

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            {joinTable ? 'Joined Rows' : 'Total Rows'}
                        </p>
                        <h4 className="text-2xl font-bold text-slate-800">{summary.total.toLocaleString()}</h4>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unique {xAxis}</p>
                        <h4 className="text-2xl font-bold text-slate-800">{summary.distinct.toLocaleString()}</h4>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-4 rounded-xl border border-indigo-500 shadow-lg text-white">
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">Metric</p>
                        <h4 className="text-xs font-bold truncate leading-relaxed">
                            {aggregation === 'count'
                                ? `Frequency of ${xAxis}`
                                : `${aggregation.toUpperCase()}(${yAxis}) by ${xAxis}`}
                            {joinTable && <span className="block text-white/60 text-[10px] mt-0.5">via {joinTable}.{joinKey}</span>}
                        </h4>
                    </div>
                </div>

                {/* Main Chart */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm" style={{ height: 380 }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800">
                            {aggregation === 'count' ? `${xAxis} — frequency` : `${aggregation}(${yAxis}) by ${xAxis}`}
                            {joinTable && <span className="ml-2 text-xs text-indigo-500 font-normal">({activeTable} ⋈ {joinTable})</span>}
                        </h3>
                        {loading && <IconLoader className="w-4 h-4 animate-spin text-indigo-400" />}
                    </div>
                    <div style={{ height: 300 }}>
                        {error ? (
                            <div className="h-full flex items-center justify-center text-red-500 text-xs text-center border-2 border-dashed border-red-50 rounded-xl p-4">
                                {error}
                            </div>
                        ) : chartData.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-100 rounded-xl">
                                <IconChartBar className="w-8 h-8 opacity-30" />
                                <p className="text-xs">No data — check your configuration</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === 'bar' ? (
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 50 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false}
                                            tick={{ fill: '#64748b' }} angle={-30} textAnchor="end" interval={0}>
                                            <Label value={xAxis} offset={-20} position="insideBottom" fontSize={10} fill="#94a3b8" fontWeight="600" />
                                        </XAxis>
                                        <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }}>
                                            <Label value={aggregation === 'count' ? 'Frequency' : `${aggregation}(${yAxis})`} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fontSize={10} fill="#94a3b8" fontWeight="600" offset={-15} />
                                        </YAxis>
                                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {chartData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                ) : chartType === 'line' ? (
                                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 50 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0}>
                                            <Label value={xAxis} offset={-20} position="insideBottom" fontSize={10} fill="#94a3b8" fontWeight="600" />
                                        </XAxis>
                                        <YAxis fontSize={10} tickLine={false} axisLine={false}>
                                            <Label value={aggregation === 'count' ? 'Frequency' : `${aggregation}(${yAxis})`} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fontSize={10} fill="#94a3b8" fontWeight="600" offset={-15} />
                                        </YAxis>
                                        <Tooltip />
                                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3}
                                            dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                ) : chartType === 'area' ? (
                                    <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 50 }}>
                                        <defs>
                                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0}>
                                            <Label value={xAxis} offset={-20} position="insideBottom" fontSize={10} fill="#94a3b8" fontWeight="600" />
                                        </XAxis>
                                        <YAxis fontSize={10} tickLine={false} axisLine={false}>
                                            <Label value={aggregation === 'count' ? 'Frequency' : `${aggregation}(${yAxis})`} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fontSize={10} fill="#94a3b8" fontWeight="600" offset={-15} />
                                        </YAxis>
                                        <Tooltip />
                                        <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" />
                                    </AreaChart>
                                ) : (
                                    <PieChart>
                                        <Pie data={chartData} innerRadius={55} outerRadius={100} paddingAngle={4} dataKey="value">
                                            {chartData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', paddingTop: '16px' }} />
                                    </PieChart>
                                )}
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
