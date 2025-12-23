import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeKioHealth } from '../../../src/tools/kio-health.js';
import type { ToolContext } from '../../../src/tools/types.js';
import type { KioProvider, HealthStatus } from '../../../src/providers/types.js';
import { RateLimitError } from '../../../src/utils/errors.js';

// Mock provider
function createMockProvider(name: 'saos' | 'uzp'): KioProvider {
  return {
    name,
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
    stats: vi.fn().mockReturnValue({ hits: 10, misses: 5, size: 100, hitRate: 0.67 }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

// Mock rate limiter
function createMockRateLimiter() {
  return {
    checkLimit: vi.fn().mockReturnValue(true),
    getRemainingRequests: vi.fn().mockReturnValue(10),
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

describe('executeKioHealth', () => {
  let context: ToolContext;
  let mockSaosProvider: KioProvider;
  let mockUzpProvider: KioProvider;

  beforeEach(() => {
    mockSaosProvider = createMockProvider('saos');
    mockUzpProvider = createMockProvider('uzp');

    context = {
      providers: new Map([
        ['saos', mockSaosProvider],
        ['uzp', mockUzpProvider],
      ]),
      cache: createMockCache(),
      rateLimiters: {
        search: createMockRateLimiter(),
        judgment: createMockRateLimiter(),
        health: createMockRateLimiter(),
      },
      auditLogger: createMockAuditLogger(),
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      version: '1.0.0',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should accept empty input', async () => {
      const healthyStatus: HealthStatus = {
        provider: 'saos',
        available: true,
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      };
      vi.mocked(mockSaosProvider.healthCheck).mockResolvedValue(healthyStatus);
      vi.mocked(mockUzpProvider.healthCheck).mockResolvedValue({
        ...healthyStatus,
        provider: 'uzp',
      });

      const result = await executeKioHealth({}, context);

      expect(result.success).toBe(true);
    });

    it('should accept specific provider', async () => {
      const healthyStatus: HealthStatus = {
        provider: 'saos',
        available: true,
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      };
      vi.mocked(mockSaosProvider.healthCheck).mockResolvedValue(healthyStatus);

      const result = await executeKioHealth({ provider: 'saos' }, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.providers).toHaveLength(1);
        expect(result.data.providers[0].provider).toBe('saos');
      }
    });
  });

  describe('rate limiting', () => {
    it('should check rate limit', async () => {
      const healthyStatus: HealthStatus = {
        provider: 'saos',
        available: true,
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      };
      vi.mocked(mockSaosProvider.healthCheck).mockResolvedValue(healthyStatus);
      vi.mocked(mockUzpProvider.healthCheck).mockResolvedValue({
        ...healthyStatus,
        provider: 'uzp',
      });

      await executeKioHealth({}, context);

      expect(context.rateLimiters.health.checkLimit).toHaveBeenCalledWith('default');
    });

    it('should return error when rate limited', async () => {
      vi.mocked(context.rateLimiters.health.checkLimit).mockImplementation(() => {
        throw new RateLimitError('Rate limit exceeded', 5000);
      });

      const result = await executeKioHealth({}, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });
  });

  describe('health checks', () => {
    it('should check all providers when no specific provider requested', async () => {
      const healthyStatus: HealthStatus = {
        provider: 'saos',
        available: true,
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      };
      vi.mocked(mockSaosProvider.healthCheck).mockResolvedValue(healthyStatus);
      vi.mocked(mockUzpProvider.healthCheck).mockResolvedValue({
        ...healthyStatus,
        provider: 'uzp',
      });

      const result = await executeKioHealth({}, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.providers).toHaveLength(2);
      }
      expect(mockSaosProvider.healthCheck).toHaveBeenCalled();
      expect(mockUzpProvider.healthCheck).toHaveBeenCalled();
    });

    it('should return healthy status when all providers are healthy', async () => {
      const healthyStatus: HealthStatus = {
        provider: 'saos',
        available: true,
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      };
      vi.mocked(mockSaosProvider.healthCheck).mockResolvedValue(healthyStatus);
      vi.mocked(mockUzpProvider.healthCheck).mockResolvedValue({
        ...healthyStatus,
        provider: 'uzp',
      });

      const result = await executeKioHealth({}, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.healthy).toBe(true);
        expect(result.data.providers.every(p => p.healthy)).toBe(true);
      }
    });

    it('should return unhealthy status when a provider fails', async () => {
      const healthyStatus: HealthStatus = {
        provider: 'saos',
        available: true,
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      };
      const unhealthyStatus: HealthStatus = {
        provider: 'uzp',
        available: false,
        error: 'Connection refused',
        timestamp: new Date().toISOString(),
      };
      vi.mocked(mockSaosProvider.healthCheck).mockResolvedValue(healthyStatus);
      vi.mocked(mockUzpProvider.healthCheck).mockResolvedValue(unhealthyStatus);

      const result = await executeKioHealth({}, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.healthy).toBe(false);
        const uzpStatus = result.data.providers.find(p => p.provider === 'uzp');
        expect(uzpStatus?.healthy).toBe(false);
        expect(uzpStatus?.error).toBe('Connection refused');
      }
    });

    it('should handle health check exceptions', async () => {
      vi.mocked(mockSaosProvider.healthCheck).mockRejectedValue(
        new Error('Network error')
      );
      vi.mocked(mockUzpProvider.healthCheck).mockResolvedValue({
        provider: 'uzp',
        available: true,
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      });

      const result = await executeKioHealth({}, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.healthy).toBe(false);
        const saosStatus = result.data.providers.find(p => p.provider === 'saos');
        expect(saosStatus?.healthy).toBe(false);
        expect(saosStatus?.error).toBe('Network error');
      }
    });
  });

  describe('cache status', () => {
    it('should include cache statistics', async () => {
      const healthyStatus: HealthStatus = {
        provider: 'saos',
        available: true,
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      };
      vi.mocked(mockSaosProvider.healthCheck).mockResolvedValue(healthyStatus);
      vi.mocked(mockUzpProvider.healthCheck).mockResolvedValue({
        ...healthyStatus,
        provider: 'uzp',
      });

      const result = await executeKioHealth({}, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cache.type).toBe('memory');
        expect(result.data.cache.healthy).toBe(true);
        expect(result.data.cache.stats?.hits).toBe(10);
        expect(result.data.cache.stats?.misses).toBe(5);
      }
    });
  });

  describe('server info', () => {
    it('should include server information', async () => {
      const healthyStatus: HealthStatus = {
        provider: 'saos',
        available: true,
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      };
      vi.mocked(mockSaosProvider.healthCheck).mockResolvedValue(healthyStatus);
      vi.mocked(mockUzpProvider.healthCheck).mockResolvedValue({
        ...healthyStatus,
        provider: 'uzp',
      });

      const result = await executeKioHealth({}, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.server.version).toBe('1.0.0');
        expect(result.data.server.uptime).toBeGreaterThan(0);
        expect(result.data.server.startedAt).toBeDefined();
      }
    });
  });

  describe('audit logging', () => {
    it('should log health checks for each provider', async () => {
      const healthyStatus: HealthStatus = {
        provider: 'saos',
        available: true,
        latencyMs: 100,
        timestamp: new Date().toISOString(),
      };
      vi.mocked(mockSaosProvider.healthCheck).mockResolvedValue(healthyStatus);
      vi.mocked(mockUzpProvider.healthCheck).mockResolvedValue({
        ...healthyStatus,
        provider: 'uzp',
      });

      await executeKioHealth({}, context);

      expect(context.auditLogger.logHealthCheck).toHaveBeenCalledTimes(2);
    });
  });
});
