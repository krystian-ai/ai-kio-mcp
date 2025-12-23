/**
 * UZP Provider implementation
 * Implements the KioProvider interface for UZP portal
 *
 * Note: UZP is primarily used for content retrieval, not search.
 * Search is handled by SAOS provider.
 */

import type {
  KioProvider,
  SearchParams,
  SearchResponse,
  JudgmentParams,
  JudgmentResponse,
  SourceLinks,
  HealthStatus,
} from '../types.js';
import { UzpClient, createUzpClient, type UzpClientConfig } from './client.js';
import { mapUzpMetadata, mapUzpContent, buildUzpSourceLinks } from './mapper.js';
import { paginateContent } from '../../normalization/index.js';

export interface UzpProviderConfig extends Partial<UzpClientConfig> {}

const DEFAULT_UZP_CONFIG: UzpClientConfig = {
  baseUrl: 'https://orzeczenia.uzp.gov.pl',
  timeoutMs: 30000,
};

/**
 * UZP Provider for KIO judgments
 *
 * Primary use case: Content retrieval when SAOS lacks full text
 * Search is not implemented (use SAOS for search)
 */
export class UzpProvider implements KioProvider {
  readonly name = 'uzp' as const;
  private readonly client: UzpClient;
  private readonly baseUrl: string;

  constructor(config: UzpProviderConfig = {}) {
    const fullConfig: UzpClientConfig = {
      ...DEFAULT_UZP_CONFIG,
      ...config,
    };
    this.client = createUzpClient(fullConfig);
    this.baseUrl = fullConfig.baseUrl;
  }

  /**
   * Search for judgments
   *
   * Note: UZP search is not implemented in MVP.
   * Use SAOS provider for search functionality.
   * This returns empty results.
   */
  async search(_params: SearchParams): Promise<SearchResponse> {
    // UZP search requires UI automation or XHR reverse-engineering
    // Not implemented in MVP - use SAOS for search
    return {
      results: [],
      nextPage: undefined,
      totalCount: 0,
    };
  }

  /**
   * Get a specific judgment by provider ID
   */
  async getJudgment(params: JudgmentParams): Promise<JudgmentResponse> {
    // Fetch HTML content
    const html = await this.client.getContentHtml(params.providerId, 'KIO');

    // Extract metadata from HTML
    const metadata = mapUzpMetadata(html, params.providerId);

    // Get full text content
    const fullContent = mapUzpContent(html, params.providerId, this.baseUrl, 'KIO');

    // Apply pagination
    const { text, continuation } = paginateContent(
      fullContent.text,
      params.maxChars,
      params.offsetChars
    );

    // Build source links
    const sourceLinks = buildUzpSourceLinks(params.providerId, this.baseUrl, 'KIO');

    return {
      metadata,
      content: {
        text,
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
    return buildUzpSourceLinks(providerId, this.baseUrl, 'KIO');
  }

  /**
   * Check if UZP portal is available
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const available = await this.client.healthCheck();

      return {
        provider: 'uzp',
        available,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        provider: 'uzp',
        available: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

/**
 * Create a UZP provider instance
 */
export function createUzpProvider(config: UzpProviderConfig = {}): UzpProvider {
  return new UzpProvider(config);
}
