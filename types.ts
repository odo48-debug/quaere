
import { Type } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  citations?: string[];
}

export interface ProcessingState {
  isProcessing: boolean;
  status: string;
  progress: number;
}

export interface TextItem {
  str: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PageData {
  pageIndex: number;
  width: number;
  height: number;
  imageDataUrl: string;
  textContent: TextItem[];
}

export interface HighlightRect {
  pageIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  sourceCitation: string; // The original citation string this rect belongs to
}

export interface ContentViewHandle {
  scrollToHighlight: (pageIndex: number) => void;
}

export interface Annotation {
  pageIndex: number;
  x: number; // Relative coordinate (0-1)
  y: number; // Relative coordinate (0-1)
  text: string;
}

export type ColumnType = 'string' | 'number' | 'date' | 'json' | 'boolean';

export interface DatabaseColumn {
  id: string;
  name: string;
  type: ColumnType;
  formula?: string; // e.g., "{col1} * {col2}" or "{col3} * 1.21"
}

export interface DatabaseRow {
  id: string;
  autoNumber: string | number;
  createdAt: string;
  [columnId: string]: string | number;
}

export interface LocalDatabase {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  nextAutoNumber: number;
}
