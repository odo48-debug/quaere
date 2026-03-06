import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import type { LocalDatabase, DatabaseRow } from '../types';
import html2pdf from 'html2pdf.js';

export interface TemplateEditorRef {
    insertTag: (tag: string) => void;
    renameTag: (oldTag: string, newTag: string) => void;
}

interface TemplateEditorProps {
    database: LocalDatabase;
    activeRowId: string | null;
}

export const TemplateEditor = forwardRef<TemplateEditorRef, TemplateEditorProps>(({
    database,
    activeRowId,
}, ref) => {
    const renderValueAsHtml = (value: any, colType: string, colName: string) => {
        if (!value) return `<span class="missing-tag-highlight">[Missing: ${colName}]</span>`;

        // If it's tagged as JSON/List and looks like an array, render as table
        if (colType === 'json') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Start table
                    let html = '<div class="dynamic-table-container"><table class="dynamic-table">';

                    // Determine headers
                    const firstItem = parsed[0];
                    if (typeof firstItem === 'object' && firstItem !== null) {
                        const headers = Object.keys(firstItem);
                        html += '<thead><tr>';
                        headers.forEach(h => {
                            html += `<th>${h}</th>`;
                        });
                        html += '</tr></thead><tbody>';

                        // Rows
                        parsed.forEach(item => {
                            html += '<tr>';
                            headers.forEach(h => {
                                html += `<td>${item[h] !== undefined ? item[h] : ''}</td>`;
                            });
                            html += '</tr>';
                        });
                    } else {
                        // Simple array of strings/numbers
                        html += '<thead><tr><th>Items</th></tr></thead><tbody>';
                        parsed.forEach(item => {
                            html += `<tr><td>${item}</td></tr>`;
                        });
                    }

                    html += '</tbody></table></div>';
                    return html;
                }
            } catch (e) {
                // Not valid JSON or not an array, just return as string
                return `<span class="tag-highlight">${value}</span>`;
            }
        }

        const highlightClass = colType === 'string' || colType === 'number' || colType === 'date' ? 'tag-highlight' : 'system-tag-highlight';
        return `<span class="${highlightClass}">${value}</span>`;
    };

    const [mode, setMode] = useState<'edit' | 'preview'>('edit');
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [renderedContent, setRenderedContent] = useState<string>('');
    const previewRef = useRef<HTMLDivElement>(null);

    // Get active row data
    const activeRow: DatabaseRow | undefined = useMemo(() =>
        database.rows.find(row => row.id === activeRowId),
        [database.rows, activeRowId]);

    // Creates a new editor instance.
    const editor = useCreateBlockNote({
        initialContent: (() => {
            const savedContent = localStorage.getItem('quaere_template');
            if (savedContent) {
                try {
                    return JSON.parse(savedContent);
                } catch (e) {
                    console.error('Error parsing saved template', e);
                }
            }
            return undefined;
        })()
    });

    // Save editor content to LocalStorage when it changes
    useEffect(() => {
        if (!editor) return;
        const saveContent = () => {
            const blocks = editor.document;
            localStorage.setItem('quaere_template', JSON.stringify(blocks));
        };
        editor.onChange(saveContent);
    }, [editor]);

    useImperativeHandle(ref, () => ({
        insertTag: (tag: string) => {
            if (editor && mode === 'edit') {
                editor.insertInlineContent([
                    {
                        type: "text",
                        text: `{${tag}}`,
                        styles: {}
                    }
                ]);
                editor.focus();
            }
        },
        renameTag: (oldTag: string, newTag: string) => {
            if (!editor) return;

            const oldTagWrapped = `{${oldTag}}`;
            const newTagWrapped = `{${newTag}}`;

            // Function to recursively traverse and replace text in blocks
            const traverseAndReplace = (blocks: any[]) => {
                blocks.forEach(block => {
                    if (block.content && Array.isArray(block.content)) {
                        block.content.forEach((item: any) => {
                            if (item.type === "text" && item.text.includes(oldTagWrapped)) {
                                item.text = item.text.split(oldTagWrapped).join(newTagWrapped);
                            }
                        });
                    }
                    if (block.children && Array.isArray(block.children)) {
                        traverseAndReplace(block.children);
                    }
                });
            };

            const blocks = JSON.parse(JSON.stringify(editor.document));
            traverseAndReplace(blocks);
            editor.replaceBlocks(editor.document, blocks);

            // Force save to localStorage
            localStorage.setItem('quaere_template', JSON.stringify(blocks));
        }
    }));

    // Sync editor content to state
    useEffect(() => {
        const syncHtml = async () => {
            if (editor) {
                const html = await editor.blocksToHTMLLossy(editor.document);
                setHtmlContent(html);
            }
        };

        // Initial sync
        syncHtml();

        // Listen to changes
        editor.onChange(() => {
            syncHtml();
        });
    }, [editor]);

    // Handle Preview rendering: Replace tags with values
    useEffect(() => {
        if (mode === 'preview') {
            let templatedText = htmlContent;

            // Replace each known column tag
            database.columns.forEach(col => {
                const tagPattern = new RegExp(`\\{${col.id}\\}`, 'g');
                const value = activeRow ? (activeRow[col.id] || '') : '';
                const replacement = renderValueAsHtml(value, col.type, col.name);
                templatedText = templatedText.replace(tagPattern, replacement);
            });

            // Replace system tags
            if (activeRow) {
                const autoPattern = new RegExp(`\\{autoNumber\\}`, 'g');
                templatedText = templatedText.replace(autoPattern, renderValueAsHtml(activeRow.autoNumber, 'system', 'Auto Number'));

                const datePattern = new RegExp(`\\{createdAt\\}`, 'g');
                templatedText = templatedText.replace(datePattern, renderValueAsHtml(activeRow.createdAt, 'system', 'Created At'));
            }

            setRenderedContent(templatedText);
        }
    }, [mode, htmlContent, database.columns, activeRow]);

    const handleExportPDF = async () => {
        if (!previewRef.current) return;

        const element = previewRef.current;

        // Add class to temporarily hide tag backgrounds in the PDF
        element.classList.add('pdf-export-mode');

        const opt: any = {
            margin: 15,
            filename: `document_${activeRow?.autoNumber || 'generated'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            await html2pdf().set(opt).from(element).save();
        } finally {
            // Remove the class even if it fails
            element.classList.remove('pdf-export-mode');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white text-gray-800 rounded-lg shadow-sm border border-gray-200">

            {/* Editor Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <div className="flex gap-2 bg-gray-200 p-1 rounded-lg">
                    <button
                        onClick={() => setMode('edit')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'edit' ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Edit Template
                    </button>
                    <button
                        onClick={() => setMode('preview')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'preview' ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Preview / Render
                    </button>
                </div>

                {mode === 'preview' && (
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-1.5 bg-secondary text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export to PDF
                    </button>
                )}
            </div>

            {/* Editor Content Area */}
            <div className="flex-grow overflow-y-auto bg-gray-100 flex justify-center p-8 custom-scrollbar">
                {/* Standard A4 sheet: 210mm x 297mm */}
                <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl rounded-sm transition-all duration-300 relative mb-8">

                    {/* Edit Mode */}
                    <div className={`p-12 transition-all duration-300 ${mode === 'edit' ? 'block' : 'hidden'}`}>
                        <BlockNoteView
                            editor={editor}
                            theme="light"
                        />
                    </div>

                    {/* Preview Mode */}
                    <div className={`p-12 transition-all duration-300 ${mode === 'preview' ? 'block' : 'hidden'}`}>
                        {activeRowId ? (
                            <div
                                ref={previewRef}
                                className="doc-content prose prose-slate max-w-none print:p-0 
                                  [&_p]:min-h-[1.5rem] [&_p]:mb-0 [&_h1]:mt-0 [&_h1]:mb-0 [&_h2]:mt-0 [&_h2]:mb-0 [&_h3]:mt-0 [&_h3]:mb-0
                                  [&_ul]:list-disc [&_ol]:list-decimal [&_li]:mb-0
                                  leading-[1.5] text-justify"
                                style={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '16px'
                                }}
                                dangerouslySetInnerHTML={{ __html: renderedContent }}
                            />
                        ) : (
                            <div className="p-12 flex flex-col items-center justify-center h-full text-center text-gray-400 italic">
                                <p>Please select a row in the Database panel to preview.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
