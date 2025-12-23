/**
 * UZP API client
 * Client for orzeczenia.uzp.gov.pl portal
 */

import { HttpClient, createHttpClient } from '../../utils/http-client.js';
import { NotFoundError, ProviderError } from '../../utils/errors.js';
import type { UzpKind } from './types.js';

export interface UzpClientConfig {
  baseUrl: string;
  timeoutMs: number;
}

/**
 * Client for UZP orzeczenia portal
 */
export class UzpClient {
  private readonly http: HttpClient;
  private readonly baseUrl: string;

  constructor(config: UzpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.http = createHttpClient({
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pl-PL,pl;q=0.9',
      },
    });
  }

  /**
   * Get HTML content for a judgment
   * GET /Home/ContentHtml/{id}?Kind={kind}
   */
  async getContentHtml(id: string, kind: UzpKind = 'KIO'): Promise<string> {
    try {
      const response = await this.http.getHtml(`/Home/ContentHtml/${id}`, {
        params: { Kind: kind },
      });
      return response.data;
    } catch (error) {
      if (error instanceof ProviderError && error.statusCode === 404) {
        throw new NotFoundError('UZP judgment', id);
      }
      throw error;
    }
  }

  /**
   * Build PDF URL for a judgment
   * /Home/PdfContent/{id}?Kind={kind}
   */
  buildPdfUrl(id: string, kind: UzpKind = 'KIO'): string {
    return `${this.baseUrl}/Home/PdfContent/${id}?Kind=${kind}`;
  }

  /**
   * Build HTML URL for a judgment
   * /Home/ContentHtml/{id}?Kind={kind}
   */
  buildHtmlUrl(id: string, kind: UzpKind = 'KIO'): string {
    return `${this.baseUrl}/Home/ContentHtml/${id}?Kind=${kind}`;
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Check if UZP portal is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Just fetch the main page to check availability
      await this.http.getHtml('/');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a UZP client instance
 */
export function createUzpClient(config: UzpClientConfig): UzpClient {
  return new UzpClient(config);
}
