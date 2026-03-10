import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Node,
    Edge,
    Handle,
    Position,
    NodeProps,
    applyNodeChanges,
    applyEdgeChanges,
    OnNodesChange,
    OnEdgesChange,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { usePGlite, useLiveQuery } from '../lib/pgliteHooks';
import { IconDatabase, IconTable, IconKey, IconHash, IconTextSize, IconCalendar, IconChartBar, IconBox, IconSparkles } from './icons';

interface ColumnInfo {
    column_name: string;
    data_type: string;
    is_primary?: boolean;
}

interface TableMeta {
    name: string;
    display_name: string;
}

// ── Custom Table Node ───────────────────────────────────────────────────────
const TableNode = ({ data }: NodeProps) => {
    const { name, displayName, columns, isActive, onSelect } = data;

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('int') || t.includes('numeric') || t.includes('float')) return <IconHash className="w-3 h-3 text-blue-400" />;
        if (t.includes('date') || t.includes('time') || t.includes('timestamp')) return <IconCalendar className="w-3 h-3 text-orange-400" />;
        return <IconTextSize className="w-3 h-3 text-slate-400" />;
    };

    return (
        <div
            onClick={() => onSelect(name)}
            className={`min-w-[200px] bg-white rounded-xl shadow-xl border-2 transition-all overflow-hidden ${isActive ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
            {/* Header */}
            <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${isActive ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                <IconTable className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span className={`text-xs font-bold truncate ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {displayName || name}
                </span>
            </div>

            {/* Columns */}
            <div className="py-2 bg-white">
                {columns.map((col: ColumnInfo) => (
                    <div key={col.column_name} className="px-4 py-1.5 flex items-center justify-between gap-4 group relative">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`target-${col.column_name}`}
                            style={{ opacity: 0, left: 10 }}
                        />
                        <div className="flex items-center gap-2 overflow-hidden">
                            {getIcon(col.data_type)}
                            <span className="text-[11px] font-medium text-slate-600 truncate">{col.column_name}</span>
                        </div>
                        <span className="text-[9px] text-slate-300 uppercase font-bold shrink-0">{col.data_type}</span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`source-${col.column_name}`}
                            style={{ opacity: 0, right: 10 }}
                        />
                    </div>
                ))}
            </div>

            {/* Footer / ID hook */}
            <div className="px-4 py-1.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-medium tracking-tight">PostgreSQL Table</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>}
            </div>
        </div>
    );
};

const nodeTypes = {
    table: TableNode,
};

// ── Main Component ──────────────────────────────────────────────────────────
export const DatabaseSchemaView: React.FC<{
    activeTable: string | null;
    setActiveTable: (name: string | null) => void;
    tables: TableMeta[];
}> = ({ activeTable, setActiveTable, tables }) => {
    const db = usePGlite() as any;
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );

    // ── Load full schema (columns for all tables)
    useEffect(() => {
        if (!db || tables.length === 0) return;

        (async () => {
            try {
                // 1. Fetch all columns for all tables in one go or sequentially
                const tableData: Record<string, ColumnInfo[]> = {};
                for (const t of tables) {
                    const res = await db.query(
                        `SELECT column_name, data_type 
                         FROM information_schema.columns 
                         WHERE table_name = $1 AND column_name NOT IN ('id', '_id', 'created_at', 'updated_at')
                         ORDER BY ordinal_position`,
                        [t.name]
                    );
                    tableData[t.name] = res.rows;
                }

                // 2. Build Nodes
                const newNodes: Node[] = tables.map((t, i) => ({
                    id: t.name,
                    type: 'table',
                    position: { x: (i % 3) * 300, y: Math.floor(i / 3) * 350 },
                    data: {
                        name: t.name,
                        displayName: t.display_name,
                        columns: tableData[t.name] || [],
                        isActive: activeTable === t.name,
                        onSelect: setActiveTable
                    },
                }));

                // 3. Detect edges based on shared column names (simple relational heuristic)
                const newEdges: Edge[] = [];
                const tableNames = Object.keys(tableData);
                for (let i = 0; i < tableNames.length; i++) {
                    for (let j = i + 1; j < tableNames.length; j++) {
                        const t1 = tableNames[i];
                        const t2 = tableNames[j];
                        const cols1 = tableData[t1];
                        const cols2 = tableData[t2];

                        const shared = cols1.find(c => cols2.some(c2 => c2.column_name === c.column_name));
                        if (shared) {
                            newEdges.push({
                                id: `edge-${t1}-${t2}-${shared.column_name}`,
                                source: t1,
                                target: t2,
                                sourceHandle: `source-${shared.column_name}`,
                                targetHandle: `target-${shared.column_name}`,
                                label: shared.column_name,
                                labelStyle: { fontSize: 9, fontWeight: 700, fill: '#6366f1' },
                                labelBgStyle: { fill: '#eef2ff', fillOpacity: 0.8, rx: 4 } as any,
                                style: { stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5,5' },
                                markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
                            });
                        }
                    }
                }

                setNodes(newNodes);
                setEdges(newEdges);
            } catch (err) {
                console.error('[Schema] Error building nodes:', err);
            }
        })();
    }, [db, tables, activeTable, setActiveTable]);

    return (
        <div className="h-full w-full bg-slate-50 relative flex flex-col">
            {/* Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <div className="bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-3">
                    <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                        <IconBox className="w-4 h-4 text-indigo-500" />
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Schema Designer</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-[10px] text-slate-500 font-medium">{tables.length} Tables</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-indigo-300"></div>
                            <span className="text-[10px] text-slate-500 font-medium">{edges.length} Relations</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    minZoom={0.2}
                    maxZoom={1.5}
                >
                    <Background color="#cbd5e1" gap={20} />
                    <Controls />
                </ReactFlow>
            </div>

            {/* Tip Overlay */}
            <div className="absolute bottom-4 right-4 z-10 bg-indigo-600 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 border border-indigo-400">
                <IconSparkles className="w-4 h-4" />
                <span className="text-xs font-medium">Click a table to make it active</span>
            </div>
        </div>
    );
};
