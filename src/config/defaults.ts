/**
 * Default configuration values for mcp-kio server
 */

export const defaults = {
  // Server
  serverName: 'mcp-kio',
  serverVersion: '0.1.0',

  // Logging
  logLevel: 'info' as const,

  // Cache
  cacheType: 'memory' as const,
  searchCacheTtlMs: 15 * 60 * 1000, // 15 minutes
  judgmentCacheTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Rate limiting
  searchRateLimitPerMinute: 60,
  judgmentRateLimitPerMinute: 20,

  // Provider URLs
  saosBaseUrl: 'https://www.saos.org.pl',
  uzpBaseUrl: 'https://orzeczenia.uzp.gov.pl',

  // HTTP
  requestTimeoutMs: 30000,

  // Allowed domains (SSRF protection)
  allowedDomains: ['www.saos.org.pl', 'saos.org.pl', 'orzeczenia.uzp.gov.pl'],

  // HTTP Server
  httpPort: 3000,
  httpHost: '127.0.0.1',
} as const;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type CacheType = 'memory' | 'redis';
