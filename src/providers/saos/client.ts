/**
 * SAOS API client
 */

import { HttpClient, createHttpClient } from '../../utils/http-client.js';
import type { SaosSearchResponse, SaosJudgmentResponse, SaosSearchParams } from './types.js';

export interface SaosClientConfig {
  baseUrl: string;
  timeoutMs: number;
}

/**
 * Client for SAOS REST API
 */
export class SaosClient {
  private readonly http: HttpClient;
  private readonly baseUrl: string;

  constructor(config: SaosClientConfig) {
    this.baseUrl = config.baseUrl;
    this.http = createHttpClient({
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Search for judgments
   * GET /api/search/judgments
   */
  async search(params: SaosSearchParams): Promise<SaosSearchResponse> {
    const queryParams: Record<string, string | number | boolean | undefined> = {
      pageSize: params.pageSize ?? 10,
      pageNumber: params.pageNumber ?? 0,
    };

    // Add search filters
    if (params.all) {
      queryParams['all'] = params.all;
    }

    if (params.caseNumber) {
      queryParams['caseNumber'] = params.caseNumber;
    }

    if (params.courtType) {
      queryParams['courtType'] = params.courtType;
    }

    if (params.judgmentTypes && params.judgmentTypes.length > 0) {
      // SAOS expects multiple judgmentTypes parameters
      // For now, we'll use the first one (API limitation in single param)
      queryParams['judgmentTypes'] = params.judgmentTypes.join(',');
    }

    if (params.judgmentDateFrom) {
      queryParams['judgmentDateFrom'] = params.judgmentDateFrom;
    }

    if (params.judgmentDateTo) {
      queryParams['judgmentDateTo'] = params.judgmentDateTo;
    }

    if (params.sortingField) {
      queryParams['sortingField'] = params.sortingField;
      queryParams['sortingDirection'] = params.sortingDirection ?? 'DESC';
    }

    const response = await this.http.get<SaosSearchResponse>('/api/search/judgments', {
      params: queryParams,
    });

    return response.data;
  }

  /**
   * Get a specific judgment by ID
   * GET /api/judgments/{id}
   * Note: SAOS wraps judgment responses in {data, links}
   */
  async getJudgment(id: number): Promise<SaosJudgmentResponse> {
    const response = await this.http.get<{ data: SaosJudgmentResponse }>(`/api/judgments/${id}`);
    return response.data.data;
  }

  /**
   * Get the base URL for constructing links
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Build a judgment detail URL
   */
  buildJudgmentUrl(id: number): string {
    return `${this.baseUrl}/judgments/${id}`;
  }
}

/**
 * Create a SAOS client instance
 */
export function createSaosClient(config: SaosClientConfig): SaosClient {
  return new SaosClient(config);
}
