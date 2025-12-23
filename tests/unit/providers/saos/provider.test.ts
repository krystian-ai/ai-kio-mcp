import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SaosProvider, createSaosProvider } from '../../../../src/providers/saos/provider.js';
import { NotFoundError } from '../../../../src/utils/errors.js';
import searchFixture from '../../../fixtures/saos/search-response.json';
import judgmentFixture from '../../../fixtures/saos/judgment-response.json';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('SaosProvider', () => {
  const config = {
    baseUrl: 'https://www.saos.org.pl',
    timeoutMs: 30000,
  };

  let provider: SaosProvider;

  beforeEach(() => {
    provider = createSaosProvider(config);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should search for judgments and return normalized results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => searchFixture,
      });

      const result = await provider.search({
        query: 'rażąco niska cena',
        limit: 10,
        page: 0,
        includeSnippets: true,
      });

      expect(result.results).toHaveLength(2);
      expect(result.totalCount).toBe(156);
      expect(result.nextPage).toBe(1);

      // Check first result
      const first = result.results[0];
      expect(first).toBeDefined();
      expect(first?.provider).toBe('saos');
      expect(first?.providerId).toBe('524389');
      expect(first?.caseNumbers).toEqual(['KIO 3177/23']);
      expect(first?.judgmentType).toBe('SENTENCE');
      expect(first?.decision).toBe('uwzględnia odwołanie');
    });

    it('should include KIO court type filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ items: [], info: { totalResults: 0, pageSize: 10, pageNumber: 0 }, queryTemplate: {} }),
      });

      await provider.search({
        limit: 10,
        page: 0,
        includeSnippets: true,
      });

      const call = mockFetch.mock.calls[0];
      expect(call).toBeDefined();
      const url = new URL(call?.[0] as string);
      expect(url.searchParams.get('courtType')).toBe('NATIONAL_APPEAL_CHAMBER');
    });

    it('should apply date filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ items: [], info: { totalResults: 0, pageSize: 10, pageNumber: 0 }, queryTemplate: {} }),
      });

      await provider.search({
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
        limit: 10,
        page: 0,
        includeSnippets: true,
      });

      const call = mockFetch.mock.calls[0];
      expect(call).toBeDefined();
      const url = new URL(call?.[0] as string);
      expect(url.searchParams.get('judgmentDateFrom')).toBe('2023-01-01');
      expect(url.searchParams.get('judgmentDateTo')).toBe('2023-12-31');
    });

    it('should calculate next page correctly', async () => {
      // Last page scenario
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          items: [searchFixture.items[0]],
          info: { totalResults: 15, pageSize: 10, pageNumber: 1 },
          queryTemplate: {},
        }),
      });

      const result = await provider.search({
        limit: 10,
        page: 1,
        includeSnippets: true,
      });

      expect(result.nextPage).toBeUndefined();
    });
  });

  describe('getJudgment', () => {
    it('should retrieve and paginate judgment content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => judgmentFixture,
      });

      const result = await provider.getJudgment({
        providerId: '524389',
        formatPreference: 'text',
        maxChars: 1000,
        offsetChars: 0,
      });

      expect(result.metadata.caseNumbers).toEqual(['KIO 3177/23']);
      expect(result.metadata.judgmentType).toBe('SENTENCE');
      expect(result.metadata.judges).toContain('Jan Kowalski');
      expect(result.content.text.length).toBeLessThanOrEqual(1000);
      expect(result.continuation.truncated).toBe(true);
      expect(result.continuation.nextOffsetChars).toBe(1000);
    });

    it('should handle offset pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => judgmentFixture,
      });

      const result = await provider.getJudgment({
        providerId: '524389',
        formatPreference: 'text',
        maxChars: 500,
        offsetChars: 100,
      });

      const fullText = judgmentFixture.textContent;
      expect(result.content.text).toBe(fullText.substring(100, 600));
    });

    it('should throw NotFoundError for invalid provider ID', async () => {
      await expect(
        provider.getJudgment({
          providerId: 'invalid',
          formatPreference: 'text',
          maxChars: 40000,
          offsetChars: 0,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-KIO judgment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          ...judgmentFixture,
          courtType: 'COMMON', // Not KIO
        }),
      });

      await expect(
        provider.getJudgment({
          providerId: '524389',
          formatPreference: 'text',
          maxChars: 40000,
          offsetChars: 0,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should include source links', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => judgmentFixture,
      });

      const result = await provider.getJudgment({
        providerId: '524389',
        formatPreference: 'text',
        maxChars: 40000,
        offsetChars: 0,
      });

      expect(result.sourceLinks.saosHref).toBe('https://www.saos.org.pl/judgments/524389');
      expect(result.sourceLinks.saosSourceUrl).toBe(
        'https://orzeczenia.uzp.gov.pl/Home/PdfContent/524389'
      );
    });
  });

  describe('getSourceLinks', () => {
    it('should return source links for valid ID', () => {
      const links = provider.getSourceLinks('524389');

      expect(links.saosHref).toBe('https://www.saos.org.pl/judgments/524389');
    });

    it('should return empty links for invalid ID', () => {
      const links = provider.getSourceLinks('invalid');

      expect(links.saosHref).toBeUndefined();
    });
  });

  describe('healthCheck', () => {
    it('should return available when API responds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ items: [], info: { totalResults: 0, pageSize: 1, pageNumber: 0 }, queryTemplate: {} }),
      });

      const status = await provider.healthCheck();

      expect(status.provider).toBe('saos');
      expect(status.available).toBe(true);
      expect(status.latencyMs).toBeGreaterThanOrEqual(0);
      expect(status.timestamp).toBeDefined();
    });

    it('should return unavailable when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const status = await provider.healthCheck();

      expect(status.provider).toBe('saos');
      expect(status.available).toBe(false);
      expect(status.error).toBe('Network error: Network error');
    });
  });
});
