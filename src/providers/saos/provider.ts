/**
 * SAOS Provider implementation
 * Implements the KioProvider interface for SAOS API
 */

import type {
  KioProvider,
  SearchParams,
  SearchResponse,
  JudgmentParams,
  JudgmentResponse,
  SourceLinks,
  HealthStatus,
  ContinuationInfo,
} from '../types.js';
import { SaosClient, createSaosClient, type SaosClientConfig } from './client.js';
import type { SaosSearchParams, SaosJudgmentType } from './types.js';
import {
  mapSearchResult,
  mapJudgmentMetadata,
  mapJudgmentContent,
  buildSourceLinks,
} from './mapper.js';
import { NotFoundError, ProviderError } from '../../utils/errors.js';

export interface SaosProviderConfig extends Partial<SaosClientConfig> {}

const DEFAULT_SAOS_CONFIG: SaosClientConfig = {
  baseUrl: 'https://www.saos.org.pl/api',
  timeoutMs: 30000,
};

/**
 * SAOS Provider for KIO judgments
 */
export class SaosProvider implements KioProvider {
  readonly name = 'saos' as const;
  private readonly client: SaosClient;
  private readonly baseUrl: string;

  constructor(config: SaosProviderConfig = {}) {
    const fullConfig: SaosClientConfig = {
      ...DEFAULT_SAOS_CONFIG,
      ...config,
    };
    this.client = createSaosClient(fullConfig);
    this.baseUrl = fullConfig.baseUrl;
  }

  /**
   * Search for KIO judgments
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    // Build SAOS-specific search params
    const saosParams: SaosSearchParams = {
      courtType: 'NATIONAL_APPEAL_CHAMBER', // Always filter to KIO
      pageSize: params.limit,
      pageNumber: params.page,
      sortingField: 'JUDGMENT_DATE',
      sortingDirection: 'DESC',
    };

    // Add query if provided
    if (params.query) {
      saosParams.all = params.query;
    }

    // Add case number if provided
    if (params.caseNumber) {
      saosParams.caseNumber = params.caseNumber;
    }

    // Add date filters
    if (params.dateFrom) {
      saosParams.judgmentDateFrom = params.dateFrom;
    }
    if (params.dateTo) {
      saosParams.judgmentDateTo = params.dateTo;
    }

    // Add judgment type filter
    if (params.judgmentType) {
      saosParams.judgmentTypes = [params.judgmentType as SaosJudgmentType];
    }

    // Execute search
    const response = await this.client.search(saosParams);

    // Map results to normalized format
    const results = response.items.map((item) =>
      mapSearchResult(item, this.baseUrl)
    );

    // Calculate next page
    const totalPages = Math.ceil(response.info.totalResults / response.info.pageSize);
    const currentPage = response.info.pageNumber;
    const nextPage = currentPage + 1 < totalPages ? currentPage + 1 : undefined;

    return {
      results,
      nextPage,
      totalCount: response.info.totalResults,
    };
  }

  /**
   * Get a specific judgment by provider ID
   */
  async getJudgment(params: JudgmentParams): Promise<JudgmentResponse> {
    const id = parseInt(params.providerId, 10);

    if (isNaN(id)) {
      throw new NotFoundError('judgment', params.providerId);
    }

    let response;
    try {
      response = await this.client.getJudgment(id);
    } catch (error) {
      if (error instanceof ProviderError && error.statusCode === 404) {
        throw new NotFoundError('judgment', params.providerId);
      }
      throw error;
    }

    // Verify this is a KIO judgment
    if (response.courtType !== 'NATIONAL_APPEAL_CHAMBER') {
      throw new NotFoundError('KIO judgment', params.providerId);
    }

    // Map metadata and content
    const metadata = mapJudgmentMetadata(response);
    const fullContent = mapJudgmentContent(response, this.baseUrl);
    const sourceLinks = buildSourceLinks(id, response, this.baseUrl);

    // Apply pagination (char-based)
    const fullText = fullContent.text;
    const totalChars = fullText.length;
    const startOffset = params.offsetChars;
    const endOffset = Math.min(startOffset + params.maxChars, totalChars);

    const truncated = endOffset < totalChars;
    const paginatedText = fullText.substring(startOffset, endOffset);

    const continuation: ContinuationInfo = {
      truncated,
      nextOffsetChars: truncated ? endOffset : undefined,
      totalChars,
    };

    return {
      metadata,
      content: {
        text: paginatedText,
        htmlUrl: fullContent.htmlUrl,
        pdfUrl: fullContent.pdfUrl,
      },
      continuation,
      sourceLinks,
    };
  }

  /**
   * Get source links for a judgment
   */
  getSourceLinks(providerId: string): SourceLinks {
    const id = parseInt(providerId, 10);

    if (isNaN(id)) {
      return {
        saosHref: undefined,
        saosSourceUrl: undefined,
        uzpHtml: undefined,
        uzpPdf: undefined,
      };
    }

    return {
      saosHref: this.client.buildJudgmentUrl(id),
      saosSourceUrl: undefined, // We'd need to fetch the judgment to get this
      uzpHtml: undefined,
      uzpPdf: undefined,
    };
  }

  /**
   * Check if SAOS is available
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Do a minimal search to check availability
      await this.client.search({
        courtType: 'NATIONAL_APPEAL_CHAMBER',
        pageSize: 1,
        pageNumber: 0,
      });

      return {
        provider: 'saos',
        available: true,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        provider: 'saos',
        available: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

/**
 * Create a SAOS provider instance
 */
export function createSaosProvider(config: SaosProviderConfig = {}): SaosProvider {
  return new SaosProvider(config);
}
