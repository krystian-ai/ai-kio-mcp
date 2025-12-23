/**
 * Provider interface definitions
 * These types define the contract between MCP tools and data providers
 */

// Provider identifiers
export type Provider = 'saos' | 'uzp';

// Judgment types from KIO
export type JudgmentType = 'SENTENCE' | 'DECISION' | 'RESOLUTION';

// Provider preference for search operations
export type ProviderPreference = 'auto' | 'saos' | 'uzp';

// Format preference for judgment content
export type FormatPreference = 'text' | 'html' | 'pdf';

/**
 * Normalized search result (provider-agnostic)
 */
export interface NormalizedSearchResult {
  provider: Provider;
  providerId: string;
  caseNumbers: string[];
  judgmentDate: string; // YYYY-MM-DD
  judgmentType: JudgmentType;
  decision?: string;
  snippet?: string;
  sourceUrl: string;
}

/**
 * Normalized judgment metadata
 */
export interface NormalizedJudgmentMetadata {
  caseNumbers: string[];
  judgmentDate: string;
  judgmentType: JudgmentType;
  decision?: string;
  legalBases: string[];
  judges: string[];
  keywords: string[];
  courtName?: string;
}

/**
 * Normalized judgment content with pagination info
 */
export interface NormalizedJudgmentContent {
  text: string;
  htmlUrl?: string;
  pdfUrl?: string;
}

/**
 * Source links for citations (canonical URLs)
 */
export interface SourceLinks {
  saosHref?: string;
  saosSourceUrl?: string;
  uzpHtml?: string;
  uzpPdf?: string;
}

/**
 * Continuation info for content pagination
 */
export interface ContinuationInfo {
  nextOffsetChars?: number;
  truncated: boolean;
  totalChars?: number;
}

/**
 * Search parameters
 */
export interface SearchParams {
  query?: string;
  caseNumber?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  judgmentType?: JudgmentType;
  limit: number;
  page: number;
  includeSnippets: boolean;
}

/**
 * Search response
 */
export interface SearchResponse {
  results: NormalizedSearchResult[];
  nextPage?: number;
  totalCount?: number;
}

/**
 * Judgment retrieval parameters
 */
export interface JudgmentParams {
  providerId: string;
  formatPreference: FormatPreference;
  maxChars: number;
  offsetChars: number;
}

/**
 * Judgment retrieval response
 */
export interface JudgmentResponse {
  metadata: NormalizedJudgmentMetadata;
  content: NormalizedJudgmentContent;
  continuation: ContinuationInfo;
  sourceLinks: SourceLinks;
}

/**
 * Health check status for a provider
 */
export interface HealthStatus {
  provider: Provider;
  available: boolean;
  latencyMs?: number;
  error?: string;
  timestamp: string;
}

/**
 * Search provider interface
 */
export interface SearchProvider {
  /**
   * Search for judgments
   */
  search(params: SearchParams): Promise<SearchResponse>;
}

/**
 * Judgment provider interface
 */
export interface JudgmentProvider {
  /**
   * Get a specific judgment by provider ID
   */
  getJudgment(params: JudgmentParams): Promise<JudgmentResponse>;

  /**
   * Get source links for a judgment
   */
  getSourceLinks(providerId: string): SourceLinks;
}

/**
 * Combined provider interface
 */
export interface KioProvider extends SearchProvider, JudgmentProvider {
  /**
   * Provider name
   */
  readonly name: Provider;

  /**
   * Check if the provider is available
   */
  healthCheck(): Promise<HealthStatus>;
}
