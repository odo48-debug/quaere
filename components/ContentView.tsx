
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { IconDocumentText } from './icons';
import type { ContentViewHandle, PageData, HighlightRect } from '../types';

interface ContentViewProps {
  pages: PageData[];
  highlights: HighlightRect[];
}

export const ContentView = forwardRef<ContentViewHandle, ContentViewProps>(({ pages, highlights }, ref) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);

  useImperativeHandle(ref, () => ({
    scrollToHighlight: (pageIndex: number) => {
      const pageElement = pageRefs.current[pageIndex];
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        pageElement.classList.add('animate-pulse-once');
        setTimeout(() => {
          pageElement.classList.remove('animate-pulse-once');
        }, 2000);
      }
    },
  }));

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg p-8">
        <IconDocumentText className="w-16 h-16 mb-4" />
        <p className="font-semibold">Document pages will appear here.</p>
        <p className="text-sm">Upload a PDF and click "Analyze" to begin.</p>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto bg-gray-100 p-2 sm:p-4 custom-scrollbar rounded-lg border">
      <div className="max-w-5xl mx-auto space-y-4">
        {pages.map((page) => (
          <div
            key={page.pageIndex}
            ref={el => { pageRefs.current[page.pageIndex] = el }}
            className="relative shadow-lg rounded-md overflow-hidden bg-white"
            style={{ 
              width: '100%',
              paddingBottom: `${(page.height / page.width) * 100}%`,
            }}
          >
            <img
              src={page.imageDataUrl}
              alt={`PDF Page ${page.pageIndex + 1}`}
              className="absolute top-0 left-0 w-full h-full"
            />
            {highlights
              .filter(h => h.pageIndex === page.pageIndex)
              .map((highlight, index) => (
                <div
                  key={index}
                  className="absolute bg-yellow-400 bg-opacity-30 rounded-sm"
                  style={{
                    left: `${(highlight.left / page.width) * 100}%`,
                    top: `${(highlight.top / page.height) * 100}%`,
                    width: `${(highlight.width / page.width) * 100}%`,
                    height: `${(highlight.height / page.height) * 100}%`,
                  }}
                />
              ))
            }
          </div>
        ))}
      </div>
    </div>
  );
});
