
import { PGlite } from '@electric-sql/pglite';
import { generateEmbedding } from './embeddings';

// ---- Message types -------------------------------------------------------

export type BridgeMessageType =
    | 'SQL_QUERY' | 'SQL_EXEC' | 'PING'
    | 'REMEMBER' | 'SEARCH' | 'RECALL' | 'FORGET';

export interface BridgeMessage {
    type: BridgeMessageType;
    id: string;

    // Raw SQL (SQL_QUERY / SQL_EXEC)
    sql?: string;
    params?: any[];

    // REMEMBER
    content?: string;          // text to remember
    source?: string;           // e.g. 'openclaw', 'extension', 'user'
    tags?: string[];
    memory_type?: 'episodic' | 'semantic' | 'procedural';
    subject?: string;          // semantic triple
    predicate?: string;
    object?: string;
    confidence?: number;
    steps?: any;               // procedural steps (JSON)
    description?: string;      // procedural description
    name?: string;             // procedural name
    embedding?: number[];      // optional — if provided, enables semantic search

    // SEARCH / RECALL
    query_embedding?: number[];
    query_text?: string;
    limit?: number;

    // FORGET
    memory_id?: number;
}

export interface BridgeResponse {
    type: 'SQL_RESULT' | 'PONG' | 'ERROR';
    requestId: string;
    data?: any;
    error?: string;
}

// --------------------------------------------------------------------------

export const createAgentBridge = (db: PGlite, options: { isPro: boolean, getClerkToken?: () => Promise<string | null> } = { isPro: false }) => {
    const channel = new BroadcastChannel('quaere_agent_bridge');

    channel.onmessage = async (event: MessageEvent<BridgeMessage>) => {
        const msg = event.data;
        const { type, id } = msg;

        // Auto-generate embedding if missing and user is PRO
        let effectiveEmbedding = msg.embedding;
        if (!effectiveEmbedding && options.isPro) {
            if (msg.type === 'REMEMBER') {
                const textToEmbed =
                    msg.memory_type === 'semantic' ? `${msg.subject} ${msg.predicate} ${msg.object}` :
                        msg.memory_type === 'procedural' ? `${msg.name} ${msg.description}` :
                            msg.content;

                if (textToEmbed) {
                    console.log('[Bridge] Auto-generating embedding for Pro user...');
                    const token = options.getClerkToken ? await options.getClerkToken() : undefined;
                    const generated = await generateEmbedding(textToEmbed, token || undefined);
                    if (generated) effectiveEmbedding = generated;
                }
            }
        }

        console.log('[Bridge] →', type, id);

        try {
            switch (type) {

                // ── Ping ──────────────────────────────────────────────────────────
                case 'PING':
                    channel.postMessage({ type: 'PONG', requestId: id });
                    break;

                // ── Raw SQL (legacy / power-user) ─────────────────────────────────
                case 'SQL_QUERY': {
                    if (!msg.sql) throw new Error('No SQL provided');
                    const result = await db.query(msg.sql, msg.params);
                    channel.postMessage({ type: 'SQL_RESULT', requestId: id, data: result });
                    break;
                }

                case 'SQL_EXEC': {
                    if (!msg.sql) throw new Error('No SQL provided');
                    await db.exec(msg.sql);
                    channel.postMessage({ type: 'SQL_RESULT', requestId: id, data: { success: true } });
                    break;
                }

                // ── REMEMBER — store a memory ──────────────────────────────────────
                case 'REMEMBER': {
                    const memType = msg.memory_type || 'episodic';

                    if (memType === 'episodic') {
                        if (!msg.content) throw new Error('content is required for episodic memory');
                        const embStr = effectiveEmbedding ? JSON.stringify(effectiveEmbedding) : null;
                        const res = await db.query(
                            `INSERT INTO brain_episodic (content, source, tags, embedding)
               VALUES ($1, $2, $3, $4::vector) RETURNING id`,
                            [msg.content, msg.source || null, msg.tags || null, embStr]
                        );
                        channel.postMessage({ type: 'SQL_RESULT', requestId: id, data: res });

                    } else if (memType === 'semantic') {
                        if (!msg.subject || !msg.predicate || !msg.object)
                            throw new Error('subject, predicate, object required for semantic memory');
                        const embStr = effectiveEmbedding ? JSON.stringify(effectiveEmbedding) : null;
                        const res = await db.query(
                            `INSERT INTO brain_semantic (subject, predicate, object, confidence, embedding)
               VALUES ($1, $2, $3, $4, $5::vector)
               ON CONFLICT DO NOTHING RETURNING id`,
                            [msg.subject, msg.predicate, msg.object, msg.confidence ?? 1.0, embStr]
                        );
                        channel.postMessage({ type: 'SQL_RESULT', requestId: id, data: res });

                    } else if (memType === 'procedural') {
                        if (!msg.name) throw new Error('name is required for procedural memory');
                        const embStr = effectiveEmbedding ? JSON.stringify(effectiveEmbedding) : null;
                        const res = await db.query(
                            `INSERT INTO brain_procedural (name, description, steps, embedding)
               VALUES ($1, $2, $3, $4::vector)
               ON CONFLICT (name) DO UPDATE
                 SET description = EXCLUDED.description,
                     steps = EXCLUDED.steps,
                     embedding = EXCLUDED.embedding,
                     updated_at = now()
               RETURNING id`,
                            [msg.name, msg.description || null, msg.steps ? JSON.stringify(msg.steps) : null, embStr]
                        );
                        channel.postMessage({ type: 'SQL_RESULT', requestId: id, data: res });
                    }
                    break;
                }

                // ── SEARCH — vector similarity search (requires embedding) ─────────
                case 'SEARCH': {
                    if (!msg.query_embedding) throw new Error('query_embedding is required for SEARCH');
                    const limit = msg.limit ?? 5;
                    const embStr = JSON.stringify(msg.query_embedding);
                    const res = await db.query(
                        `SELECT id, content, source, tags,
                    1 - (embedding <=> $1::vector) AS similarity,
                    created_at
             FROM brain_episodic
             WHERE embedding IS NOT NULL
             ORDER BY embedding <=> $1::vector
             LIMIT $2`,
                        [embStr, limit]
                    );
                    channel.postMessage({ type: 'SQL_RESULT', requestId: id, data: res });
                    break;
                }

                // ── RECALL — full-text search (no embedding needed) ───────────────
                case 'RECALL': {
                    if (!msg.query_text) throw new Error('query_text is required for RECALL');
                    const limit = msg.limit ?? 10;
                    const res = await db.query(
                        `SELECT id, content, source, tags, created_at
             FROM brain_episodic
             WHERE content ILIKE '%' || $1 || '%'
             ORDER BY created_at DESC
             LIMIT $2`,
                        [msg.query_text, limit]
                    );
                    channel.postMessage({ type: 'SQL_RESULT', requestId: id, data: res });
                    break;
                }

                // ── FORGET — delete a memory by id ────────────────────────────────
                case 'FORGET': {
                    if (!msg.memory_id) throw new Error('memory_id is required for FORGET');
                    const memType = msg.memory_type || 'episodic';
                    const table =
                        memType === 'semantic' ? 'brain_semantic' :
                            memType === 'procedural' ? 'brain_procedural' :
                                'brain_episodic';
                    await db.query(`DELETE FROM ${table} WHERE id = $1`, [msg.memory_id]);
                    channel.postMessage({ type: 'SQL_RESULT', requestId: id, data: { success: true } });
                    break;
                }

                default:
                    console.warn('[Bridge] Unknown message type:', type);
            }
        } catch (err: any) {
            console.error('[Bridge] Error:', err);
            channel.postMessage({ type: 'ERROR', requestId: id, error: err.message });
        }
    };

    return () => channel.close();
};
