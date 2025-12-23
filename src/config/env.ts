/**
 * Environment variable parsing and configuration loading
 */

import { defaults, type LogLevel, type CacheType } from './defaults.js';

export interface KioConfig {
  // Server
  serverName: string;
  serverVersion: string;

  // Logging
  logLevel: LogLevel;

  // Cache
  cacheType: CacheType;
  redisUrl?: string;
  searchCacheTtlMs: number;
  judgmentCacheTtlMs: number;

  // Rate limiting
  searchRateLimitPerMinute: number;
  judgmentRateLimitPerMinute: number;

  // Provider URLs
  saosBaseUrl: string;
  uzpBaseUrl: string;

  // HTTP
  requestTimeoutMs: number;

  // Allowed domains
  allowedDomains: string[];

  // HTTP Server
  httpPort: number;
  httpHost: string;
}

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvLogLevel(key: string, defaultValue: LogLevel): LogLevel {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const normalized = value.toLowerCase();
  if (['debug', 'info', 'warn', 'error'].includes(normalized)) {
    return normalized as LogLevel;
  }
  return defaultValue;
}

function getEnvCacheType(key: string, defaultValue: CacheType): CacheType {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const normalized = value.toLowerCase();
  if (['memory', 'redis'].includes(normalized)) {
    return normalized as CacheType;
  }
  return defaultValue;
}

/**
 * Load configuration from environment variables with defaults
 */
export function loadConfig(): KioConfig {
  const cacheType = getEnvCacheType('MCP_KIO_CACHE_TYPE', defaults.cacheType);
  const redisUrl = process.env['MCP_KIO_REDIS_URL'];

  // Validate Redis URL is provided when cache type is redis
  if (cacheType === 'redis' && !redisUrl) {
    throw new ConfigError(
      'MCP_KIO_REDIS_URL must be set when MCP_KIO_CACHE_TYPE is "redis"'
    );
  }

  return {
    // Server
    serverName: getEnvString('MCP_KIO_SERVER_NAME', defaults.serverName),
    serverVersion: getEnvString('MCP_KIO_SERVER_VERSION', defaults.serverVersion),

    // Logging
    logLevel: getEnvLogLevel('MCP_KIO_LOG_LEVEL', defaults.logLevel),

    // Cache
    cacheType,
    redisUrl,
    searchCacheTtlMs: getEnvInt('MCP_KIO_SEARCH_CACHE_TTL_MS', defaults.searchCacheTtlMs),
    judgmentCacheTtlMs: getEnvInt('MCP_KIO_JUDGMENT_CACHE_TTL_MS', defaults.judgmentCacheTtlMs),

    // Rate limiting
    searchRateLimitPerMinute: getEnvInt(
      'MCP_KIO_SEARCH_RATE_LIMIT',
      defaults.searchRateLimitPerMinute
    ),
    judgmentRateLimitPerMinute: getEnvInt(
      'MCP_KIO_JUDGMENT_RATE_LIMIT',
      defaults.judgmentRateLimitPerMinute
    ),

    // Provider URLs
    saosBaseUrl: getEnvString('MCP_KIO_SAOS_BASE_URL', defaults.saosBaseUrl),
    uzpBaseUrl: getEnvString('MCP_KIO_UZP_BASE_URL', defaults.uzpBaseUrl),

    // HTTP
    requestTimeoutMs: getEnvInt('MCP_KIO_REQUEST_TIMEOUT_MS', defaults.requestTimeoutMs),

    // Allowed domains
    allowedDomains: [...defaults.allowedDomains],

    // HTTP Server
    httpPort: getEnvInt('MCP_KIO_HTTP_PORT', defaults.httpPort),
    httpHost: getEnvString('MCP_KIO_HTTP_HOST', defaults.httpHost),
  };
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
