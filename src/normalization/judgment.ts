/**
 * Judgment content normalization utilities
 */

import type { NormalizedJudgmentMetadata, ContinuationInfo } from '../providers/types.js';
import { extractTextFromHtml } from './text-extractor.js';

/**
 * Apply character-based pagination to judgment content
 */
export function paginateContent(
  fullText: string,
  maxChars: number,
  offsetChars: number
): { text: string; continuation: ContinuationInfo } {
  const totalChars = fullText.length;
  const startOffset = Math.min(offsetChars, totalChars);
  const endOffset = Math.min(startOffset + maxChars, totalChars);

  const paginatedText = fullText.substring(startOffset, endOffset);
  const truncated = endOffset < totalChars;

  return {
    text: paginatedText,
    continuation: {
      truncated,
      nextOffsetChars: truncated ? endOffset : undefined,
      totalChars,
    },
  };
}

/**
 * Normalize HTML judgment content to plain text with pagination
 */
export function normalizeHtmlContent(
  html: string,
  maxChars: number,
  offsetChars: number
): { text: string; continuation: ContinuationInfo } {
  const plainText = extractTextFromHtml(html, {
    preserveParagraphs: true,
    preserveLists: true,
    maxConsecutiveNewlines: 2,
  });

  return paginateContent(plainText, maxChars, offsetChars);
}

/**
 * Merge metadata from multiple sources
 * Later sources take precedence for non-array fields
 * Arrays are concatenated and deduplicated
 */
export function mergeMetadata(
  ...sources: Partial<NormalizedJudgmentMetadata>[]
): NormalizedJudgmentMetadata {
  const result: NormalizedJudgmentMetadata = {
    caseNumbers: [],
    judgmentDate: '',
    judgmentType: 'DECISION',
    legalBases: [],
    judges: [],
    keywords: [],
  };

  for (const source of sources) {
    if (source.caseNumbers?.length) {
      result.caseNumbers = deduplicateArray([
        ...result.caseNumbers,
        ...source.caseNumbers,
      ]);
    }

    if (source.judgmentDate) {
      result.judgmentDate = source.judgmentDate;
    }

    if (source.judgmentType) {
      result.judgmentType = source.judgmentType;
    }

    if (source.decision !== undefined) {
      result.decision = source.decision;
    }

    if (source.legalBases?.length) {
      result.legalBases = deduplicateArray([
        ...result.legalBases,
        ...source.legalBases,
      ]);
    }

    if (source.judges?.length) {
      result.judges = deduplicateArray([...result.judges, ...source.judges]);
    }

    if (source.keywords?.length) {
      result.keywords = deduplicateArray([
        ...result.keywords,
        ...source.keywords,
      ]);
    }

    if (source.courtName) {
      result.courtName = source.courtName;
    }
  }

  return result;
}

/**
 * Deduplicate array while preserving order
 */
function deduplicateArray(arr: string[]): string[] {
  return [...new Set(arr)];
}

/**
 * Extract case numbers from judgment text
 * Looks for patterns like "KIO 3177/23" or "KIO/3177/23"
 */
export function extractCaseNumbersFromText(text: string): string[] {
  const patterns = [
    /KIO\s+\d+\/\d{2,4}/gi, // KIO 3177/23
    /KIO\/\d+\/\d{2,4}/gi, // KIO/3177/23
    /Sygn\.\s*akt[:\s]+KIO\s+\d+\/\d{2,4}/gi, // Sygn. akt: KIO 3177/23
  ];

  const matches: string[] = [];

  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (found) {
      for (const match of found) {
        // Normalize format
        const normalized = match
          .replace(/Sygn\.\s*akt[:\s]+/i, '')
          .replace(/\s+/g, ' ')
          .trim();
        matches.push(normalized);
      }
    }
  }

  return deduplicateArray(matches);
}

/**
 * Extract judgment date from text
 * Looks for patterns like "15 grudnia 2023" or "2023-12-15"
 */
export function extractJudgmentDateFromText(text: string): string | undefined {
  // ISO format
  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return isoMatch[0];
  }

  // Polish month names
  const polishMonths: Record<string, string> = {
    'stycznia': '01',
    'lutego': '02',
    'marca': '03',
    'kwietnia': '04',
    'maja': '05',
    'czerwca': '06',
    'lipca': '07',
    'sierpnia': '08',
    'września': '09',
    'października': '10',
    'listopada': '11',
    'grudnia': '12',
  };

  // Pattern: "z dnia 15 grudnia 2023"
  // Using Unicode property escape for Polish letters (ą, ć, ę, ł, ń, ó, ś, ź, ż)
  const polishPattern = /z\s+dnia\s+(\d{1,2})\s+([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i;
  const polishMatch = text.match(polishPattern);

  if (polishMatch) {
    const day = polishMatch[1]?.padStart(2, '0');
    const monthName = polishMatch[2]?.toLowerCase();
    const year = polishMatch[3];

    if (day && monthName && year && polishMonths[monthName]) {
      return `${year}-${polishMonths[monthName]}-${day}`;
    }
  }

  return undefined;
}
