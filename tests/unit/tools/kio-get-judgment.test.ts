import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeKioGetJudgment } from '../../../src/tools/kio-get-judgment.js';
import type { ToolContext } from '../../../src/tools/types.js';
import type { KioProvider, JudgmentResponse } from '../../../src/providers/types.js';
import { RateLimitError, ProviderError } from '../../../src/utils/errors.js';

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
    getRemainingRequests: vi.fn().mockReturnValue(20),
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

describe('executeKioGetJudgment', () => {
  let context: ToolContext;
  let mockProvider: KioProvider;

  const mockJudgmentResponse: JudgmentResponse = {
    metadata: {
      caseNumbers: ['KIO 123/23'],
      judgmentDate: '2023-06-15',
      judgmentType: 'SENTENCE',
      decision: 'Uwzględniono odwołanie',
      legalBases: ['Art. 226 Pzp'],
      judges: ['Jan Kowalski'],
      keywords: ['zamówienia publiczne'],
      courtName: 'Krajowa Izba Odwoławcza',
    },
    content: {
      text: 'Treść orzeczenia...',
      htmlUrl: 'https://example.com/judgment.html',
      pdfUrl: 'https://example.com/judgment.pdf',
    },
    continuation: {
      truncated: false,
    },
    sourceLinks: {
      saosHref: 'https://saos.org.pl/judgments/123',
    },
  };

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
    it('should reject missing provider', async () => {
      const result = await executeKioGetJudgment({ provider_id: '123' }, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject missing provider_id', async () => {
      const result = await executeKioGetJudgment({ provider: 'saos' }, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject empty provider_id', async () => {
      const result = await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '',
      }, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should accept valid input', async () => {
      vi.mocked(mockProvider.getJudgment).mockResolvedValue(mockJudgmentResponse);

      const result = await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123456',
      }, context);

      expect(result.success).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('should check rate limit before retrieval', async () => {
      vi.mocked(mockProvider.getJudgment).mockResolvedValue(mockJudgmentResponse);

      await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123',
      }, context);

      expect(context.rateLimiters.judgment.checkLimit).toHaveBeenCalledWith('default');
    });

    it('should return error when rate limited', async () => {
      vi.mocked(context.rateLimiters.judgment.checkLimit).mockImplementation(() => {
        throw new RateLimitError('Rate limit exceeded', 5000);
      });

      const result = await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123',
      }, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(result.error.retryable).toBe(true);
      }
    });
  });

  describe('caching', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        metadata: mockJudgmentResponse.metadata,
        content: mockJudgmentResponse.content,
        continuation: mockJudgmentResponse.continuation,
        sourceLinks: mockJudgmentResponse.sourceLinks,
        retrievalMetadata: {
          provider: 'saos',
          providerId: '123',
          queryTimeMs: 100,
          cached: true,
        },
      };
      vi.mocked(context.cache.get).mockResolvedValue(cachedResult);

      const result = await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123',
      }, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.metadata.cached).toBe(true);
      }
      expect(mockProvider.getJudgment).not.toHaveBeenCalled();
    });

    it('should cache results after successful retrieval', async () => {
      vi.mocked(mockProvider.getJudgment).mockResolvedValue(mockJudgmentResponse);

      await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123',
      }, context);

      expect(context.cache.set).toHaveBeenCalled();
    });
  });

  describe('provider selection', () => {
    it('should return error for unavailable provider', async () => {
      context.providers.delete('saos');

      const result = await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123',
      }, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PROVIDER_NOT_FOUND');
      }
    });
  });

  describe('judgment retrieval', () => {
    it('should pass parameters to provider', async () => {
      vi.mocked(mockProvider.getJudgment).mockResolvedValue(mockJudgmentResponse);

      await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123456',
        format_preference: 'text',
        max_chars: 50000,
        offset_chars: 10000,
      }, context);

      expect(mockProvider.getJudgment).toHaveBeenCalledWith({
        providerId: '123456',
        formatPreference: 'text',
        maxChars: 50000,
        offsetChars: 10000,
      });
    });

    it('should return mapped judgment data', async () => {
      vi.mocked(mockProvider.getJudgment).mockResolvedValue(mockJudgmentResponse);

      const result = await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123',
      }, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.caseNumbers).toEqual(['KIO 123/23']);
        expect(result.data.content.text).toBe('Treść orzeczenia...');
        expect(result.data.retrievalMetadata.provider).toBe('saos');
      }
    });

    it('should handle provider errors', async () => {
      vi.mocked(mockProvider.getJudgment).mockRejectedValue(
        new ProviderError('Provider unavailable', 'saos', 503, true)
      );

      const result = await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123',
      }, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PROVIDER_ERROR');
        expect(result.error.retryable).toBe(true);
      }
    });
  });

  describe('audit logging', () => {
    it('should log successful retrieval', async () => {
      vi.mocked(mockProvider.getJudgment).mockResolvedValue(mockJudgmentResponse);

      await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123',
      }, context);

      expect(context.auditLogger.logJudgmentAccess).toHaveBeenCalled();
    });

    it('should log errors', async () => {
      vi.mocked(mockProvider.getJudgment).mockRejectedValue(new Error('Error'));

      await executeKioGetJudgment({
        provider: 'saos',
        provider_id: '123',
      }, context);

      expect(context.auditLogger.logError).toHaveBeenCalled();
    });
  });
});
