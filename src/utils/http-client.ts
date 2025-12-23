/**
 * Shared HTTP client with timeout handling and error wrapping
 */

import { ProviderError, TimeoutError } from './errors.js';

export interface HttpClientConfig {
  baseUrl: string;
  timeoutMs: number;
  headers?: Record<string, string>;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

/**
 * HTTP client with timeout support and standardized error handling
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeoutMs = config.timeoutMs;
    this.defaultHeaders = {
      'Accept': 'application/json',
      'User-Agent': 'mcp-kio/0.1.0',
      ...config.headers,
    };
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Create an AbortController with timeout
   */
  private createTimeoutController(externalSignal?: AbortSignal): { controller: AbortController; timeoutId: NodeJS.Timeout } {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    // If external signal aborts, also abort our controller
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => {
        controller.abort();
        clearTimeout(timeoutId);
      });
    }

    return { controller, timeoutId };
  }

  /**
   * Perform a GET request
   */
  async get<T>(path: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    const url = this.buildUrl(path, options.params);
    const { controller, timeoutId } = this.createTimeoutController(options.signal);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ProviderError(
          `HTTP ${response.status}: ${response.statusText}`,
          this.getProviderName(),
          response.status,
          response.status >= 500 || response.status === 429
        );
      }

      const data = await response.json() as T;

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ProviderError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(
            `Request to ${this.baseUrl} timed out after ${this.timeoutMs}ms`,
            this.timeoutMs
          );
        }

        // Network errors (DNS, connection refused, etc.)
        throw new ProviderError(
          `Network error: ${error.message}`,
          this.getProviderName(),
          503,
          true
        );
      }

      throw new ProviderError(
        'Unknown error occurred',
        this.getProviderName(),
        500,
        false
      );
    }
  }

  /**
   * Perform a GET request expecting HTML response
   */
  async getHtml(path: string, options: HttpRequestOptions = {}): Promise<HttpResponse<string>> {
    const url = this.buildUrl(path, options.params);
    const { controller, timeoutId } = this.createTimeoutController(options.signal);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.defaultHeaders,
          'Accept': 'text/html',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ProviderError(
          `HTTP ${response.status}: ${response.statusText}`,
          this.getProviderName(),
          response.status,
          response.status >= 500 || response.status === 429
        );
      }

      const data = await response.text();

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ProviderError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(
            `Request to ${this.baseUrl} timed out after ${this.timeoutMs}ms`,
            this.timeoutMs
          );
        }

        throw new ProviderError(
          `Network error: ${error.message}`,
          this.getProviderName(),
          503,
          true
        );
      }

      throw new ProviderError(
        'Unknown error occurred',
        this.getProviderName(),
        500,
        false
      );
    }
  }

  /**
   * Extract provider name from base URL for error messages
   */
  private getProviderName(): string {
    try {
      const url = new URL(this.baseUrl);
      if (url.hostname.includes('saos')) return 'saos';
      if (url.hostname.includes('uzp')) return 'uzp';
      return url.hostname;
    } catch {
      return 'unknown';
    }
  }
}

/**
 * Create an HTTP client instance
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}
