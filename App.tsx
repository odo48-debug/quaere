
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { FileUploader } from './components/FileUploader';
import { ContentView } from './components/ContentView';
import { ChatWindow } from './components/ChatWindow';
import { LandingPage } from './components/LandingPage';
import { IconDocument, IconLoader, IconSparkles, IconUpload, IconFileCheck, IconChevronLeft, IconChevronRight } from './components/icons';
import type { ChatMessage, ProcessingState, ContentViewHandle, PageData, HighlightRect, Annotation } from './types';
import { findHighlightCoordinates, findLabelCoordinates } from './utils/highlighting';
import { useUsageLimit } from './hooks/useUsageLimit';
import { UserButton } from './components/auth/UserButton';

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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    status: '',
    progress: 0,
  });
  const [pdfPages, setPdfPages] = useState<PageData[]>([]);
  const [plainText, setPlainText] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatReady, setChatReady] = useState(false);
  const [activeHighlights, setActiveHighlights] = useState<HighlightRect[]>([]);
  const contentViewRef = useRef<ContentViewHandle>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [cacheName, setCacheName] = useState<string | null>(null);

  const handleGetStarted = () => {
    if (!isSignedIn) {
      setError('Please sign in to use the app');
      return;
    }
    setShowLandingPage(false);
  };

  // Ocultar landing page automáticamente si el usuario está logueado
  useEffect(() => {
    if (isSignedIn && showLandingPage) {
      setShowLandingPage(false);
    }
  }, [isSignedIn, showLandingPage]);

  const handleFileChange = (file: File | null) => {
    setPdfFile(file);
    setPdfPages([]);
    setPlainText('');
    setChatMessages([]);
    setError(null);
    setChatReady(false);
    setActiveHighlights([]);
    setAnnotations([]);
    
    // Limpiar el cache anterior si existe
    if (cacheName) {
      ai.caches.delete({ name: cacheName }).catch(err => console.error('Error deleting cache:', err));
      setCacheName(null);
    }
  };

  const processPdf = useCallback(async () => {
    if (!pdfFile) return;

    // Get the number of pages first to check limits
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(pdfFile);
    
    const checkPagesPromise = new Promise<number>(async (resolve, reject) => {
      fileReader.onload = async (event) => {
        if (!event.target?.result) {
          reject(new Error('Failed to read file'));
          return;
        }
        const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
        const pdf = await (window as any).pdfjsLib.getDocument(typedArray).promise;
        resolve(pdf.numPages);
      };
      fileReader.onerror = () => reject(new Error('Failed to read file'));
    });

    let totalPages: number;
    try {
      totalPages = await checkPagesPromise;
    } catch (e) {
      setError('Failed to read PDF file.');
      setProcessingState({ isProcessing: false, status: 'Error', progress: 0 });
      return;
    }

    // Apply page limit based on subscription
    const pagesToProcess = Math.min(totalPages, limits.maxPagesPerPdf);
    
    // Check if user can process these pages
    if (!canProcessPages(pagesToProcess)) {
      const remaining = getRemainingPages();
      
      // Si el trial terminó y no es usuario de pago
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

    setError(null);
    setProcessingState({ isProcessing: true, status: 'Initializing...', progress: 0 });
    setPdfPages([]);
    setPlainText('');

    try {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(pdfFile);
      fileReader.onload = async (event) => {
        if (!event.target?.result) return;
        const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
        
        const pdf = await (window as any).pdfjsLib.getDocument(typedArray).promise;
        const numPages = pdf.numPages;
        const maxPagesToProcess = pagesToProcess;
        
        if (numPages > limits.maxPagesPerPdf) {
          setError(`This PDF has ${numPages} pages. Your plan allows up to ${limits.maxPagesPerPdf} pages per PDF. ${isPaidUser ? '' : 'Upgrade your plan for more pages per PDF!'}`);
        }
        
        const processedPages: PageData[] = [];
        let extractedPlainText = '';

        for (let i = 1; i <= maxPagesToProcess; i++) {
          setProcessingState({
            isProcessing: true,
            status: `Processing page ${i} of ${maxPagesToProcess}...`,
            progress: (i / maxPagesToProcess) * 100,
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
            
            // Draw existing annotations for this page
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
                const p1 = [item.transform[4], item.transform[5]];
                const p2 = [item.transform[4] + item.width, item.transform[5] + item.height];
                const vp1 = viewport.convertToViewportPoint(p1[0], p1[1]);
                const vp2 = viewport.convertToViewportPoint(p2[0], p2[1]);
                const left = vp1[0];
                const top = vp2[1];
                const width = vp2[0] - vp1[0];
                const height = vp1[1] - vp2[1];

                return {
                    str: item.str,
                    left: left,
                    top: top,
                    width: Math.abs(width),
                    height: Math.abs(height),
                };
            });

            processedPages.push({
              pageIndex: i - 1,
              width: viewport.width,
              height: viewport.height,
              imageDataUrl: canvas.toDataURL('image/png'),
              textContent: transformedTextContent
            });
            extractedPlainText += textContent.items.map((item: any) => item.str).join(' ') + '\n\n';
          }
        }

        setPdfPages(processedPages);
        setPlainText(extractedPlainText);
        setChatReady(true);
        setProcessingState({ isProcessing: false, status: 'Done!', progress: 100 });
        
        // Increment page count after successful processing
        incrementPageCount(maxPagesToProcess);
        
        // Crear cache para el contenido del PDF con tools incluidas
        try {
          const cache = await ai.caches.create({
            model: 'gemini-2.5-flash',
            config: {
              systemInstruction: `You are a helpful AI assistant interacting with a document.
- Your primary role is to answer questions based *only* on the provided text. Do not use external knowledge.
- If the answer is not in the document, say so.
- Structure your answers clearly. If an answer involves multiple distinct points from the document, present them as separate paragraphs or a bulleted list (using markdown).
- When you quote directly from the document to support a point, you MUST wrap the exact, verbatim quote in <cite> tags.
- You also have a tool called 'fillPdfFields'. If the user asks to fill, write, or add text to the document (e.g., "fill in my name and address"), you MUST use this tool. Do not try to answer in text. Call the function with the fields and values the user provides.

**Full Document Content (for context):**
${extractedPlainText}`,
              tools: [{ functionDeclarations: [fillPdfFieldsFunctionDeclaration] }],
              ttl: '3600s', // 1 hora
            },
          });
          setCacheName(cache.name);
          console.log('Cache created:', cache.name);
        } catch (cacheError) {
          console.error('Error creating cache:', cacheError);
          // No mostrar error al usuario, continuar sin cache
        }
      };
    } catch (e) {
      console.error(e);
      setError('An error occurred during processing. The PDF might be corrupted or in an unsupported format.');
      setProcessingState({ isProcessing: false, status: 'Error', progress: 0 });
    }
  }, [pdfFile, annotations, canProcessPages, getRemainingPages, limits, isPaidUser, isFreeTrialActive, incrementPageCount]);

  const handleSendMessage = async (message: string) => {
    if (!chatReady) return;
    
    // Verificar si el trial terminó y no es usuario de pago
    if (!isFreeTrialActive && !isPaidUser) {
      setChatMessages(prev => [...prev, 
        { role: 'user', content: message },
        { role: 'model', content: 'Your 7-day free trial has ended. Please choose a plan to continue using Quaere and chat with your documents.' }
      ]);
      return;
    }
  
    setIsChatting(true);
    setActiveHighlights([]);
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
  
    try {
      // Usar cache si está disponible, sino usar el método tradicional
      const config: any = {};
      
      if (cacheName) {
        // Usar el cache existente (ya incluye tools y systemInstruction)
        config.cachedContent = cacheName;
      } else {
        // Fallback: usar systemInstruction y tools tradicionales
        config.systemInstruction = `You are a helpful AI assistant interacting with a document.
- Your primary role is to answer questions based *only* on the provided text. Do not use external knowledge.
- If the answer is not in the document, say so.
- Structure your answers clearly. If an answer involves multiple distinct points from the document, present them as separate paragraphs or a bulleted list (using markdown).
- When you quote directly from the document to support a point, you MUST wrap the exact, verbatim quote in <cite> tags.
- You also have a tool called 'fillPdfFields'. If the user asks to fill, write, or add text to the document (e.g., "fill in my name and address"), you MUST use this tool. Do not try to answer in text. Call the function with the fields and values the user provides.

**Full Document Content (for context):**
${plainText}`;
        config.tools = [{ functionDeclarations: [fillPdfFieldsFunctionDeclaration] }];
      }
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: `User request: "${message}"` }] },
        config,
      });
      
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionCall = response.functionCalls[0];
        if (functionCall.name === 'fillPdfFields') {
          const { fields } = functionCall.args as { fields: { fieldName: string; fieldValue: string }[] };
          
          let fieldsFilledCount = 0;
          fields.forEach(({ fieldName, fieldValue }) => {
            const coords = findLabelCoordinates(fieldName, pdfPages);
            if (coords) {
              handleAnnotationFinalized({
                pageIndex: coords.pageIndex,
                x: coords.x,
                y: coords.y,
                text: fieldValue,
              });
              fieldsFilledCount++;
            }
          });
  
          const confirmationMessage = fieldsFilledCount > 0
            ? `Done! I've filled in ${fieldsFilledCount} field(s) for you.`
            : "I couldn't find the fields you mentioned in the document.";
          setChatMessages(prev => [...prev, { role: 'model', content: confirmationMessage }]);
        }
      } else {
         // Parse the text response for citations
         const rawAnswer = response.text;
   
         const citationRegex = /<cite>(.*?)<\/cite>/gs;
         const citations = [...rawAnswer.matchAll(citationRegex)].map(match => match[1].trim());
         
         setChatMessages(prev => [...prev, { role: 'model', content: rawAnswer, citations: citations }]);
      }
  
    } catch (e) {
      console.error(e);
      const errorMessage = "Sorry, I encountered an error. This might be due to a malformed response or an issue with the tool call. Please try again.";
      setChatMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleSetHighlights = (citations: string[]) => {
    if (activeHighlights.length > 0 && citations.length > 0 && activeHighlights[0].sourceCitation === citations[0]) {
      setActiveHighlights([]);
    } else {
      const newHighlights = findHighlightCoordinates(citations, pdfPages);
      setActiveHighlights(newHighlights);
    }
  };

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
  
  useEffect(() => {
    if (activeHighlights.length > 0) {
      setTimeout(() => {
        contentViewRef.current?.scrollToHighlight(activeHighlights[0].pageIndex);
      }, 100);
    }
  }, [activeHighlights]);

  return (
    <div className="h-screen flex antialiased">
      {showLandingPage ? (
        <LandingPage onGetStarted={handleGetStarted} />
      ) : (
        <>
          {/* Sidebar */}
          <aside className={`${sidebarCollapsed ? 'w-0' : 'w-56'} bg-surface shadow-lg flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden`}>
            {/* Header del Sidebar */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <IconSparkles className="w-7 h-7 text-primary" />
                <h1 className="text-xl font-bold text-gray-800">Quaere</h1>
              </div>
            </div>

            {/* Controles */}
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Document</h2>
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  <IconUpload className="w-4 h-4" />
                  Choose PDF
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleFileChange(file || null);
                  }}
                  accept="application/pdf"
                  className="hidden"
                />
                
                {pdfFile ? (
                  <div className="flex items-center text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    <IconFileCheck className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{pdfFile.name}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2">No file selected</p>
                )}

                <FileUploader onProcess={processPdf} isProcessing={processingState.isProcessing} disabled={!pdfFile} />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              {processingState.isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <IconLoader className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs">{processingState.status}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${processingState.progress}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Sidebar */}
            <div className="p-4 border-t border-gray-200 space-y-3">
              {isSignedIn && (
                <>
                  <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg text-center">
                    <span className="font-semibold text-primary">{getRemainingPages()}</span> pages remaining this month
                  </div>
                  <div className="flex justify-center">
                    <UserButton openUpwards={true} />
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-4 left-2 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
            style={{ left: sidebarCollapsed ? '8px' : '232px' }}
          >
            {sidebarCollapsed ? (
              <IconChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <IconChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Main Content */}
          <main className="flex-grow flex gap-4 p-4 overflow-hidden">
            <div className={`${sidebarCollapsed ? 'w-[480px]' : 'w-96'} bg-surface rounded-lg shadow-lg flex flex-col overflow-hidden transition-all duration-300`}>
              <ChatWindow
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isChatting={isChatting}
                disabled={!chatReady}
                onHighlight={handleSetHighlights}
                activeHighlights={activeHighlights.map(h => h.sourceCitation)}
              />
            </div>

            <div className="flex-1 bg-surface rounded-lg shadow-lg flex flex-col overflow-hidden">
              <ContentView
                ref={contentViewRef}
                pages={pdfPages}
                highlights={activeHighlights}
              />
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default App;
