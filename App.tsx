
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { FileUploader } from './components/FileUploader';
import { DatabaseView, DatabaseViewRef } from './components/DatabaseView';
import { LandingPage } from './components/LandingPage';
import { DocumentationPage } from './components/DocumentationPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { ChatAssistant } from './components/ChatAssistant';
import { AppSidebar } from './components/AppSidebar';
import { DatabaseVisualView } from './components/DatabaseVisualView';
import { DatabaseSchemaView } from './components/DatabaseSchemaView';
import { ExtractModal, ExtractSource, MultiTableTarget } from './components/ExtractModal';
import { IconUpload, IconFileCheck, IconLoader, IconSparkles, IconChevronLeft, IconChevronRight, IconArrowUpRight, IconLayout, IconColumns, IconX, IconPencil, IconCopy, IconPlus, IconChartBar, IconBox } from './components/icons';
import { PricingCard } from './components/PricingCard';
import type { ProcessingState, PageData, HighlightRect, Annotation, LocalDatabase, DatabaseRow } from './types';
import { findHighlightCoordinates, findLabelCoordinates } from './utils/highlighting';
import { useUsageLimit } from './hooks/useUsageLimit';
import { UserButton } from './components/auth/UserButton';
import { usePGlite, useLiveQuery } from './lib/pgliteHooks';
import { createTable, toTableId, toSqlType } from './lib/pglite';

// Set up pdf.js worker
if (typeof window !== 'undefined' && 'pdfjsLib' in window) {
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

// Ensure the API key is available
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.ARRAY,
      description: 'An array of strings, where each string is a paragraph or a markdown-formatted bullet point. This allows for a structured response. When quoting from the document, the quote MUST be wrapped in <cite> tags. For example: "The document states that <cite>this is a quote</cite>."',
      items: {
        type: Type.STRING,
      }
    }
  },
  required: ['answer'],
};

// Helper to evaluate simple math formulas
const evaluateFormula = (formula: string, row: any) => {
  try {
    // Replace {tag} with row[tag] value
    let sanitizedFormula = formula.replace(/\{([^}]+)\}/g, (match, tag) => {
      const val = parseFloat(row[tag] || "0");
      return isNaN(val) ? "0" : val.toString();
    });

    // Strict sanitization: allow only numbers, math operators, parens, and decimal points
    sanitizedFormula = sanitizedFormula.replace(/[^0-9+\-*/().]/g, '');

    if (!sanitizedFormula.trim()) return "0";

    // Evaluate the sanitized expression
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${sanitizedFormula}`)();

    // Round to 2 decimal places for money/invoice usage
    return isFinite(result) ? (Math.round(result * 100) / 100).toString() : "0";
  } catch (e) {
    console.error("Formula Eval Error:", e);
    return "0";
  }
};

// Legacy recalculate functionality will be moved to database layer triggers later.

const fillPdfFieldsFunctionDeclaration: FunctionDeclaration = {
  name: 'fillPdfFields',
  description: 'Fills in specified fields on the PDF document with the provided values. Use this when the user asks to write, fill in, or add text to a form field.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fields: {
        type: Type.ARRAY,
        description: 'An array of fields to fill.',
        items: {
          type: Type.OBJECT,
          properties: {
            fieldName: {
              type: Type.STRING,
              description: 'The name of the field to fill, e.g., "Full Name", "Address", "Date". This should match the label text in the document.',
            },
            fieldValue: {
              type: Type.STRING,
              description: 'The value to write into the field.',
            },
          },
          required: ['fieldName', 'fieldValue'],
        },
      },
    },
    required: ['fields'],
  },
};

const App: React.FC = () => {
  const { isSignedIn, isLoaded } = useUser();
  const { canProcessPages, incrementPageCount, getRemainingPages, limits, isPaidUser, isFreeTrialActive } = useUsageLimit();

  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    status: '',
    progress: 0,
  });
  const [activeTab, setActiveTab] = useState<'database' | 'api' | 'settings' | 'docs'>('database');
  const [workspaceView, setWorkspaceView] = useState<'classic' | 'visual'>('classic');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);


  const [pdfPages, setPdfPages] = useState<PageData[]>([]);
  const [plainText, setPlainText] = useState<string>('');

  const databaseViewRef = useRef<DatabaseViewRef>(null);

  // PGlite database state natively via context hooks
  const db = usePGlite() as any;
  const [activeTable, setActiveTable] = useState<string | null>(() => localStorage.getItem('quaere_active_table'));
  const [visualMode, setVisualMode] = useState<'flow' | 'charts'>('flow');

  // Multi-database management
  const [databases, setDatabases] = useState<{ id: string; name: string }[]>(() => {
    const stored = localStorage.getItem('quaere_database_list');
    return stored ? JSON.parse(stored) : [{ id: 'default', name: 'Main Database' }];
  });
  const activeDbId = localStorage.getItem('quaere_active_db') || 'default';

  const handleCreateDatabase = useCallback((name: string) => {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (!id) return;
    if (databases.find(db => db.id === id)) {
      alert('A database with this identifier already exists.');
      return;
    }
    const newList = [...databases, { id, name }];
    setDatabases(newList);
    localStorage.setItem('quaere_database_list', JSON.stringify(newList));
    handleSwitchDatabase(id);
  }, [databases]);

  const handleSwitchDatabase = useCallback((id: string) => {
    localStorage.setItem('quaere_active_db', id);
    localStorage.removeItem('quaere_active_table'); // Reset active table for new DB
    window.location.reload();
  }, []);

  const handleRenameDatabase = useCallback((id: string, newName: string) => {
    const newList = databases.map(db => db.id === id ? { ...db, name: newName } : db);
    setDatabases(newList);
    localStorage.setItem('quaere_database_list', JSON.stringify(newList));
  }, [databases]);

  const handleDeleteDatabase = useCallback((id: string) => {
    if (databases.length <= 1) {
      alert('You must have at least one database.');
      return;
    }
    const dbName = databases.find(d => d.id === id)?.name || id;
    if (!confirm(`Are you sure you want to delete the database "${dbName}"? All its tables will be permanently deleted.`)) return;

    const newList = databases.filter(db => db.id !== id);
    setDatabases(newList);
    localStorage.setItem('quaere_database_list', JSON.stringify(newList));

    if (activeDbId === id) {
      handleSwitchDatabase(newList[0].id);
    }
  }, [databases, activeDbId, handleSwitchDatabase]);

  // Reactive list of user-created tables
  const tablesResult = useLiveQuery('SELECT name, display_name FROM quaere_tables ORDER BY created_at DESC');
  const tables = (tablesResult?.rows || []) as any[];
  const isReady = !!db;

  // Reactive column list for the active table — passed to ExtractModal
  const columnsForModalResult = useLiveQuery<{ id: string; name: string }>(
    `SELECT column_name as id, column_name as name FROM information_schema.columns WHERE table_name = $1 AND column_name NOT IN ('id', '_id', 'created_at', 'updated_at') ORDER BY ordinal_position`,
    [activeTable || '']
  );
  const columnsForModal = (columnsForModalResult?.rows || []) as { id: string; name: string }[];

  const renameTable = useCallback(async (name: string, newDisplayName: string) => {
    if (!db || !isReady) return;
    const cleanName = newDisplayName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (!cleanName) return;

    try {
      // 1. Rename the physical PostgreSQL table
      await db.query(`ALTER TABLE "${name}" RENAME TO "${cleanName}"`);

      // 2. Update the metadata in our system table
      await db.query(
        'UPDATE quaere_tables SET name = $1, display_name = $2 WHERE name = $3',
        [cleanName, newDisplayName, name]
      );

      // 3. Keep application state in sync
      if (activeTable === name) {
        setActiveTable(cleanName);
        localStorage.setItem('quaere_active_table', cleanName);
      }
    } catch (e) {
      console.error('[renameTable] Error:', e);
      alert('Error renaming table. Ensure the name contains no special characters or collisions.');
    }
  }, [db, isReady, activeTable]);

  const duplicateTable = useCallback(async (tableName: string) => {
    if (!db || !isReady) return;
    const original = tables.find(t => t.name === tableName);
    if (!original) return;

    const newDisplayName = `${original.display_name} (Copy)`;
    const newName = `${tableName}_copy_${Date.now().toString().slice(-4)}`;

    try {
      // 1. Create table structure like the original
      // PGlite/Postgres 17 supports CREATE TABLE ... (LIKE ... INCLUDING ALL)
      await db.query(`CREATE TABLE "${newName}" (LIKE "${tableName}" INCLUDING ALL)`);

      // 2. Add metadata
      await db.query(
        'INSERT INTO quaere_tables (name, display_name) VALUES ($1, $2)',
        [newName, newDisplayName]
      );

      // 3. Switch to the new table
      setActiveTable(newName);
      localStorage.setItem('quaere_active_table', newName);

      console.log('[duplicateTable] Success:', newName);
    } catch (e: any) {
      console.error('[duplicateTable] Error:', e);
      alert(`Error duplicating table: ${e.message}`);
    }
  }, [db, isReady, tables]);

  const deleteTable = useCallback(async (tableName: string) => {
    if (!db || !isReady) return;
    if (!confirm(`Are you sure you want to delete the table "${tableName}"? This action cannot be undone.`)) return;

    try {
      await db.exec(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      await db.query(`DELETE FROM quaere_tables WHERE name = $1`, [tableName]);
      if (activeTable === tableName) {
        const remaining = tables.filter(t => t.name !== tableName);
        setActiveTable(remaining.length > 0 ? remaining[0].name : null);
      }
      console.log('[deleteTable] Success:', tableName);
    } catch (e: any) {
      console.error('[deleteTable] Error:', e);
      alert(`Error deleting table: ${e.message}`);
    }
  }, [db, isReady, activeTable, tables]);

  const refreshTables = useCallback(async () => {
    // With useLiveQuery, this is mostly handled reactively, 
    // but the callback is kept for compatibility with other logic if needed.
    console.log('[refreshTables] reactive via useLiveQuery');
  }, []);

  // Persist active table selection
  useEffect(() => {
    if (activeTable) {
      localStorage.setItem('quaere_active_table', activeTable);
    } else {
      localStorage.removeItem('quaere_active_table');
    }
  }, [activeTable]);

  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const [chatContext, setChatContext] = useState<{
    rowId?: string;
    colId?: string;
    colName?: string;
    rowIdValue?: string | number;
  } | null>(null);

  const handleAICellAction = useCallback((rowId: string, colId: string) => {
    // Legacy support for cell-level AI prompts
    setChatContext({
      rowId,
      colId,
      colName: colId,
      rowIdValue: rowId
    });
    setIsChatOpen(true);
  }, []);

  const handleOpenGlobalChat = useCallback(() => {
    setChatContext(null);
    setIsChatOpen(true);
  }, []);

  const handleApplyActions = useCallback(async (actions: any[]) => {
    console.log('[handleApplyActions] called with', actions.length, 'actions', JSON.stringify(actions.map(a => ({ type: a.type }))));

    for (const action of actions) {
      console.log('[handleApplyActions] processing action:', action.type, 'db ready:', !!db, 'isReady:', isReady);

      if (action.type === 'SQL_EXEC') {
        let sql = action.payload.sql;
        if (!sql || !db || !isReady) continue;

        // Robustly extract just the SQL part if the AI hallucinated conversational text into this field
        const codeBlockMatch = sql.match(/```(?:sql)?\n([\s\S]*?)```/i);
        if (codeBlockMatch) {
          sql = codeBlockMatch[1];
        } else {
          // If no code block, try to find the start of the first SQL keyword
          const keywordMatch = sql.match(/(CREATE|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|WITH)\s+/i);
          if (keywordMatch && keywordMatch.index !== undefined) {
            sql = sql.substring(keywordMatch.index);
          }
        }

        // Final cleanup of stray suffix garbage
        sql = sql.replace(/Executed\s*SQL\s*$/i, '').trim();

        console.log('[SQL_EXEC] Executing SQL:', sql.substring(0, 200));
        try {
          await db.exec(sql);
          console.log('[SQL_EXEC] Success');

          // Sync quaere_tables with actual database state
          // 1. Remove entries for tables that no longer exist
          await db.exec(`
            DELETE FROM quaere_tables 
            WHERE name NOT IN (
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name != 'quaere_tables'
            )
          `);

          // 2. Register any new tables found
          const allTablesResult = await db.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name != 'quaere_tables'`
          );

          const prevTableNames = new Set(tables.map(t => t.name));
          const newTables = (allTablesResult.rows as any[]).filter(r =>
            !r.table_name.startsWith('_') && !prevTableNames.has(r.table_name)
          );

          for (const row of newTables) {
            const displayName = row.table_name.replace(/_/g, ' ');

            // Inject _id SERIAL if the table doesn't have it (required for live query ORDER BY _id)
            try {
              await db.exec(`ALTER TABLE "${row.table_name}" ADD COLUMN IF NOT EXISTS _id SERIAL`);
            } catch (idErr) {
              console.warn('[SQL_EXEC] Could not add _id to', row.table_name, idErr);
            }

            await db.query(
              `INSERT INTO quaere_tables (name, display_name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
              [row.table_name, displayName]
            );
            console.log('[SQL_EXEC] Registered table:', row.table_name);
          }

          // If activeTable was deleted, clear it or select another
          const currentTableNames = new Set((allTablesResult.rows as any[]).map(r => r.table_name));
          if (activeTable && !currentTableNames.has(activeTable)) {
            const remaining = tables.filter(t => t.name !== activeTable);
            setActiveTable(remaining.length > 0 ? remaining[0].name : null);
          } else if (!activeTable && tables.length > 0) {
            setActiveTable(tables[0].name);
          }

        } catch (e: any) {
          console.error('[SQL_EXEC] Error:', e);
          setError(`SQL error: ${e.message}`);
          alert(`Error executing SQL in browser database:\n${e.message}\n\nCheck the Executed SQL card to see if the AI generated invalid SQL.`);
        }
        continue;
      }

      if (action.type === 'DROP_TABLE') {
        const tn = action.payload.tableName;
        if (!tn || !db || !isReady) continue;
        try {
          await db.exec(`DROP TABLE IF EXISTS "${tn}" CASCADE`);
          await db.query(`DELETE FROM quaere_tables WHERE name = $1`, [tn]);
          if (activeTable === tn) {
            const remaining = tables.filter(t => t.name !== tn);
            setActiveTable(remaining.length > 0 ? remaining[0].name : null);
          }
          console.log('[DROP_TABLE] Dropped:', tn);
        } catch (e) {
          console.error('[DROP_TABLE] Error:', e);
        }
        continue;
      }

      if (action.type === 'CREATE_SCHEMA') {
        const cols = action.payload.columns;
        if (!Array.isArray(cols) || cols.length === 0) continue;

        // Derive a table name from the first column or a timestamp
        const tableName = toTableId(cols[0]?.name || 'table');
        const displayName = tableName.replace(/_/g, ' ');

        console.log('[CREATE_SCHEMA] Creating table:', tableName, 'with columns:', cols.map((c: any) => c.id));

        if (db && isReady) {
          try {
            await createTable(db, tableName, displayName, cols);
            await refreshTables();
            setActiveTable(tableName);
            console.log('[CREATE_SCHEMA] PGlite table created:', tableName);
          } catch (e) {
            console.error('[CREATE_SCHEMA] PGlite error:', e);
          }
        }

      } else if (action.type === 'ADD_ROW') {
        const valuesObj: Record<string, string> = {};
        if (Array.isArray(action.payload.values)) {
          action.payload.values.forEach((kv: any) => {
            if (kv.key) valuesObj[kv.key] = kv.value || '';
          });
        }

        if (db && isReady && activeTable) {
          try {
            const cols = Object.keys(valuesObj);
            if (cols.length > 0) {
              const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
              await db.query(
                `INSERT INTO "${activeTable}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
                cols.map(c => valuesObj[c])
              );
              console.log('[ADD_ROW] Inserted into PGlite:', activeTable);
            }
          } catch (e) {
            console.error('[ADD_ROW] PGlite error:', e);
          }
        }

      } else if (action.type === 'UPDATE_CELL') {
        const { rowId, colId, value } = action.payload;

        if (db && isReady && activeTable) {
          try {
            await db.query(
              `UPDATE "${activeTable}" SET "${colId}" = $1 WHERE _id = $2`,
              [value, rowId]
            );
          } catch (e) {
            console.error('[UPDATE_CELL] PGlite error:', e);
          }
        }

      } else if (action.type === 'DELETE_ROW') {
        const { rowId } = action.payload;
        if (db && isReady && activeTable) {
          try {
            await db.query(`DELETE FROM "${activeTable}" WHERE _id = $1`, [rowId]);
          } catch (e) {
            console.error('[DELETE_ROW] PGlite error:', e);
          }
        }
      }
    }
  }, [db, isReady, activeTable, refreshTables, setActiveTable, tables]);

  const [databaseWidth, setDatabaseWidth] = useState(450);
  const [chatWidth, setChatWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingChat, setIsResizingChat] = useState(false);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const startResizingChat = useCallback(() => {
    setIsResizingChat(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    setIsResizingChat(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        // Adjust for sidebar width if not collapsed
        const sidebarOffset = sidebarCollapsed ? 0 : 224; // 224px is w-56
        const newWidth = mouseMoveEvent.clientX - sidebarOffset - 16; // 16px for padding
        if (newWidth > 300 && newWidth < window.innerWidth * 0.7) {
          setDatabaseWidth(newWidth);
        }
      } else if (isResizingChat) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX;
        if (newWidth > 280 && newWidth < window.innerWidth * 0.6) {
          setChatWidth(newWidth);
        }
      }
    },
    [isResizing, isResizingChat, sidebarCollapsed]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);



  // Save Active Row to LocalStorage whenever it changes
  useEffect(() => {
    if (activeRowId) {
      localStorage.setItem('quaere_active_row', activeRowId);
    } else {
      localStorage.removeItem('quaere_active_row');
    }
  }, [activeRowId]);

  const [error, setError] = useState<string | null>(null);
  const [activeHighlights, setActiveHighlights] = useState<HighlightRect[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [cacheName, setCacheName] = useState<string | null>(null);
  const [structuredLayout, setStructuredLayout] = useState<any>(null);

  const handleGetStarted = () => {
    if (!isSignedIn) {
      setError('Please sign in to use the app');
      return;
    }
    setShowLandingPage(false);
    setShowDocumentation(false);
    setShowPrivacyPolicy(false);
  };

  const handleShowDocumentation = () => {
    setShowDocumentation(true);
    setShowLandingPage(false);
    setShowPrivacyPolicy(false);
  };

  const handleShowPrivacyPolicy = () => {
    setShowPrivacyPolicy(true);
    setShowLandingPage(false);
    setShowDocumentation(false);
  };

  const handleBackToHome = () => {
    setShowDocumentation(false);
    setShowPrivacyPolicy(false);
    setShowLandingPage(true);
  };

  // Hide landing page automatically if the user is logged in
  useEffect(() => {
    if (isSignedIn && showLandingPage) {
      setShowLandingPage(false);
    }
  }, [isSignedIn, showLandingPage]);

  const handleFileChange = (file: File | null) => {
    setPdfFile(file);
    setPdfPages([]);
    setPlainText('');
    setError(null);
    setActiveHighlights([]);
    setAnnotations([]);

    // Clear previous cache if it exists
    if (cacheName) {
      ai.caches.delete({ name: cacheName }).catch(err => console.error('Error deleting cache:', err));
      setCacheName(null);
    }
  };

  const processPdf = useCallback(async () => {
    if (!pdfFile) return;

    const isImage = pdfFile.type.startsWith('image/');
    let totalPages = 1;

    setProcessingState({ isProcessing: true, status: 'Initializing...', progress: 0 });
    setError(null);
    setPdfPages([]);
    setPlainText('');

    try {
      if (!isImage) {
        // PDF logic: check page count
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(pdfFile);

        const checkPagesPromise = new Promise<number>((resolve, reject) => {
          fileReader.onload = async (event) => {
            try {
              if (!event.target?.result) {
                reject(new Error('Failed to read file'));
                return;
              }
              const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
              const pdf = await (window as any).pdfjsLib.getDocument(typedArray).promise;
              resolve(pdf.numPages);
            } catch (err) {
              reject(err);
            }
          };
          fileReader.onerror = () => reject(new Error('Failed to read file'));
        });

        try {
          totalPages = await checkPagesPromise;
        } catch (e) {
          console.error("PDF.js Error:", e);
          throw new Error('Invalid PDF structure or corrupted file.');
        }
      }

      // Apply page limit based on subscription
      const maxAllowedPages = limits.maxPagesPerPdf;
      const pagesToProcess = Math.min(totalPages, maxAllowedPages);

      // Check if user has enough remaining pages
      if (!canProcessPages(pagesToProcess)) {
        const remaining = getRemainingPages();
        if (!isFreeTrialActive && !isPaidUser) {
          setError('Your 7-day free trial has ended. Please choose a plan to continue using Quaere.');
        } else if (isFreeTrialActive) {
          setError(`You need ${pagesToProcess} pages but only have ${remaining} pages remaining this month. Your free trial will end soon.`);
        } else {
          setError(`You need ${pagesToProcess} pages but only have ${remaining} pages remaining this month. Upgrade your plan for more pages!`);
        }
        setProcessingState({ isProcessing: false, status: 'Error', progress: 0 });
        return;
      }

      const processedPages: PageData[] = [];
      let extractedPlainText = '';

      if (isImage) {
        // Image logic: Simple preview
        setProcessingState({ isProcessing: true, status: 'Reading image...', progress: 30 });

        const imageDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(pdfFile);
        });

        processedPages.push({
          pageIndex: 0,
          width: 0, // Frontend handles display
          height: 0,
          imageDataUrl: imageDataUrl,
          textContent: []
        });
      } else {
        // PDF logic: Render pages
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(pdfFile);
        const typedArray = await new Promise<Uint8Array>((resolve, reject) => {
          fileReader.onload = (e) => resolve(new Uint8Array(e.target?.result as ArrayBuffer));
          fileReader.onerror = () => reject(new Error('Failed to read PDF'));
        });

        const pdf = await (window as any).pdfjsLib.getDocument(typedArray).promise;

        if (totalPages > maxAllowedPages) {
          setError(`This PDF has ${totalPages} pages. Your plan allows up to ${maxAllowedPages} pages per PDF. ${isPaidUser ? '' : 'Upgrade your plan for more pages per PDF!'}`);
        }

        for (let i = 1; i <= pagesToProcess; i++) {
          setProcessingState({
            isProcessing: true,
            status: `Processing page ${i} of ${pagesToProcess}...`,
            progress: (i / pagesToProcess) * 80,
          });

          const page = await pdf.getPage(i);
          const scale = 2.0;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport: viewport }).promise;

            // Draw annotations
            const pageAnnotations = annotations.filter(a => a.pageIndex === i - 1);
            if (pageAnnotations.length > 0) {
              context.fillStyle = 'black';
              context.font = '20px Arial';
              pageAnnotations.forEach(ann => {
                context.fillText(ann.text, ann.x * canvas.width, ann.y * canvas.height);
              });
            }

            const textContent = await page.getTextContent();
            const transformedTextContent = textContent.items.map((item: any) => {
              const vp1 = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
              const vp2 = viewport.convertToViewportPoint(item.transform[4] + item.width, item.transform[5] + item.height);
              return {
                str: item.str,
                left: vp1[0],
                top: vp2[1],
                width: Math.abs(vp2[0] - vp1[0]),
                height: Math.abs(vp1[1] - vp2[1]),
              };
            });

            processedPages.push({
              pageIndex: i - 1,
              width: viewport.width,
              height: viewport.height,
              imageDataUrl: canvas.toDataURL('image/png'),
              textContent: transformedTextContent
            });
          }
        }
      }

      // Backend Extraction (Unified for PDF and Images)
      setProcessingState(prev => ({ ...prev, status: "Extracting layout with AI...", progress: 90 }));
      const formData = new FormData();
      formData.append('file', pdfFile);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const backendResponse = await fetch(`${apiUrl}/process`, {
        method: 'POST',
        body: formData,
      });

      if (!backendResponse.ok) throw new Error('AI extraction failed');

      const layoutData = await backendResponse.json();
      setStructuredLayout(layoutData);

      extractedPlainText = layoutData.pages.map((p: any) =>
        p.lines.map((l: any) => l.text).join(' ')
      ).join('\n\n');

      setPlainText(extractedPlainText);
      setPdfPages(processedPages);
      setProcessingState({ isProcessing: false, status: 'Done!', progress: 100 });

      // Increment count
      incrementPageCount(pagesToProcess);

      // Cache logic
      if (extractedPlainText.length > 5000) {
        try {
          const cache = await ai.caches.create({
            model: 'gemini-2.5-flash',
            config: {
              systemInstruction: `You are a helpful AI assistant interacting with a document.\n- Your primary role is to answer questions based *only* on the provided text. Do not use external knowledge.\n- If the answer is not in the document, say so.\n- Structure your answers clearly. If an answer involves multiple distinct points from the document, present them as separate paragraphs or a bulleted list (using markdown).\n- When you quote directly from the document to support a point, you MUST wrap the exact, verbatim quote in <cite> tags.\n- You also have a tool called 'fillPdfFields'.\n\n**Full Document Content (for context):**\n${extractedPlainText}`,
              tools: [{ functionDeclarations: [fillPdfFieldsFunctionDeclaration] }],
              ttl: '3600s',
            },
          });
          setCacheName(cache.name);
        } catch (cacheError) {
          console.error('Error creating cache:', cacheError);
        }
      }

    } catch (e) {
      console.error('Processing failed:', e);
      setError((e as Error).message || 'Processing failed. Please try again.');
      setProcessingState({ isProcessing: false, status: 'Error', progress: 0 });
    }
  }, [pdfFile, annotations, limits, canProcessPages, getRemainingPages, isFreeTrialActive, isPaidUser, incrementPageCount]);

  const handleAnnotationFinalized = (newAnnotation: Annotation) => {
    const updatedAnnotations = [...annotations, newAnnotation];
    setAnnotations(updatedAnnotations);

    // Re-draw the page with the new annotation "burned in"
    const pageToUpdate = pdfPages.find(p => p.pageIndex === newAnnotation.pageIndex);
    if (pageToUpdate) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        // Draw all annotations for this page
        context.fillStyle = 'black';
        context.font = '20px Arial';
        updatedAnnotations
          .filter(a => a.pageIndex === newAnnotation.pageIndex)
          .forEach(ann => {
            context.fillText(ann.text, ann.x * canvas.width, ann.y * canvas.height);
          });

        const newImageDataUrl = canvas.toDataURL('image/png');

        setPdfPages(currentPages =>
          currentPages.map(p =>
            p.pageIndex === newAnnotation.pageIndex
              ? { ...p, imageDataUrl: newImageDataUrl }
              : p
          )
        );
      };
      img.src = pageToUpdate.imageDataUrl;
    }
  };

  const [isExtracting, setIsExtracting] = useState(false);
  const [isSuggestingSchema, setIsSuggestingSchema] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    fileName?: string;
    results?: { name: string; ok: boolean; error?: string }[];
  } | undefined>(undefined);
  const [newTableName, setNewTableName] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [editingTableName, setEditingTableName] = useState<string | null>(null);
  const [editingTableDisplayName, setEditingTableDisplayName] = useState('');

  const createTableManually = async () => {
    const raw = newTableName.trim();
    if (!raw || !db) return;
    const tableName = raw.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const displayName = raw;
    try {
      // Create table with required _id column
      await db.exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (_id SERIAL)`);
      await db.query(
        `INSERT INTO quaere_tables (name, display_name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [tableName, displayName]
      );
      setActiveTable(tableName);
      setNewTableName('');
      setIsCreatingTable(false);
    } catch (e: any) {
      console.error('[createTableManually] Error:', e);
      alert(`Error al crear la tabla: ${e.message}`);
    }
  };

  const importCsvAsTable = async (file: File) => {
    if (!db) return;
    const tableName = file.name.toLowerCase().replace(/\.csv$/i, '').replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).slice(2, 6);
    const displayName = file.name.replace(/\.csv$/i, '');

    try {
      // 1. Read first line for headers
      const text = await file.text();
      const firstLine = text.split('\n')[0];
      const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const cleanHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'col');

      // 2. Create the table
      const columnsSql = cleanHeaders.map(h => `"${h}" TEXT`).join(', ');
      await db.exec(`CREATE TABLE "${tableName}" (_id SERIAL, ${columnsSql})`);

      // 3. Register metadata
      await db.query(
        'INSERT INTO quaere_tables (name, display_name) VALUES ($1, $2)',
        [tableName, displayName]
      );

      // 4. Bulk import data
      await db.query(
        `COPY "${tableName}" (${cleanHeaders.map(h => `"${h}"`).join(', ')}) FROM '/dev/blob' WITH (FORMAT csv, HEADER true)`,
        [],
        { blob: file }
      );

      setActiveTable(tableName);
      return tableName;
    } catch (e: any) {
      console.error('[importCsvAsTable] Error:', e);
      alert(`Error importing CSV: ${e.message}`);
      throw e;
    }
  };

  const suggestSchemaFromPdf = async () => {
    if (!plainText) return;

    setIsSuggestingSchema(true);
    try {
      const schema = {
        type: Type.OBJECT,
        properties: {
          columns: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Display name of the field (e.g., 'Invoice Date')" },
                type: { type: Type.STRING, description: "Type of data: 'string', 'number', 'date', 'boolean', or 'json'" }
              },
              required: ["name", "type"]
            }
          }
        },
        required: ["columns"]
      };

      const prompt = `You are a professional database schema designer.
Analyze the following document structure and suggest a list of the most important fields to extract for a database.
IMPORTANT: Use the SAME LANGUAGE as the document for the column names (e.g., if the document is in Spanish, use "Fecha de Factura" instead of "Invoice Date").
For each field, provide a user-friendly name and its data type ('string', 'number', 'date', 'boolean', or 'json').

### DOCUMENT CONTENT:
${plainText}

### OUTPUT FORMAT:
Return a JSON object with a "columns" array.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt],
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema as any
        }
      });

      const rawText = response.text ? response.text.replace(/```json/g, '').replace(/```/g, '').trim() : '';
      if (rawText) {
        const result = JSON.parse(rawText);
        const suggestedCols = result.columns.map((col: any) => {
          const id = col.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          return {
            id,
            name: col.name,
            type: col.type as any
          };
        });

        // Prompt user confirmation to apply schema
        if (window.confirm(`Gemini suggests ${suggestedCols.length} columns: ${suggestedCols.map((c: any) => c.name).join(', ')}. \n\nDo you want to apply this schema and extract the data? (This will NOT delete your current rows)`)) {
          if (!activeTable || !db) return;

          // Apply via SQL DDL
          for (const col of suggestedCols) {
            let pgType = 'text';
            if (col.type === 'number') pgType = 'numeric';
            else if (col.type === 'date') pgType = 'timestamptz';
            else if (col.type === 'boolean') pgType = 'boolean';
            else if (col.type === 'json') pgType = 'jsonb';

            await db.query(`ALTER TABLE "${activeTable}" ADD COLUMN IF NOT EXISTS "${col.id}" ${pgType}`).catch(console.error);
          }

          // Trigger extraction in the next tick to ensure state has updated
          setIsExtractModalOpen(true);
        }
      }
    } catch (e) {
      console.error("Schema Suggestion Error:", e);
      setError("Failed to suggest schema: " + (e as any).message);
    } finally {
      setIsSuggestingSchema(false);
    }
  };

  // Extracts text from a single file, trying PDF.js first then falling back to the OCR backend
  const extractTextFromFile = async (file: File): Promise<{ text: string, pages: number }> => {
    const isImage = file.type.startsWith('image/');
    let pageCount = 1;

    if (!isImage) {
      // Try PDF.js text extraction first
      try {
        const arrayBuffer = await file.arrayBuffer();
        const typedArray = new Uint8Array(arrayBuffer);
        const pdf = await (window as any).pdfjsLib.getDocument(typedArray).promise;
        pageCount = pdf.numPages;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        if (text.trim().length >= 50) return { text: text.trim(), pages: pageCount };
      } catch {
        // silently fall through to OCR
      }
    }

    // Scanned PDF or image → OCR backend
    const formData = new FormData();
    formData.append('file', file);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/process`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('OCR backend error');
    const data = await response.json();
    const text = data.pages?.map((p: any) => p.lines?.map((l: any) => l.text).join(' ')).join('\n') || '';
    if (data.pages && data.pages.length > 0) pageCount = data.pages.length;
    return { text, pages: pageCount };
  };

  const extractDataFromSource = async (source: ExtractSource) => {
    if (!db) return;

    // Special case: CSV Import (auto-create table or import to existing)
    if (source.type === 'file') {
      const csvFile = source.files.find(f => f.name.toLowerCase().endsWith('.csv'));
      if (csvFile) {
        if (!activeTable || confirm(`Do you want to create a NEW table for "${csvFile.name}"? (Cancel to import into current table if selected)`)) {
          await importCsvAsTable(csvFile);
          setIsExtractModalOpen(false);
          return;
        }
      }
    }

    if (!activeTable) {
      alert('Please select or create a table first.');
      return;
    }

    // Resolve list of files (or a single virtual item for URL/text sources)
    const filesToProcess: Array<{
      label: string;
      getText: () => Promise<string>;
    }> = [];

    if (source.type === 'file') {
      for (const file of source.files) {
        filesToProcess.push({
          label: file.name,
          getText: async () => {
            const res = await extractTextFromFile(file);
            incrementPageCount(res.pages);
            return res.text;
          },
        });
      }
    } else if (source.type === 'url') {
      filesToProcess.push({
        label: source.url,
        getText: async () => {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiUrl}/fetch-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: source.url }),
          });
          if (!response.ok) throw new Error('Failed to fetch URL content');
          const data = await response.json();
          incrementPageCount(1);
          return data.text || '';
        },
      });
    } else {
      filesToProcess.push({
        label: 'Text input', getText: async () => {
          incrementPageCount(1);
          return source.text;
        }
      });
    }

    setIsExtracting(true);
    const results: { name: string; ok: boolean; error?: string }[] = [];
    setBatchProgress({ current: 0, total: filesToProcess.length, results });

    // Fetch schema once
    const colResult = await db.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = $1 AND column_name NOT IN ('id', '_id', 'created_at', 'updated_at')`,
      [activeTable]
    );
    const cols = colResult.rows.map((r: any) => ({
      id: r.column_name,
      name: r.column_name.replace(/_/g, ' '),
      type: r.data_type,
    }));

    if (cols.length === 0) {
      alert('The current table has no columns to extract to. Please add some columns first.');
      setIsExtracting(false);
      setBatchProgress(undefined);
      return;
    }

    // Build Gemini schema once
    const extractionProperties: Record<string, any> = {};
    cols.forEach((col: any) => {
      let aiType = Type.STRING;
      let desc = `Extract the value for "${col.name}". If not found, return "null".`;
      const t = col.type.toLowerCase();
      if (t.includes('numeric') || t.includes('int') || t.includes('float')) aiType = Type.NUMBER;
      else if (t === 'boolean') aiType = Type.BOOLEAN;
      else if (t.includes('date') || t.includes('time')) desc += ' Use YYYY-MM-DD format.';
      else if (t.includes('json')) desc += ' Return value as a valid JSON string or array.';
      extractionProperties[col.id] = { type: aiType, description: desc };
    });
    const dynamicSchema = {
      type: Type.OBJECT,
      properties: extractionProperties,
      required: cols.map((c: any) => c.id),
    };

    // Process files sequentially
    for (let i = 0; i < filesToProcess.length; i++) {
      const item = filesToProcess[i];
      setBatchProgress({ current: i + 1, total: filesToProcess.length, fileName: item.label, results: [...results] });

      try {
        const sourceText = await item.getText();
        if (!sourceText) throw new Error('No text extracted');

        const prompt = `You are a specialized data extraction assistant for invoices and documents.
Your task is to extract specific information from the provided text and return it in a structured JSON format.

### DOCUMENT DATA:
${sourceText}

### CRITICAL INSTRUCTIONS:
1. **Differentiate Parties**: Invoices usually have a SENDER (the company providing the service/product) and a RECIPIENT (the client/customer).
   - DO NOT confuse the sender's address/name with the recipient's.
2. **Missing Data**: If a field is not explicitly present in the document, return the exact string "null" for it.
3. **Accuracy**: Only extract what is written. Do not guess.

### Fields to extract:
${cols.map((col: any) => `- ${col.name} (stored as ID: ${col.id})`).join('\n')}

### Response Format:
You must return ONLY a valid JSON object matching the following schema, with no markdown code blocks, no preamble, and no extra text:
${JSON.stringify(dynamicSchema)}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [prompt],
          config: { responseMimeType: 'application/json', responseSchema: dynamicSchema },
        });

        const rawText = response.text ? response.text.replace(/```json/g, '').replace(/```/g, '').trim() : '';
        if (!rawText) throw new Error('Empty Gemini response');

        const extractedData = JSON.parse(rawText);
        console.log('[batch] Gemini extracted:', extractedData);

        // Use SQL null (not '') for missing values — empty strings break numeric/date columns
        const rowValues: Record<string, string | null> = {};
        cols.forEach((col: any) => {
          const value = extractedData[col.id];
          if (value !== null && value !== undefined && value !== 'null' && value !== 'None' && value !== '') {
            rowValues[col.id] = (col.type === 'json' || col.type === 'jsonb') && typeof value === 'object'
              ? JSON.stringify(value, null, 2)
              : value.toString();
          } else {
            rowValues[col.id] = null;
          }
        });

        const keys = Object.keys(rowValues);
        if (keys.length > 0) {
          const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
          const columnsSql = keys.map(k => `"${k}"`).join(', ');
          const sql = `INSERT INTO "${activeTable}" (${columnsSql}) VALUES (${placeholders})`;
          console.log('[batch] INSERT:', sql, Object.values(rowValues));
          await db.query(sql, Object.values(rowValues));
          console.log('[batch] INSERT ok for:', item.label);
        } else {
          await db.query(`INSERT INTO "${activeTable}" DEFAULT VALUES`);
        }

        results.push({ name: item.label, ok: true });
      } catch (e: any) {
        console.error(`[batch] Failed for ${item.label}:`, e);
        results.push({ name: item.label, ok: false, error: e.message || 'Error desconocido' });
      }

      setBatchProgress({ current: i + 1, total: filesToProcess.length, fileName: item.label, results: [...results] });
    }

    setIsExtracting(false);
    // Keep progress visible briefly so user can see the final results
    setTimeout(() => {
      setBatchProgress(undefined);
      if (filesToProcess.length === 1 && results[0]?.ok) {
        setIsExtractModalOpen(false);
      }
    }, 2000);
  };

  // ─── Multi-table relational extraction ────────────────────────────────────
  const extractDataFromMultipleTables = async (source: ExtractSource, targets: MultiTableTarget[]) => {
    if (!db || targets.length < 2) return;
    setIsExtracting(true);
    setBatchProgress(undefined);

    try {
      // 1. Fetch column schemas for each target table from PGlite (once per batch)
      // 1. Fetch column schemas for each target table from PGlite (once per batch)
      const targetsWithCols: MultiTableTarget[] = await Promise.all(
        targets.map(async (t) => {
          // Get basic columns
          const colRes = await db.query(
            `SELECT column_name as id, column_name as name, data_type as type
             FROM information_schema.columns
             WHERE table_name = $1 AND column_name NOT IN ('id', '_id', 'created_at', 'updated_at')
             ORDER BY ordinal_position`,
            [t.tableName]
          );

          // Get primary keys
          const pkRes = await db.query(
            `SELECT a.attname as col
             FROM pg_index i
             JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
             WHERE i.indrelid = $1::regclass AND i.indisprimary`,
            [t.tableName]
          );
          const pks = pkRes.rows.map((r: any) => r.col);

          return { ...t, columns: colRes.rows, pks };
        })
      );
      targets = targetsWithCols;

      // 2. Prepare items to process
      const itemsToProcess: { label: string; getText: () => Promise<string> }[] = [];
      if (source.type === 'file') {
        source.files.forEach(f => {
          itemsToProcess.push({ label: f.name, getText: () => extractTextFromFile(f) });
        });
      } else if (source.type === 'url') {
        itemsToProcess.push({
          label: source.url,
          getText: async () => {
            const res = await fetch('http://localhost:8000/fetch-url', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: source.url }),
            });
            const data = await res.json();
            return data.text || '';
          }
        });
      } else {
        itemsToProcess.push({ label: 'Text Input', getText: async () => source.text });
      }

      const results: { name: string; ok: boolean; error?: string }[] = [];

      // 3. Process each item in batch
      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        setBatchProgress({ current: i + 1, total: itemsToProcess.length, fileName: item.label, results: [...results] });

        try {
          const sourceText = await item.getText();
          if (!sourceText) throw new Error('Could not extract text from source.');

          // 2. Build per-table schema description for the prompt
          const tableSchemaDesc = targets.map(t => {
            const colList = t.columns.map(c => `  - ${c.name} (${c.type})`).join('\n');
            return `Table "${t.displayName}" (SQL: ${t.tableName}):\n${colList}`;
          }).join('\n\n');

          // Detect possible FK columns (columns that share a name across tables)
          const allColIds = targets.flatMap(t => t.columns.map(c => c.id));
          const fkCandidates = allColIds.filter((id, _, arr) => arr.filter(x => x === id).length > 1);
          const fkNote = fkCandidates.length > 0
            ? `IMPORTANT: columns ${fkCandidates.join(', ')} appear in multiple tables and are FOREIGN KEYS — use the SAME value across all tables for each shared key.`
            : 'Assign a shared unique key (e.g. an order ID or reference number found in the document) to link the tables together.';

          // 3. Build Gemini responseSchema dynamically
          const responseSchema: any = { type: Type.OBJECT, properties: {}, required: [] };
          const allOtherColIds = (tbl: typeof targets[0]) =>
            targets.filter(x => x.tableName !== tbl.tableName).flatMap(x => x.columns.map(c => c.id));
          const maxColCount = Math.max(...targets.map(x => x.columns.length));

          for (const t of targets) {
            const colProps: Record<string, any> = {};
            t.columns.forEach(col => {
              const lcType = col.type.toLowerCase();
              let aiType = Type.STRING;
              let desc = `Value for "${col.name}" in table "${t.displayName}".`;
              if (lcType.includes('numeric') || lcType.includes('int') || lcType.includes('float')) {
                aiType = Type.NUMBER;
              } else if (lcType === 'boolean') {
                aiType = Type.BOOLEAN;
              } else if (lcType.includes('date') || lcType.includes('time') || lcType.includes('timestamp')) {
                aiType = Type.STRING;
                desc += ' IMPORTANT: extract any date or date-like value you find (even if written as "July 4, 2016" or "04/07/2016") and return it in YYYY-MM-DD format.';
              }
              colProps[col.id] = { type: aiType, description: desc };
            });

            const hasFkCols = t.columns.some(c => allOtherColIds(t).includes(c.id));
            const isDetailByColCount = t.columns.length >= maxColCount && targets.indexOf(t) > 0;
            const isDetail = hasFkCols || isDetailByColCount;

            if (isDetail) {
              responseSchema.properties[t.tableName] = {
                type: Type.ARRAY,
                items: { type: Type.OBJECT, properties: colProps, required: t.columns.map(c => c.id) },
                description: `Array of ALL rows for table "${t.displayName}". Extract every line item — do not skip any.`,
              };
            } else {
              responseSchema.properties[t.tableName] = {
                type: Type.OBJECT,
                properties: colProps,
                required: t.columns.map(c => c.id),
                description: `Data for table "${t.displayName}"`,
              };
            }
            responseSchema.required.push(t.tableName);
          }

          const prompt = `You are a data extraction assistant. Extract structured data from the document below to populate multiple related database tables simultaneously.

### DOCUMENT:
${sourceText}

### TABLES TO POPULATE:
${tableSchemaDesc}

### RULES:
1. ${fkNote}
2. If a field is not present, return the string "null".
3. Return ONLY valid JSON matching the response schema — no markdown, no preamble.
4. Line-items or products should be returned as an array of objects — extract ALL of them.
5. DATES: always return dates in YYYY-MM-DD format regardless of how they appear in the document. Never skip a date field.
`;
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt],
            config: { responseMimeType: 'application/json', responseSchema },
          });

          const rawText = (response.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
          if (!rawText) throw new Error('Empty response from Gemini.');
          const extracted = JSON.parse(rawText);

          // 4. Insert rows into each table — sort parent (fewer cols) first to satisfy FK constraints
          const sortedTargets = [...targets].sort((a, b) => a.columns.length - b.columns.length);
          for (const t of sortedTargets) {
            const data = extracted[t.tableName];
            if (!data) continue;
            const rows = Array.isArray(data) ? data : [data];

            const pks = (t as any).pks || [];

            for (const row of rows) {
              const keys = t.columns.map(c => c.id).filter(k => row[k] !== undefined);
              if (keys.length === 0) continue;
              const values = keys.map(k => {
                const v = row[k];
                return (v === null || v === 'null' || v === 'None' || v === '') ? null : String(v);
              });

              const colsSql = keys.map(k => `"${k}"`).join(', ');
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

              let sql = `INSERT INTO "${t.tableName}" (${colsSql}) VALUES (${placeholders})`;

              // UPSERT logic if PK exists
              if (pks.length > 0 && pks.every((pk: string) => keys.includes(pk))) {
                const updateKeys = keys.filter(k => !pks.includes(k));
                if (updateKeys.length > 0) {
                  const updateClause = updateKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
                  sql += ` ON CONFLICT ("${pks.join('", "')}") DO UPDATE SET ${updateClause}`;
                } else {
                  sql += ` ON CONFLICT ("${pks.join('", "')}") DO NOTHING`;
                }
              }

              await db.query(sql, values);
            }
          }
          results.push({ name: item.label, ok: true });
        } catch (itemErr: any) {
          console.error(`[multi-extract] Error processing ${item.label}:`, itemErr);
          results.push({ name: item.label, ok: false, error: itemErr.message });
        }
      }

      if (itemsToProcess.length > 1) {
        setBatchProgress({ current: itemsToProcess.length, total: itemsToProcess.length, fileName: 'Done', results });
      } else {
        setIsExtractModalOpen(false);
        if (results[0]?.ok) {
          alert(`✅ Data successfully extracted into ${targets.length} tables.`);
        } else {
          alert(`❌ Extraction failed: ${results[0]?.error}`);
        }
      }

      alert(`✅ Data successfully inserted into ${targets.length} tables.`);
      setIsExtractModalOpen(false);
    } catch (e: any) {
      console.error('[multi-extract] Error:', e);
      alert('Multi-table extraction failed: ' + (e.message || e));
    } finally {
      setIsExtracting(false);
    }
  };
  // ─── End multi-table extraction ───────────────────────────────────────────

  return (
    <div className="h-screen flex bg-[#f8fafc] text-slate-900 antialiased overflow-hidden">
      {showLandingPage ? (
        <LandingPage onGetStarted={handleGetStarted} onShowDocumentation={handleShowDocumentation} onShowPrivacyPolicy={handleShowPrivacyPolicy} />
      ) : showDocumentation ? (
        <DocumentationPage onGetStarted={handleGetStarted} onBackToHome={handleBackToHome} onShowPrivacyPolicy={handleShowPrivacyPolicy} />
      ) : showPrivacyPolicy ? (
        <PrivacyPolicyPage onGetStarted={handleGetStarted} onBackToHome={handleBackToHome} />
      ) : (
        <div className="flex w-full h-full">
          {/* COLUMN 1: Sidebar */}
          <AppSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onNewDatabase={() => setIsCreatingTable(true)} // Note: This now refers to new table in current DB
            databases={databases}
            activeDbId={activeDbId}
            onSwitchDatabase={handleSwitchDatabase}
            onCreateDatabase={handleCreateDatabase}
            onRenameDatabase={handleRenameDatabase}
            onDeleteDatabase={handleDeleteDatabase}
          />

          {/* COLUMN 2: Workspace (Center) */}
          <main className="flex-grow flex flex-col h-full bg-white overflow-hidden border-r border-gray-200">
            {/* Workspace Header */}
            <header className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  {activeTable || 'No Table Selected'}
                </h2>
                <div className="h-4 w-[1px] bg-gray-200"></div>
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                  <button
                    onClick={() => setWorkspaceView('classic')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${workspaceView === 'classic' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <IconColumns className="w-3.5 h-3.5" />
                    Classic
                  </button>
                  <button
                    onClick={() => setWorkspaceView('visual')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${workspaceView === 'visual' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <IconLayout className="w-3.5 h-3.5" />
                    Visual
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">

                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={`p-2 rounded-lg transition-all ${isChatOpen ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200'}`}
                  title={isChatOpen ? 'Close Assistant' : 'Open Assistant'}
                >
                  {isChatOpen ? <IconX className="w-4 h-4" /> : <IconSparkles className="w-4 h-4" />}
                </button>
              </div>
            </header>

            {/* Workspace Content */}
            <div className="flex-grow overflow-hidden flex flex-col p-6 bg-[#fcfdfe]">
              {/* PGlite table selector */}
              {isReady && tables.length > 0 && (
                <div className="flex items-center gap-1 mb-3 overflow-x-auto no-scrollbar">
                  {tables.map(t => (
                    <div key={t.name} className="flex-shrink-0 group relative">
                      {editingTableName === t.name ? (
                        <div className="flex items-center gap-1 bg-white border border-indigo-300 rounded-lg px-2 py-1 shadow-sm h-[30px]">
                          <input
                            autoFocus
                            type="text"
                            value={editingTableDisplayName}
                            onChange={e => setEditingTableDisplayName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                renameTable(t.name, editingTableDisplayName);
                                setEditingTableName(null);
                              }
                              if (e.key === 'Escape') setEditingTableName(null);
                            }}
                            className="text-xs outline-none w-24"
                          />
                          <button onClick={() => { renameTable(t.name, editingTableDisplayName); setEditingTableName(null); }} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs">✓</button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setActiveTable(t.name)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all pr-24 ${activeTable === t.name
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                          >
                            <span className="mr-1.5 opacity-60">⬡</span>
                            {t.display_name}
                          </button>
                          <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all ${activeTable === t.name ? 'text-white' : 'text-slate-400'}`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTableName(t.name);
                                setEditingTableDisplayName(t.display_name);
                              }}
                              className={`p-1 rounded-md hover:bg-white/20 transition-all`}
                              title="Rename table"
                            >
                              <IconPencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateTable(t.name);
                              }}
                              className={`p-1 rounded-md hover:bg-white/20 transition-all`}
                              title="Duplicate structure"
                            >
                              <IconCopy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTable(t.name);
                              }}
                              className={`p-1 rounded-md hover:bg-red-500 hover:text-white transition-all`}
                              title="Delete table"
                            >
                              <IconX className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {/* + New Table inline button */}
                  {isCreatingTable ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        autoFocus
                        type="text"
                        value={newTableName}
                        onChange={e => setNewTableName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') createTableManually();
                          if (e.key === 'Escape') { setIsCreatingTable(false); setNewTableName(''); }
                        }}
                        placeholder="table name..."
                        className="h-7 px-2 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36"
                      />
                      <button onClick={createTableManually} className="h-7 px-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-500 transition-colors">✓</button>
                      <button onClick={() => { setIsCreatingTable(false); setNewTableName(''); }} className="h-7 px-2 bg-gray-100 text-gray-500 text-xs rounded-lg hover:bg-gray-200 transition-colors">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCreatingTable(true)}
                      className="flex-shrink-0 flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-slate-500 border border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <IconPlus className="w-3.5 h-3.5" />
                      New table
                    </button>
                  )}
                  {/* PGlite status indicator */}
                  <span className="ml-auto flex-shrink-0 flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    PostgreSQL live
                  </span>
                </div>
              )}
              {workspaceView === 'classic' ? (
                <div className="flex-1 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] border border-slate-200/60 overflow-hidden">
                  <DatabaseView
                    ref={databaseViewRef}
                    activeTableName={activeTable}
                    activeRowId={activeRowId}
                    onSetActiveRow={setActiveRowId}
                    onInsertTag={() => { }}
                    onRenameTag={() => { }}
                    onOpenExtractModal={() => setIsExtractModalOpen(true)}
                    isExtracting={isExtracting}
                    onSuggestSchema={suggestSchemaFromPdf}
                    isSuggestingSchema={isSuggestingSchema}
                    canExtract={Boolean(plainText)}
                    onAICellAction={handleAICellAction}
                    onTableCreated={(name) => setActiveTable(name)}
                  />
                </div>
              ) : (
                <div className="flex-1">
                  {visualMode === 'flow' ? (
                    <DatabaseSchemaView
                      activeTable={activeTable}
                      setActiveTable={setActiveTable}
                      tables={tables}
                      onToggleCharts={() => setVisualMode('charts')}
                    />
                  ) : (
                    <DatabaseVisualView
                      activeTable={activeTable}
                      setActiveTable={setActiveTable}
                      tables={tables}
                      onToggleFlow={() => setVisualMode('flow')}
                    />
                  )}
                </div>
              )}
            </div>
          </main>

          {/* COLUMN 3: AI Chat (Fixed but Collapsible & Resizable) */}
          <aside
            style={{ width: isChatOpen ? chatWidth : 0 }}
            className={`h-screen bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 transition-[width] duration-300 overflow-hidden relative ${isChatOpen ? '' : 'border-l-0'} ${isResizingChat ? '!transition-none' : ''}`}
          >
            {/* Chat Resize Handle */}
            {isChatOpen && (
              <div
                onMouseDown={startResizingChat}
                className={`absolute left-0 top-0 w-2 h-full hover:bg-primary/30 cursor-col-resize transition-all z-20 group ${isResizingChat ? 'bg-primary/40' : ''}`}
              >
                <div className={`w-0.5 h-16 bg-gray-300 rounded-full absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/50 ${isResizingChat ? 'bg-primary/60' : ''}`}></div>
              </div>
            )}

            {/* Transparent overlay during resize to prevent event loss (e.g. over ReactFlow) */}
            {(isResizing || isResizingChat) && (
              <div className="fixed inset-0 z-[100] cursor-col-resize" />
            )}

            <div style={{ width: chatWidth }} className="h-full">
              <ChatAssistant
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                activeTable={activeTable}
                context={chatContext}
                onApplyActions={handleApplyActions}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Extract Data Modal */}
      <ExtractModal
        isOpen={isExtractModalOpen}
        onClose={() => { if (!isExtracting) setIsExtractModalOpen(false); }}
        columns={tables.find(t => t.name === activeTable) ? (columnsForModal) : []}
        isExtracting={isExtracting}
        batchProgress={batchProgress}
        onExtract={extractDataFromSource}
        onExtractMultiTable={extractDataFromMultipleTables}
        activeTableName={activeTable}
        allTables={(tables as any[]).map(t => ({
          tableName: t.name,
          displayName: t.display_name || t.name,
          columns: [],  // columns are fetched inside the modal via the Gemini schema at extraction time
        }))}
      />
    </div>
  );
};

export default App;
