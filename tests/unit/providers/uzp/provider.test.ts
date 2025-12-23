import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UzpProvider, createUzpProvider } from '../../../../src/providers/uzp/index.js';

// Shared mock function for getHtml
const mockGetHtml = vi.fn();

// Mock the http-client module
vi.mock('../../../../src/utils/http-client.js', () => ({
  HttpClient: vi.fn(),
  createHttpClient: vi.fn().mockImplementation(() => ({
    getHtml: mockGetHtml,
  })),
}));

describe('UzpProvider', () => {
  beforeEach(() => {
    mockGetHtml.mockReset();
  });

  describe('constructor', () => {
    it('should create provider with default config', () => {
      const provider = new UzpProvider();

      expect(provider.name).toBe('uzp');
    });

    it('should create provider with custom config', () => {
      const provider = new UzpProvider({
        baseUrl: 'https://custom.uzp.gov.pl',
        timeoutMs: 5000,
      });

      expect(provider.name).toBe('uzp');
    });
  });

  describe('createUzpProvider', () => {
    it('should create provider instance', () => {
      const provider = createUzpProvider();

      expect(provider).toBeInstanceOf(UzpProvider);
      expect(provider.name).toBe('uzp');
    });
  });

  describe('search', () => {
    it('should return empty results (search not supported)', async () => {
      const provider = new UzpProvider();

      const result = await provider.search({
        query: 'test',
        limit: 10,
        page: 1,
        includeSnippets: false,
      });

      expect(result.results).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should return nextPage as undefined', async () => {
      const provider = new UzpProvider();

      const result = await provider.search({
        query: 'odwołanie',
        limit: 10,
        page: 1,
        includeSnippets: false,
      });

      expect(result.results).toHaveLength(0);
      expect(result.nextPage).toBeUndefined();
    });
  });

  describe('getJudgment', () => {
    it('should fetch and parse HTML content', async () => {
      mockGetHtml.mockResolvedValue({
        data: `
          <html>
            <body>
              <h1>WYROK</h1>
              <p>z dnia 15 grudnia 2023 r.</p>
              <p>Sygn. akt: KIO 3177/23</p>
              <p>Izba orzeka: Uwzględnia odwołanie.</p>
            </body>
          </html>
        `,
        status: 200,
        headers: new Headers(),
      });

      const provider = new UzpProvider();
      const result = await provider.getJudgment({
        provider: 'uzp',
        providerId: 'kio-3177-23',
        formatPreference: 'text',
        maxChars: 40000,
        offsetChars: 0,
      });

      expect(result.metadata.caseNumbers).toContain('KIO 3177/23');
      expect(result.metadata.judgmentDate).toBe('2023-12-15');
      expect(result.content.text).toContain('Uwzględnia odwołanie');
    });

    it('should apply pagination to content', async () => {
      const longContent = '<p>' + 'A'.repeat(1000) + '</p>';
      mockGetHtml.mockResolvedValue({
        data: `<html><body>${longContent}</body></html>`,
        status: 200,
        headers: new Headers(),
      });

      const provider = new UzpProvider();
      const result = await provider.getJudgment({
        provider: 'uzp',
        providerId: 'kio-100-23',
        formatPreference: 'text',
        maxChars: 200,
        offsetChars: 0,
      });

      expect(result.content.text.length).toBeLessThanOrEqual(200);
      expect(result.continuation.truncated).toBe(true);
    });

    it('should handle offset in pagination', async () => {
      const content = '<p>' + 'A'.repeat(500) + 'B'.repeat(500) + '</p>';
      mockGetHtml.mockResolvedValue({
        data: `<html><body>${content}</body></html>`,
        status: 200,
        headers: new Headers(),
      });

      const provider = new UzpProvider();
      const result = await provider.getJudgment({
        provider: 'uzp',
        providerId: 'kio-100-23',
        formatPreference: 'text',
        maxChars: 200,
        offsetChars: 500,
      });

      expect(result.content.text).toMatch(/^B+/);
    });
  });

  describe('getSourceLinks', () => {
    it('should return HTML source link', () => {
      const provider = new UzpProvider();
      const links = provider.getSourceLinks('kio-3177-23');

      expect(links.uzpHtml).toContain('uzp.gov.pl');
      expect(links.uzpHtml).toContain('kio-3177-23');
    });

    it('should return PDF link', () => {
      const provider = new UzpProvider();
      const links = provider.getSourceLinks('kio-100-23');

      expect(links.uzpPdf).toContain('PdfContent');
      expect(links.uzpPdf).toContain('kio-100-23');
    });

    it('should not include SAOS links', () => {
      const provider = new UzpProvider();
      const links = provider.getSourceLinks('kio-100-23');

      expect(links.saosHref).toBeUndefined();
      expect(links.saosSourceUrl).toBeUndefined();
    });
  });

  describe('healthCheck', () => {
    it('should return available status when UZP responds', async () => {
      mockGetHtml.mockResolvedValue({
        data: '<html><body>OK</body></html>',
        status: 200,
        headers: new Headers(),
      });

      const provider = new UzpProvider();
      const status = await provider.healthCheck();

      expect(status.available).toBe(true);
      expect(status.provider).toBe('uzp');
      expect(status.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return unavailable status on error', async () => {
      // Client's healthCheck catches errors internally and returns false
      mockGetHtml.mockRejectedValue(new Error('Network error'));

      const provider = new UzpProvider();
      const status = await provider.healthCheck();

      expect(status.available).toBe(false);
      expect(status.provider).toBe('uzp');
      // Error is swallowed by client, so no error message is propagated
    });

    it('should measure response latency', async () => {
      mockGetHtml.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return {
          data: '<html>OK</html>',
          status: 200,
          headers: new Headers(),
        };
      });

      const provider = new UzpProvider();
      const status = await provider.healthCheck();

      expect(status.latencyMs).toBeGreaterThanOrEqual(10);
    });

    it('should include timestamp', async () => {
      mockGetHtml.mockResolvedValue({
        data: '<html>OK</html>',
        status: 200,
        headers: new Headers(),
      });

      const provider = new UzpProvider();
      const status = await provider.healthCheck();

      expect(status.timestamp).toBeDefined();
      expect(new Date(status.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
