/**
 * SAOS API response types
 * Based on https://www.saos.org.pl/help/index.php/dokumentacja-api
 */

/**
 * SAOS court type enum
 */
export type SaosCourtType =
  | 'COMMON'
  | 'SUPREME'
  | 'ADMINISTRATIVE'
  | 'CONSTITUTIONAL_TRIBUNAL'
  | 'NATIONAL_APPEAL_CHAMBER'; // KIO

/**
 * SAOS judgment type enum
 */
export type SaosJudgmentType = 'SENTENCE' | 'DECISION' | 'RESOLUTION' | 'REASONS';

/**
 * SAOS source info
 */
export interface SaosSource {
  code: string;
  judgmentUrl?: string;
  judgmentId?: string;
  publisher?: string;
  reviser?: string;
  publicationDate?: string;
}

/**
 * SAOS court case info
 */
export interface SaosCourtCase {
  caseNumber: string;
}

/**
 * SAOS judge info
 */
export interface SaosJudge {
  name: string;
  function?: string;
  specialRoles?: string[];
}

/**
 * SAOS referenced regulation
 */
export interface SaosReferencedRegulation {
  journalTitle?: string;
  journalNo?: number;
  journalYear?: number;
  journalEntry?: number;
  text: string;
}

/**
 * SAOS judgment item in search results
 */
export interface SaosSearchResultItem {
  id: number;
  courtType: SaosCourtType;
  courtCases: SaosCourtCase[];
  judgmentType: SaosJudgmentType;
  judgmentDate: string; // YYYY-MM-DD
  judges: SaosJudge[];
  source: SaosSource;
  courtReporters?: string[];
  decision?: string;
  summary?: string;
  thesis?: string;
  textContent?: string; // Only in detailed view
  referencedRegulations?: SaosReferencedRegulation[];
  keywords?: string[];
  legalBases?: string[];
  referencedCourtCases?: SaosCourtCase[];
}

/**
 * SAOS search query info
 */
export interface SaosQueryTemplate {
  all?: string;
  legalBase?: string;
  referencedRegulation?: string;
  lawJournalEntryCode?: string;
  judgeName?: string;
  caseNumber?: string;
  courtType?: SaosCourtType;
  ccCourtType?: string;
  ccCourtId?: number;
  ccCourtCode?: string;
  ccCourtName?: string;
  ccDivisionId?: number;
  ccDivisionCode?: string;
  ccDivisionName?: string;
  ccIncludeDependentCourtDivisions?: boolean;
  scPersonnelType?: string;
  scChamberId?: number;
  scChamberName?: string;
  scDivisionId?: number;
  scDivisionName?: string;
  judgmentTypes?: SaosJudgmentType[];
  keywords?: string[];
  judgmentDateFrom?: string;
  judgmentDateTo?: string;
  sortingField?: string;
  sortingDirection?: 'ASC' | 'DESC';
}

/**
 * SAOS search API response
 */
export interface SaosSearchResponse {
  items: SaosSearchResultItem[];
  queryTemplate: SaosQueryTemplate;
  info: {
    totalResults: number;
    pageSize: number;
    pageNumber: number;
  };
}

/**
 * SAOS single judgment API response (detailed)
 */
export interface SaosJudgmentResponse {
  id: number;
  courtType: SaosCourtType;
  courtCases: SaosCourtCase[];
  judgmentType: SaosJudgmentType;
  judgmentDate: string;
  judges: SaosJudge[];
  source: SaosSource;
  courtReporters?: string[];
  decision?: string;
  summary?: string;
  thesis?: string;
  textContent: string;
  referencedRegulations?: SaosReferencedRegulation[];
  keywords?: string[];
  legalBases?: string[];
  referencedCourtCases?: SaosCourtCase[];
}

/**
 * SAOS API search parameters
 */
export interface SaosSearchParams {
  all?: string;
  caseNumber?: string;
  courtType?: SaosCourtType;
  judgmentTypes?: SaosJudgmentType[];
  judgmentDateFrom?: string;
  judgmentDateTo?: string;
  pageSize?: number;
  pageNumber?: number;
  sortingField?: string;
  sortingDirection?: 'ASC' | 'DESC';
}
