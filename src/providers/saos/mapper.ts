/**
 * SAOS response mapper
 * Maps SAOS API responses to normalized types
 */

import type {
  NormalizedSearchResult,
  NormalizedJudgmentMetadata,
  NormalizedJudgmentContent,
  SourceLinks,
  JudgmentType,
} from '../types.js';
import type {
  SaosSearchResultItem,
  SaosJudgmentResponse,
  SaosJudgmentType,
} from './types.js';

/**
 * Map SAOS judgment type to normalized type
 */
export function mapJudgmentType(saosType: SaosJudgmentType): JudgmentType {
  switch (saosType) {
    case 'SENTENCE':
      return 'SENTENCE';
    case 'DECISION':
      return 'DECISION';
    case 'RESOLUTION':
      return 'RESOLUTION';
    case 'REASONS':
      // REASONS is not in our normalized types, map to DECISION as closest
      return 'DECISION';
    default:
      return 'DECISION';
  }
}

/**
 * Extract case numbers from SAOS court cases
 */
export function extractCaseNumbers(
  courtCases: { caseNumber: string }[]
): string[] {
  return courtCases.map((c) => c.caseNumber);
}

/**
 * Extract judge names from SAOS judges
 */
export function extractJudgeNames(
  judges: { name: string; function?: string }[]
): string[] {
  return judges.map((j) => j.name);
}

/**
 * Map SAOS search result item to normalized search result
 */
export function mapSearchResult(
  item: SaosSearchResultItem,
  baseUrl: string
): NormalizedSearchResult {
  const caseNumbers = extractCaseNumbers(item.courtCases);

  // Generate snippet from available content
  let snippet: string | undefined;
  if (item.summary) {
    snippet = truncateText(item.summary, 300);
  } else if (item.thesis) {
    snippet = truncateText(item.thesis, 300);
  } else if (item.textContent) {
    snippet = truncateText(item.textContent, 300);
  }

  return {
    provider: 'saos',
    providerId: String(item.id),
    caseNumbers,
    judgmentDate: item.judgmentDate,
    judgmentType: mapJudgmentType(item.judgmentType),
    decision: item.decision,
    snippet,
    sourceUrl: `${baseUrl}/judgments/${item.id}`,
  };
}

/**
 * Map SAOS judgment response to normalized metadata
 */
export function mapJudgmentMetadata(
  response: SaosJudgmentResponse
): NormalizedJudgmentMetadata {
  return {
    caseNumbers: extractCaseNumbers(response.courtCases),
    judgmentDate: response.judgmentDate,
    judgmentType: mapJudgmentType(response.judgmentType),
    decision: response.decision,
    legalBases: response.legalBases ?? [],
    judges: extractJudgeNames(response.judges),
    keywords: response.keywords ?? [],
    courtName: 'Krajowa Izba Odwoławcza',
  };
}

/**
 * Map SAOS judgment response to normalized content
 */
export function mapJudgmentContent(
  response: SaosJudgmentResponse,
  _baseUrl: string
): NormalizedJudgmentContent {
  return {
    text: response.textContent,
    htmlUrl: undefined, // SAOS doesn't provide separate HTML
    pdfUrl: response.source.judgmentUrl, // May contain PDF link
  };
}

/**
 * Build source links for a SAOS judgment
 */
export function buildSourceLinks(
  id: number,
  response: SaosJudgmentResponse,
  baseUrl: string
): SourceLinks {
  return {
    saosHref: `${baseUrl}/judgments/${id}`,
    saosSourceUrl: response.source.judgmentUrl,
    uzpHtml: undefined,
    uzpPdf: undefined,
  };
}

/**
 * Truncate text to specified length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to break at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}
