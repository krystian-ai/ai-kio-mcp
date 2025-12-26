import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeKioGetSourceLinks } from '../../../src/tools/kio-get-source-links.js';
import type { ToolContext } from '../../../src/tools/types.js';
import type { KioProvider } from '../../../src/providers/types.js';
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

describe('executeKioGetSourceLinks', () => {
  let context: ToolContext;
  let mockProvider: KioProvider;

  beforeEach(() => {
    mockProvider = createMockProvider();

    context = {
      providers: new Map([['saos', mockProvider]]),
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
      const result = await executeKioGetSourceLinks({}, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject input with invalid provider', async () => {
      const result = await executeKioGetSourceLinks(
        { provider: 'invalid', provider_id: '123' },
        context
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should accept valid input', async () => {
      const links = { saosHref: 'https://example.com' };
      vi.mocked(mockProvider.getSourceLinks).mockReturnValue(links);

      const result = await executeKioGetSourceLinks(
        { provider: 'saos', provider_id: '123' },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('should check judgment rate limit', async () => {
      const links = { saosHref: 'https://example.com' };
      vi.mocked(mockProvider.getSourceLinks).mockReturnValue(links);

      await executeKioGetSourceLinks(
        { provider: 'saos', provider_id: '123' },
        context
      );

      expect(context.rateLimiters.judgment.checkLimit).toHaveBeenCalledWith('default');
    });

    it('should return error when rate limited', async () => {
      vi.mocked(context.rateLimiters.judgment.checkLimit).mockImplementation(() => {
        throw new RateLimitError('Rate limit exceeded', 5000);
      });

      const result = await executeKioGetSourceLinks(
        { provider: 'saos', provider_id: '123' },
        context
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(result.error.retryable).toBe(true);
        expect(result.error.retryAfterMs).toBe(5000);
      }
    });
  });

  describe('execution', () => {
    it('should return source links from provider', async () => {
      const links = {
        saosHref: 'https://saos.org.pl/judgments/123',
        saosSourceUrl: 'https://orzeczenia.uzp.gov.pl/123',
      };
      vi.mocked(mockProvider.getSourceLinks).mockReturnValue(links);

      const result = await executeKioGetSourceLinks(
        { provider: 'saos', provider_id: '123' },
        context
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.links).toEqual({
          saosHref: 'https://saos.org.pl/judgments/123',
          saosSourceUrl: 'https://orzeczenia.uzp.gov.pl/123',
        });
        expect(result.data.providerId).toBe('123');
      }
    });

    it('should return error for unavailable provider', async () => {
      context.providers.delete('saos');

      const result = await executeKioGetSourceLinks(
        { provider: 'saos', provider_id: '123' },
        context
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PROVIDER_NOT_FOUND');
      }
    });

    it('should handle provider errors', async () => {
      vi.mocked(mockProvider.getSourceLinks).mockImplementation(() => {
        throw new Error('Provider error');
      });

      const result = await executeKioGetSourceLinks(
        { provider: 'saos', provider_id: '123' },
        context
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INTERNAL_ERROR');
      }
    });
  });

  describe('audit logging', () => {
    it('should log rate limit exceeded', async () => {
      vi.mocked(context.rateLimiters.judgment.checkLimit).mockImplementation(() => {
        throw new RateLimitError('Rate limit exceeded', 5000);
      });

      await executeKioGetSourceLinks(
        { provider: 'saos', provider_id: '123' },
        context
      );

      expect(context.auditLogger.logRateLimitExceeded).toHaveBeenCalled();
    });

    it('should log errors', async () => {
      vi.mocked(mockProvider.getSourceLinks).mockImplementation(() => {
        throw new Error('Provider error');
      });

      await executeKioGetSourceLinks(
        { provider: 'saos', provider_id: '123' },
        context
      );

      expect(context.auditLogger.logError).toHaveBeenCalled();
    });
  });
});
