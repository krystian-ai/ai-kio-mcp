import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeKioSearch } from '../../../src/tools/kio-search.js';
import type { ToolContext } from '../../../src/tools/types.js';
import type { KioProvider, SearchResponse } from '../../../src/providers/types.js';
import { RateLimitError } from '../../../src/utils/errors.js';

// Mock provider
function createMockProvider(): KioProvider {
  return {
    name: 'saos',
    search: vi.fn(),
    getJudgment: vi.fn(),
    getSourceLinks: vi.fn(),
    healthCheck: vi.fn(),
  };
}

// Mock cache
function createMockCache() {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    has: vi.fn().mockResolvedValue(false),
    clear: vi.fn().mockResolvedValue(undefined),
    stats: vi.fn().mockReturnValue({ hits: 0, misses: 0, size: 0, hitRate: 0 }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

// Mock rate limiter
function createMockRateLimiter() {
  return {
    checkLimit: vi.fn().mockReturnValue(true),
    getRemainingRequests: vi.fn().mockReturnValue(60),
    getResetTime: vi.fn().mockReturnValue(0),
    reset: vi.fn(),
    clear: vi.fn(),
    close: vi.fn(),
  };
}

// Mock audit logger
function createMockAuditLogger() {
  return {
    logSearch: vi.fn(),
    logJudgmentAccess: vi.fn(),
    logRateLimitExceeded: vi.fn(),
    logDomainBlocked: vi.fn(),
    logCacheHit: vi.fn(),
    logCacheMiss: vi.fn(),
    logError: vi.fn(),
    logHealthCheck: vi.fn(),
    getRecentEntries: vi.fn().mockReturnValue([]),
    getEntriesByType: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({}),
    clear: vi.fn(),
  };
}

describe('executeKioSearch', () => {
  let context: ToolContext;
  let mockProvider: KioProvider;

  beforeEach(() => {
    mockProvider = createMockProvider();

    context = {
      providers: new Map([['saos', mockProvider], ['uzp', createMockProvider()]]),
      cache: createMockCache(),
      rateLimiters: {
        search: createMockRateLimiter(),
        judgment: createMockRateLimiter(),
        health: createMockRateLimiter(),
      },
      auditLogger: createMockAuditLogger(),
      startedAt: new Date(),
      version: '1.0.0',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should reject empty input', async () => {
      const result = await executeKioSearch({}, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject input without query or case_number', async () => {
      const result = await executeKioSearch({ limit: 10 }, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should accept valid query', async () => {
      const mockResponse: SearchResponse = {
        results: [],
        totalCount: 0,
      };
      vi.mocked(mockProvider.search).mockResolvedValue(mockResponse);

      const result = await executeKioSearch({ query: 'test query' }, context);

      expect(result.success).toBe(true);
    });

    it('should accept valid case_number', async () => {
      const mockResponse: SearchResponse = {
        results: [],
        totalCount: 0,
      };
      vi.mocked(mockProvider.search).mockResolvedValue(mockResponse);

      const result = await executeKioSearch({ case_number: 'KIO 123/23' }, context);

      expect(result.success).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('should check rate limit before search', async () => {
      const mockResponse: SearchResponse = { results: [], totalCount: 0 };
      vi.mocked(mockProvider.search).mockResolvedValue(mockResponse);

      await executeKioSearch({ query: 'test' }, context);

      expect(context.rateLimiters.search.checkLimit).toHaveBeenCalledWith('default');
    });

    it('should return error when rate limited', async () => {
      vi.mocked(context.rateLimiters.search.checkLimit).mockImplementation(() => {
        throw new RateLimitError('Rate limit exceeded', 5000);
      });

      const result = await executeKioSearch({ query: 'test' }, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(result.error.retryable).toBe(true);
        expect(result.error.retryAfterMs).toBe(5000);
      }
    });
  });

  describe('caching', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        results: [
          {
            id: '123',
            provider: 'saos',
            caseNumbers: ['KIO 123/23'],
            judgmentDate: '2023-06-15',
            judgmentType: 'SENTENCE',
          },
        ],
        pagination: { page: 1, limit: 20, hasMore: false },
        metadata: { provider: 'saos', queryTimeMs: 100, cached: true },
      };
      vi.mocked(context.cache.get).mockResolvedValue(cachedResult);

      const result = await executeKioSearch({ query: 'test' }, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.metadata.cached).toBe(true);
      }
      expect(mockProvider.search).not.toHaveBeenCalled();
    });

    it('should cache results after successful search', async () => {
      const mockResponse: SearchResponse = {
        results: [
          {
            provider: 'saos',
            providerId: '123',
            caseNumbers: ['KIO 123/23'],
            judgmentDate: '2023-06-15',
            judgmentType: 'SENTENCE',
            sourceUrl: 'https://example.com',
          },
        ],
        totalCount: 1,
      };
      vi.mocked(mockProvider.search).mockResolvedValue(mockResponse);

      await executeKioSearch({ query: 'test' }, context);

      expect(context.cache.set).toHaveBeenCalled();
    });
  });

  describe('provider selection', () => {
    it('should use SAOS for auto provider preference', async () => {
      const mockResponse: SearchResponse = { results: [], totalCount: 0 };
      vi.mocked(mockProvider.search).mockResolvedValue(mockResponse);

      await executeKioSearch({ query: 'test', provider: 'auto' }, context);

      expect(mockProvider.search).toHaveBeenCalled();
    });

    it('should return error for unavailable provider', async () => {
      context.providers.delete('saos');

      const result = await executeKioSearch({ query: 'test', provider: 'saos' }, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PROVIDER_NOT_FOUND');
      }
    });
  });

  describe('search execution', () => {
    it('should pass parameters to provider', async () => {
      const mockResponse: SearchResponse = { results: [], totalCount: 0 };
      vi.mocked(mockProvider.search).mockResolvedValue(mockResponse);

      await executeKioSearch({
        query: 'test query',
        date_from: '2023-01-01',
        date_to: '2023-12-31',
        judgment_type: 'SENTENCE',
        limit: 50,
        page: 2,
      }, context);

      expect(mockProvider.search).toHaveBeenCalledWith({
        query: 'test query',
        caseNumber: undefined,
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
        judgmentType: 'SENTENCE',
        limit: 50,
        page: 2,
        includeSnippets: true,
      });
    });

    it('should return mapped results', async () => {
      const mockResponse: SearchResponse = {
        results: [
          {
            provider: 'saos',
            providerId: '123',
            caseNumbers: ['KIO 123/23'],
            judgmentDate: '2023-06-15',
            judgmentType: 'SENTENCE',
            decision: 'Test decision',
            snippet: 'Test snippet',
            sourceUrl: 'https://example.com',
          },
        ],
        totalCount: 1,
        nextPage: 2,
      };
      vi.mocked(mockProvider.search).mockResolvedValue(mockResponse);

      const result = await executeKioSearch({ query: 'test' }, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.results).toHaveLength(1);
        expect(result.data.results[0].id).toBe('123');
        expect(result.data.results[0].provider).toBe('saos');
        expect(result.data.pagination.hasMore).toBe(true);
      }
    });
  });

  describe('audit logging', () => {
    it('should log successful search', async () => {
      const mockResponse: SearchResponse = { results: [], totalCount: 0 };
      vi.mocked(mockProvider.search).mockResolvedValue(mockResponse);

      await executeKioSearch({ query: 'test' }, context);

      expect(context.auditLogger.logSearch).toHaveBeenCalled();
    });

    it('should log cache miss', async () => {
      const mockResponse: SearchResponse = { results: [], totalCount: 0 };
      vi.mocked(mockProvider.search).mockResolvedValue(mockResponse);

      await executeKioSearch({ query: 'test' }, context);

      expect(context.auditLogger.logCacheMiss).toHaveBeenCalled();
    });

    it('should log errors', async () => {
      vi.mocked(mockProvider.search).mockRejectedValue(new Error('Provider error'));

      await executeKioSearch({ query: 'test' }, context);

      expect(context.auditLogger.logError).toHaveBeenCalled();
    });
  });
});
