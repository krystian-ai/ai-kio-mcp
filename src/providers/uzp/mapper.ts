/**
 * UZP response mapper
 * Parses UZP HTML content and extracts metadata
 */

import type {
  NormalizedJudgmentMetadata,
  NormalizedJudgmentContent,
  SourceLinks,
  JudgmentType,
} from '../types.js';
import type { UzpParsedMetadata, UzpKind } from './types.js';
import {
  extractTextFromHtml,
  extractCaseNumbersFromText,
  extractJudgmentDateFromText,
} from '../../normalization/index.js';

/**
 * Parse metadata from UZP HTML content
 */
export function parseUzpHtml(html: string): UzpParsedMetadata {
  const caseNumbers = extractCaseNumbersFromText(html);
  const judgmentDate = extractJudgmentDateFromText(html);

  // Try to extract decision from common patterns
  const decision = extractDecision(html);

  return {
    caseNumbers: caseNumbers.length > 0 ? caseNumbers : undefined,
    judgmentDate,
    decision,
    courtName: 'Krajowa Izba Odwoławcza',
  };
}

/**
 * Extract decision from HTML content
 */
function extractDecision(html: string): string | undefined {
  // Common decision patterns in KIO judgments
  const patterns = [
    /orzeka[:\s]*(?:<[^>]+>)*\s*([^<.]+)/i,
    /postanawia[:\s]*(?:<[^>]+>)*\s*([^<.]+)/i,
    /Izba\s+(?:uwzględnia|oddala|umarza)[^<.]*/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[0] || match?.[1]) {
      const decision = extractTextFromHtml(match[0] ?? match[1] ?? '');
      if (decision && decision.length > 5 && decision.length < 200) {
        return decision.trim();
      }
    }
  }

  return undefined;
}

/**
 * Infer judgment type from content
 */
export function inferJudgmentType(html: string): JudgmentType {
  const text = html.toLowerCase();

  if (text.includes('wyrok') || text.includes('orzeka')) {
    return 'SENTENCE';
  }

  if (text.includes('postanowienie') || text.includes('postanawia')) {
    return 'DECISION';
  }

  if (text.includes('uchwała')) {
    return 'RESOLUTION';
  }

  return 'DECISION'; // Default
}

/**
 * Map UZP content to normalized metadata
 */
export function mapUzpMetadata(
  html: string,
  providerId: string
): NormalizedJudgmentMetadata {
  const parsed = parseUzpHtml(html);

  return {
    caseNumbers: parsed.caseNumbers ?? [providerId],
    judgmentDate: parsed.judgmentDate ?? '',
    judgmentType: inferJudgmentType(html),
    decision: parsed.decision,
    legalBases: [], // UZP doesn't provide structured legal bases
    judges: [], // Would need to parse from content
    keywords: [],
    courtName: parsed.courtName,
  };
}

/**
 * Map UZP content to normalized judgment content
 */
export function mapUzpContent(
  html: string,
  id: string,
  baseUrl: string,
  kind: UzpKind = 'KIO'
): NormalizedJudgmentContent {
  const text = extractTextFromHtml(html, {
    preserveParagraphs: true,
    preserveLists: true,
  });

  return {
    text,
    htmlUrl: `${baseUrl}/Home/ContentHtml/${id}?Kind=${kind}`,
    pdfUrl: `${baseUrl}/Home/PdfContent/${id}?Kind=${kind}`,
  };
}

/**
 * Build source links for a UZP judgment
 */
export function buildUzpSourceLinks(
  id: string,
  baseUrl: string,
  kind: UzpKind = 'KIO'
): SourceLinks {
  return {
    saosHref: undefined,
    saosSourceUrl: undefined,
    uzpHtml: `${baseUrl}/Home/ContentHtml/${id}?Kind=${kind}`,
    uzpPdf: `${baseUrl}/Home/PdfContent/${id}?Kind=${kind}`,
  };
}
