
export type ColumnType = 'string' | 'number' | 'date' | 'json' | 'boolean';

export interface DatabaseColumn {
  id: string;
  name: string;
  type: ColumnType;
  formula?: string; // e.g., "{col1} * {col2}" or "{col3} * 1.21"
}

export interface DatabaseRow {
  _id: number;
  [columnId: string]: any;
}

export interface TableMeta {
  name: string;
  display_name: string;
  created_at: string;
}

export interface DatabaseInfo {
  id: string;
  name: string;
}
