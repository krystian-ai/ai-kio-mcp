import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, ConfigError } from '../../../src/config/index.js';
import { defaults } from '../../../src/config/defaults.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    // Clear all MCP_KIO_ prefixed variables
    Object.keys(process.env)
      .filter((key) => key.startsWith('MCP_KIO_'))
      .forEach((key) => {
        delete process.env[key];
      });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('default values', () => {
    it('should return defaults when no environment variables are set', () => {
      const config = loadConfig();

      expect(config.serverName).toBe(defaults.serverName);
      expect(config.serverVersion).toBe(defaults.serverVersion);
      expect(config.logLevel).toBe(defaults.logLevel);
      expect(config.cacheType).toBe(defaults.cacheType);
      expect(config.searchCacheTtlMs).toBe(defaults.searchCacheTtlMs);
      expect(config.judgmentCacheTtlMs).toBe(defaults.judgmentCacheTtlMs);
      expect(config.searchRateLimitPerMinute).toBe(defaults.searchRateLimitPerMinute);
      expect(config.judgmentRateLimitPerMinute).toBe(defaults.judgmentRateLimitPerMinute);
      expect(config.saosBaseUrl).toBe(defaults.saosBaseUrl);
      expect(config.uzpBaseUrl).toBe(defaults.uzpBaseUrl);
      expect(config.requestTimeoutMs).toBe(defaults.requestTimeoutMs);
      expect(config.allowedDomains).toEqual(defaults.allowedDomains);
    });
  });

  describe('environment variable parsing', () => {
    it('should parse string values', () => {
      process.env['MCP_KIO_SERVER_NAME'] = 'custom-server';
      process.env['MCP_KIO_SERVER_VERSION'] = '2.0.0';

      const config = loadConfig();

      expect(config.serverName).toBe('custom-server');
      expect(config.serverVersion).toBe('2.0.0');
    });

    it('should parse integer values', () => {
      process.env['MCP_KIO_SEARCH_CACHE_TTL_MS'] = '60000';
      process.env['MCP_KIO_REQUEST_TIMEOUT_MS'] = '5000';
      process.env['MCP_KIO_SEARCH_RATE_LIMIT'] = '100';

      const config = loadConfig();

      expect(config.searchCacheTtlMs).toBe(60000);
      expect(config.requestTimeoutMs).toBe(5000);
      expect(config.searchRateLimitPerMinute).toBe(100);
    });

    it('should use default for invalid integer values', () => {
      process.env['MCP_KIO_SEARCH_CACHE_TTL_MS'] = 'not-a-number';

      const config = loadConfig();

      expect(config.searchCacheTtlMs).toBe(defaults.searchCacheTtlMs);
    });

    it('should parse log level', () => {
      process.env['MCP_KIO_LOG_LEVEL'] = 'debug';
      expect(loadConfig().logLevel).toBe('debug');

      process.env['MCP_KIO_LOG_LEVEL'] = 'DEBUG';
      expect(loadConfig().logLevel).toBe('debug');

      process.env['MCP_KIO_LOG_LEVEL'] = 'warn';
      expect(loadConfig().logLevel).toBe('warn');

      process.env['MCP_KIO_LOG_LEVEL'] = 'error';
      expect(loadConfig().logLevel).toBe('error');
    });

    it('should use default for invalid log level', () => {
      process.env['MCP_KIO_LOG_LEVEL'] = 'invalid';

      const config = loadConfig();

      expect(config.logLevel).toBe(defaults.logLevel);
    });

    it('should parse cache type', () => {
      process.env['MCP_KIO_CACHE_TYPE'] = 'memory';
      expect(loadConfig().cacheType).toBe('memory');

      process.env['MCP_KIO_CACHE_TYPE'] = 'MEMORY';
      expect(loadConfig().cacheType).toBe('memory');
    });

    it('should use default for invalid cache type', () => {
      process.env['MCP_KIO_CACHE_TYPE'] = 'invalid';

      const config = loadConfig();

      expect(config.cacheType).toBe(defaults.cacheType);
    });
  });

  describe('Redis configuration', () => {
    it('should require Redis URL when cache type is redis', () => {
      process.env['MCP_KIO_CACHE_TYPE'] = 'redis';
      // No MCP_KIO_REDIS_URL set

      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow('MCP_KIO_REDIS_URL must be set');
    });

    it('should accept Redis URL when cache type is redis', () => {
      process.env['MCP_KIO_CACHE_TYPE'] = 'redis';
      process.env['MCP_KIO_REDIS_URL'] = 'redis://localhost:6379';

      const config = loadConfig();

      expect(config.cacheType).toBe('redis');
      expect(config.redisUrl).toBe('redis://localhost:6379');
    });

    it('should not require Redis URL when cache type is memory', () => {
      process.env['MCP_KIO_CACHE_TYPE'] = 'memory';

      const config = loadConfig();

      expect(config.cacheType).toBe('memory');
      expect(config.redisUrl).toBeUndefined();
    });
  });

  describe('provider URLs', () => {
    it('should use default provider URLs', () => {
      const config = loadConfig();

      expect(config.saosBaseUrl).toBe('https://www.saos.org.pl');
      expect(config.uzpBaseUrl).toBe('https://orzeczenia.uzp.gov.pl');
    });

    it('should allow custom provider URLs', () => {
      process.env['MCP_KIO_SAOS_BASE_URL'] = 'https://custom-saos.example.com';
      process.env['MCP_KIO_UZP_BASE_URL'] = 'https://custom-uzp.example.com';

      const config = loadConfig();

      expect(config.saosBaseUrl).toBe('https://custom-saos.example.com');
      expect(config.uzpBaseUrl).toBe('https://custom-uzp.example.com');
    });
  });
});
