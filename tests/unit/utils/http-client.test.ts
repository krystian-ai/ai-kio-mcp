import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient, createHttpClient } from '../../../src/utils/http-client.js';
import { ProviderError, TimeoutError } from '../../../src/utils/errors.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('HttpClient', () => {
  const config = {
    baseUrl: 'https://api.example.com',
    timeoutMs: 5000,
  };

  let client: HttpClient;

  beforeEach(() => {
    client = createHttpClient(config);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should make a successful GET request', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => responseData,
      });

      const result = await client.get<typeof responseData>('/test');

      expect(result.data).toEqual(responseData);
      expect(result.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      );
    });

    it('should build URL with query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      });

      await client.get('/search', {
        params: {
          query: 'test',
          limit: 10,
          active: true,
          empty: undefined,
        },
      });

      const call = mockFetch.mock.calls[0];
      expect(call).toBeDefined();
      const url = new URL(call?.[0] as string);
      expect(url.searchParams.get('query')).toBe('test');
      expect(url.searchParams.get('limit')).toBe('10');
      expect(url.searchParams.get('active')).toBe('true');
      expect(url.searchParams.has('empty')).toBe(false);
    });

    it('should throw ProviderError on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

      try {
        await client.get('/notfound');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).statusCode).toBe(404);
        expect((error as ProviderError).isRetryable).toBe(false);
      }
    });

    it('should mark 5xx errors as retryable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers(),
      });

      try {
        await client.get('/error');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).isRetryable).toBe(true);
      }
    });

    it('should mark 429 as retryable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers(),
      });

      try {
        await client.get('/ratelimited');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).isRetryable).toBe(true);
      }
    });

    it('should throw TimeoutError on abort', async () => {
      mockFetch.mockImplementationOnce(() => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(client.get('/slow')).rejects.toThrow(TimeoutError);
    });

    it('should throw ProviderError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(client.get('/fail')).rejects.toThrow(ProviderError);
      await expect(client.get('/fail')).rejects.toMatchObject({
        statusCode: 503,
        isRetryable: true,
      });
    });

    it('should include custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      });

      await client.get('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      const call = mockFetch.mock.calls[0];
      expect(call?.[1]?.headers).toMatchObject({
        'X-Custom-Header': 'custom-value',
      });
    });
  });

  describe('getHtml', () => {
    it('should make a successful HTML GET request', async () => {
      const htmlContent = '<html><body>Test</body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => htmlContent,
      });

      const result = await client.getHtml('/page');

      expect(result.data).toBe(htmlContent);
      expect(result.status).toBe(200);
    });

    it('should set Accept header to text/html', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => '<html></html>',
      });

      await client.getHtml('/page');

      const call = mockFetch.mock.calls[0];
      expect(call?.[1]?.headers).toMatchObject({
        Accept: 'text/html',
      });
    });
  });

  describe('createHttpClient', () => {
    it('should create a new HttpClient instance', () => {
      const client = createHttpClient({
        baseUrl: 'https://test.com',
        timeoutMs: 10000,
      });

      expect(client).toBeInstanceOf(HttpClient);
    });

    it('should remove trailing slash from baseUrl', async () => {
      const client = createHttpClient({
        baseUrl: 'https://test.com/',
        timeoutMs: 10000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      });

      await client.get('/api/test');

      const call = mockFetch.mock.calls[0];
      expect(call?.[0]).toBe('https://test.com/api/test');
    });
  });
});
