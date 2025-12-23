import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuditLogger,
  createAuditLogger,
  type AuditEntry,
} from '../../../src/security/audit-logger.js';

describe('AuditLogger', () => {
  let logger: AuditLogger;
  let mockHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockHandler = vi.fn();
    logger = new AuditLogger({
      consoleOutput: false,
      handler: mockHandler,
    });
  });

  describe('logSearch', () => {
    it('should log search operations', () => {
      logger.logSearch({
        clientId: 'client1',
        provider: 'saos',
        query: 'test query',
        resultCount: 10,
        latencyMs: 150,
        cached: false,
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      const entry = mockHandler.mock.calls[0][0] as AuditEntry;

      expect(entry.eventType).toBe('search');
      expect(entry.clientId).toBe('client1');
      expect(entry.provider).toBe('saos');
      expect(entry.success).toBe(true);
      expect(entry.latencyMs).toBe(150);
      expect(entry.metadata?.resultCount).toBe(10);
      expect(entry.metadata?.cached).toBe(false);
    });

    it('should not include query by default', () => {
      logger.logSearch({
        provider: 'saos',
        query: 'sensitive query',
        resultCount: 5,
        latencyMs: 100,
        cached: true,
      });

      const entry = mockHandler.mock.calls[0][0] as AuditEntry;
      expect(entry.query).toBeUndefined();
    });

    it('should include query when includeSensitive is true', () => {
      const sensitiveLogger = new AuditLogger({
        consoleOutput: false,
        handler: mockHandler,
        includeSensitive: true,
      });

      sensitiveLogger.logSearch({
        provider: 'saos',
        query: 'sensitive query',
        resultCount: 5,
        latencyMs: 100,
        cached: true,
      });

      const entry = mockHandler.mock.calls[0][0] as AuditEntry;
      expect(entry.query).toBe('sensitive query');
    });
  });

  describe('logJudgmentAccess', () => {
    it('should log judgment access', () => {
      logger.logJudgmentAccess({
        clientId: 'client1',
        provider: 'uzp',
        resourceId: 'kio-123-23',
        latencyMs: 200,
        cached: true,
        offsetChars: 1000,
      });

      const entry = mockHandler.mock.calls[0][0] as AuditEntry;

      expect(entry.eventType).toBe('judgment_access');
      expect(entry.resourceId).toBe('kio-123-23');
      expect(entry.metadata?.cached).toBe(true);
      expect(entry.metadata?.offsetChars).toBe(1000);
    });
  });

  describe('logRateLimitExceeded', () => {
    it('should log rate limit exceeded events', () => {
      logger.logRateLimitExceeded({
        clientId: 'client1',
        operation: 'search',
        retryAfterSeconds: 30,
      });

      const entry = mockHandler.mock.calls[0][0] as AuditEntry;

      expect(entry.eventType).toBe('rate_limit_exceeded');
      expect(entry.success).toBe(false);
      expect(entry.metadata?.retryAfterSeconds).toBe(30);
    });
  });

  describe('logDomainBlocked', () => {
    it('should log blocked domain attempts', () => {
      logger.logDomainBlocked({
        clientId: 'client1',
        url: 'https://malicious.com/attack',
        reason: 'Domain not in allowlist',
      });

      const entry = mockHandler.mock.calls[0][0] as AuditEntry;

      expect(entry.eventType).toBe('domain_blocked');
      expect(entry.success).toBe(false);
      expect(entry.metadata?.blockedUrl).toBe('https://malicious.com/attack');
    });
  });

  describe('logCacheHit/Miss', () => {
    it('should log cache hits', () => {
      logger.logCacheHit({
        key: 'search:test',
        provider: 'saos',
      });

      const entry = mockHandler.mock.calls[0][0] as AuditEntry;

      expect(entry.eventType).toBe('cache_hit');
      expect(entry.success).toBe(true);
    });

    it('should log cache misses', () => {
      logger.logCacheMiss({
        key: 'search:test',
        provider: 'saos',
      });

      const entry = mockHandler.mock.calls[0][0] as AuditEntry;

      expect(entry.eventType).toBe('cache_miss');
      expect(entry.success).toBe(true);
    });
  });

  describe('logError', () => {
    it('should log errors', () => {
      const error = new Error('Something went wrong');
      error.name = 'CustomError';

      logger.logError({
        clientId: 'client1',
        provider: 'saos',
        operation: 'search',
        error,
      });

      const entry = mockHandler.mock.calls[0][0] as AuditEntry;

      expect(entry.eventType).toBe('error');
      expect(entry.success).toBe(false);
      expect(entry.errorMessage).toBe('Something went wrong');
      expect(entry.metadata?.errorName).toBe('CustomError');
    });
  });

  describe('logHealthCheck', () => {
    it('should log health checks', () => {
      logger.logHealthCheck({
        provider: 'saos',
        healthy: true,
        latencyMs: 50,
      });

      const entry = mockHandler.mock.calls[0][0] as AuditEntry;

      expect(entry.eventType).toBe('health_check');
      expect(entry.success).toBe(true);
      expect(entry.latencyMs).toBe(50);
    });

    it('should log unhealthy status', () => {
      logger.logHealthCheck({
        provider: 'uzp',
        healthy: false,
        latencyMs: 5000,
      });

      const entry = mockHandler.mock.calls[0][0] as AuditEntry;

      expect(entry.success).toBe(false);
    });
  });

  describe('getRecentEntries', () => {
    it('should return recent entries', () => {
      logger.logSearch({
        provider: 'saos',
        resultCount: 1,
        latencyMs: 100,
        cached: false,
      });
      logger.logSearch({
        provider: 'saos',
        resultCount: 2,
        latencyMs: 100,
        cached: false,
      });

      const entries = logger.getRecentEntries();

      expect(entries).toHaveLength(2);
    });

    it('should limit entries returned', () => {
      for (let i = 0; i < 10; i++) {
        logger.logSearch({
          provider: 'saos',
          resultCount: i,
          latencyMs: 100,
          cached: false,
        });
      }

      const entries = logger.getRecentEntries(5);

      expect(entries).toHaveLength(5);
    });
  });

  describe('getEntriesByType', () => {
    it('should filter entries by type', () => {
      logger.logSearch({
        provider: 'saos',
        resultCount: 1,
        latencyMs: 100,
        cached: false,
      });
      logger.logJudgmentAccess({
        provider: 'uzp',
        resourceId: 'test',
        latencyMs: 100,
        cached: false,
      });
      logger.logSearch({
        provider: 'saos',
        resultCount: 2,
        latencyMs: 100,
        cached: false,
      });

      const searchEntries = logger.getEntriesByType('search');
      const judgmentEntries = logger.getEntriesByType('judgment_access');

      expect(searchEntries).toHaveLength(2);
      expect(judgmentEntries).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return entry counts by type', () => {
      logger.logSearch({
        provider: 'saos',
        resultCount: 1,
        latencyMs: 100,
        cached: false,
      });
      logger.logSearch({
        provider: 'saos',
        resultCount: 2,
        latencyMs: 100,
        cached: false,
      });
      logger.logError({
        operation: 'test',
        error: new Error('test'),
      });

      const stats = logger.getStats();

      expect(stats.search).toBe(2);
      expect(stats.error).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      logger.logSearch({
        provider: 'saos',
        resultCount: 1,
        latencyMs: 100,
        cached: false,
      });

      logger.clear();

      expect(logger.getRecentEntries()).toHaveLength(0);
    });
  });
});

describe('createAuditLogger', () => {
  it('should create logger with default config', () => {
    const logger = createAuditLogger();

    expect(logger).toBeInstanceOf(AuditLogger);
  });

  it('should create logger with custom config', () => {
    const handler = vi.fn();
    const logger = createAuditLogger({
      handler,
      consoleOutput: false,
    });

    logger.logSearch({
      provider: 'saos',
      resultCount: 1,
      latencyMs: 100,
      cached: false,
    });

    expect(handler).toHaveBeenCalled();
  });
});
