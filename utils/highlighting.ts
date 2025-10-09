
import type { PageData, HighlightRect, TextItem } from '../types';

interface Word {
  text: string;
  pageIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Normalizes text for searching by removing ALL whitespace and converting to lower case.
 * This makes matching extremely robust against spacing, newlines, and other formatting differences
 * between the model's output and the PDF's text layer (e.g., "First Class" vs "FirstClass").
 * @param text The text to normalize.
 * @returns The normalized text.
 */
const normalizeText = (text: string): string => {
  return text.replace(/[\s\n\r\u00AD]+/g, '').toLowerCase();
};

/**
 * Extracts individual words with their bounding boxes from a PDF page's text content.
 * It groups fragmented text items from pdf.js into logical words based on their pixel coordinates.
 * @param page The page data from which to extract words.
 * @returns An array of Word objects.
 */
const extractWordsFromPage = (page: PageData): Word[] => {
  const words: Word[] = [];
  if (!page.textContent || page.textContent.length === 0) {
    return words;
  }

  // Sort items by their top then left coordinates to process them in reading order.
  const sortedItems = [...page.textContent].sort((a, b) => {
    // A small tolerance for items on the same line
    if (Math.abs(a.top - b.top) > 5) return a.top - b.top; // Primary sort on Y
    return a.left - b.left; // Secondary sort on X
  });

  let currentWord: Word | null = null;

  for (const item of sortedItems) {
    if (!item.str.trim()) continue; // Skip whitespace-only items

    if (!currentWord) {
      currentWord = {
        text: item.str, pageIndex: page.pageIndex, left: item.left, top: item.top,
        width: item.width, height: item.height,
      };
    } else {
      const lastWordRight = currentWord.left + currentWord.width;
      const verticalDifference = Math.abs(item.top - currentWord.top);

      // Heuristic: If the new item is close horizontally and vertically on the same line, it's part of the same word.
      const isAdjacent = (item.left - lastWordRight) < (item.height * 0.4) && verticalDifference < (item.height * 0.5);

      if (isAdjacent) {
        // Merge with current word
        currentWord.text += item.str;
        const newRight = item.left + item.width;
        currentWord.width = newRight - currentWord.left;
        currentWord.height = Math.max(currentWord.height, item.height);
        currentWord.top = Math.min(currentWord.top, item.top);
      } else {
        // Finish the current word and start a new one
        words.push(currentWord);
        currentWord = {
          text: item.str, pageIndex: page.pageIndex, left: item.left, top: item.top,
          width: item.width, height: item.height,
        };
      }
    }
  }
  if (currentWord) words.push(currentWord);
  
  return words;
};


/**
 * Merges an array of individual word rectangles into larger, continuous rectangles
 * representing a single line of highlighted text.
 * @param rects The individual word rectangles to merge.
 * @returns An array of merged HighlightRect objects.
 */
const mergeRectsIntoLines = (rects: HighlightRect[]): HighlightRect[] => {
  if (rects.length === 0) return [];

  const lines: { [key: string]: HighlightRect[] } = {};
  rects.forEach(rect => {
    const lineKey = `${rect.pageIndex}-${Math.round(rect.top / 10)}`; // Group by line
    if (!lines[lineKey]) lines[lineKey] = [];
    lines[lineKey].push(rect);
  });

  return Object.values(lines).map(lineRects => {
    if (lineRects.length === 0) return null;
    lineRects.sort((a, b) => a.left - b.left);
    const firstRect = lineRects[0];
    const lastRect = lineRects[lineRects.length - 1];
    return {
      pageIndex: firstRect.pageIndex,
      left: firstRect.left,
      top: Math.min(...lineRects.map(r => r.top)),
      width: (lastRect.left + lastRect.width) - firstRect.left,
      height: Math.max(...lineRects.map(r => r.top + r.height)) - Math.min(...lineRects.map(r => r.top)),
      sourceCitation: firstRect.sourceCitation,
    };
  }).filter((rect): rect is HighlightRect => rect !== null);
};

/**
 * Main function to find highlight coordinates for citations. This version uses a robust
 * normalization strategy and a more efficient page-by-page search to handle long or
 * multi-sentence citations effectively.
 * @param citations An array of citation strings to find.
 * @param pages An array of all page data for the document.
 * @returns An array of HighlightRect objects for rendering.
 */
export const findHighlightCoordinates = (
  citations: string[],
  pages: PageData[]
): HighlightRect[] => {
  let allRects: HighlightRect[] = [];
  if (citations.length === 0 || pages.length === 0) return [];

  // Pre-process pages to create a cache of words and normalized text for efficient searching.
  const pageDataCache = pages.map(page => {
    const words = extractWordsFromPage(page);
    const normalizedText = normalizeText(words.map(w => w.text).join(''));
    return { words, normalizedText, pageIndex: page.pageIndex };
  });

  citations.forEach(citation => {
    const normalizedCitation = normalizeText(citation);
    if (!normalizedCitation) return;

    // Search for the citation on each page.
    for (const page of pageDataCache) {
      const { words, normalizedText } = page;
      if (words.length === 0) continue;

      let searchFromIndex = 0;
      let matchIndex;

      // Use a loop with indexOf to find all occurrences of the citation on the page.
      while ((matchIndex = normalizedText.indexOf(normalizedCitation, searchFromIndex)) !== -1) {
        const matchEndIndex = matchIndex + normalizedCitation.length;

        // Now, map the character indices of the match back to the original word objects.
        let accumulatedLength = 0;
        let startWordIndex = -1;
        let endWordIndex = -1;

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const normalizedWord = normalizeText(word.text);
          const wordStartLength = accumulatedLength;
          const wordEndLength = wordStartLength + normalizedWord.length;

          if (startWordIndex === -1 && matchIndex < wordEndLength) {
            startWordIndex = i;
          }

          if (startWordIndex !== -1 && endWordIndex === -1 && matchEndIndex <= wordEndLength) {
            endWordIndex = i;
          }
          
          accumulatedLength = wordEndLength;

          if (endWordIndex !== -1) break; // Found the full word range, can stop iterating
        }

        if (startWordIndex !== -1 && endWordIndex !== -1) {
          const matchingWords = words.slice(startWordIndex, endWordIndex + 1);

          // Verify the match to ensure accuracy.
          const verificationText = normalizeText(matchingWords.map(w => w.text).join(''));
          if (verificationText.includes(normalizedCitation)) {
            const wordRects = matchingWords.map(word => ({
              pageIndex: word.pageIndex,
              left: word.left,
              top: word.top,
              width: word.width,
              height: word.height,
              sourceCitation: citation,
            }));
            
            const mergedLineRects = mergeRectsIntoLines(wordRects);
            allRects = allRects.concat(mergedLineRects);
          }
        }

        // Advance search index to find subsequent matches.
        searchFromIndex = matchIndex + 1;
      }
    }
  });

  return allRects;
};

/**
 * Finds the coordinates for placing a value next to a given text label in the document.
 * @param labelText The text of the label to search for (e.g., "Full Name").
 * @param pages An array of all page data for the document.
 * @returns An object with pageIndex, x, and y relative coordinates, or null if not found.
 */
export const findLabelCoordinates = (
  labelText: string,
  pages: PageData[]
): { pageIndex: number; x: number; y: number } | null => {
  const normalizedLabel = normalizeText(labelText);

  for (const page of pages) {
    const words = extractWordsFromPage(page);
    if (words.length === 0) continue;

    const fullText = words.map(w => w.text).join('');
    const normalizedFullText = normalizeText(fullText);

    let searchFromIndex = 0;
    let matchIndex;

    while ((matchIndex = normalizedFullText.indexOf(normalizedLabel, searchFromIndex)) !== -1) {
      const matchEndIndex = matchIndex + normalizedLabel.length;

      let accumulatedLength = 0;
      let startWordIndex = -1;
      let endWordIndex = -1;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const normalizedWord = normalizeText(word.text);
        const wordStartLength = accumulatedLength;
        const wordEndLength = wordStartLength + normalizedWord.length;

        if (startWordIndex === -1 && matchIndex < wordEndLength) {
          startWordIndex = i;
        }
        if (startWordIndex !== -1 && endWordIndex === -1 && matchEndIndex <= wordEndLength) {
          endWordIndex = i;
          break;
        }
        accumulatedLength = wordEndLength;
      }

      if (startWordIndex !== -1 && endWordIndex !== -1) {
        const lastWordOfLabel = words[endWordIndex];
        const x = (lastWordOfLabel.left + lastWordOfLabel.width + 10) / page.width; // 10px offset
        const y = (lastWordOfLabel.top + lastWordOfLabel.height / 2) / page.height; // Vertically centered
        
        return {
          pageIndex: page.pageIndex,
          x,
          y,
        };
      }

      searchFromIndex = matchIndex + 1;
    }
  }

  return null;
};
