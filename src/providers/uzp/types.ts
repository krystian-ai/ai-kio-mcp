/**
 * UZP-specific types
 * Types for orzeczenia.uzp.gov.pl portal
 */

/**
 * UZP document kind
 */
export type UzpKind = 'KIO' | 'GK' | 'SO';

/**
 * UZP judgment identifier
 */
export interface UzpJudgmentId {
  id: string;
  kind: UzpKind;
}

/**
 * Parsed metadata from UZP HTML content
 */
export interface UzpParsedMetadata {
  caseNumbers?: string[];
  judgmentDate?: string;
  decision?: string;
  courtName?: string;
}

/**
 * UZP content response
 */
export interface UzpContentResponse {
  html: string;
  metadata: UzpParsedMetadata;
}
