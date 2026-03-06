import { PGlite } from '@electric-sql/pglite';

export async function getDb(): Promise<PGlite> {
    // This function should ideally not be used if we use the React context
    // but we can make it return the singleton from AppLoader if needed.
    // For now, let's just make it throw to find callers, or return nothing.
    throw new Error("Use usePGlite() hook instead of getDb()");
}

/**
 * Map our simple column types to PostgreSQL DDL types
 */
export function toSqlType(type: string): string {
    switch (type) {
        case 'number': return 'NUMERIC';
        case 'date': return 'DATE';
        case 'boolean': return 'BOOLEAN';
        case 'json': return 'JSONB';
        default: return 'TEXT';
    }
}

/**
 * Map PostgreSQL types back to our simple column types
 */
export function fromSqlType(pgType: string): string {
    const t = pgType.toLowerCase();
    if (t.includes('numeric') || t.includes('int') || t.includes('float') || t.includes('real') || t.includes('double')) return 'number';
    if (t.includes('date') || t.includes('time')) return 'date';
    if (t === 'boolean') return 'boolean';
    if (t.includes('json')) return 'json';
    return 'string';
}

/**
 * Make a safe PostgreSQL identifier from a human name
 */
export function toTableId(name: string): string {
    return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '').substring(0, 63) || 'table_' + Date.now();
}

/**
 * Create a new table from an array of column definitions
 */
export async function createTable(
    db: PGlite,
    tableName: string,
    displayName: string,
    columns: { id: string; name: string; type: string }[]
): Promise<void> {
    const colDefs = columns.map(col =>
        `"${col.id}" ${toSqlType(col.type)}`
    ).join(', ');

    await db.exec(`
        DROP TABLE IF EXISTS "${tableName}";
        CREATE TABLE "${tableName}" (
            _id SERIAL PRIMARY KEY,
            _created_at TIMESTAMPTZ DEFAULT NOW(),
            ${colDefs}
        );
    `);

    await db.query(
        `INSERT INTO quaere_tables (name, display_name) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET display_name = $2`,
        [tableName, displayName]
    );
}

/**
 * List all managed tables
 */
export async function listTables(db: PGlite): Promise<{ name: string; display_name: string }[]> {
    const result = await db.query<{ name: string; display_name: string }>(
        `SELECT name, display_name FROM quaere_tables ORDER BY created_at`
    );
    return result.rows;
}

/**
 * Get column definitions for a table from information_schema
 */
export async function getTableColumns(db: PGlite, tableName: string): Promise<{ column_name: string; data_type: string; udt_name: string }[]> {
    const result = await db.query<{ column_name: string; data_type: string; udt_name: string }>(
        `SELECT column_name, data_type, udt_name
         FROM information_schema.columns
         WHERE table_name = $1 AND LEFT(column_name, 1) != '_'
         ORDER BY ordinal_position`,
        [tableName]
    );
    return result.rows;
}
