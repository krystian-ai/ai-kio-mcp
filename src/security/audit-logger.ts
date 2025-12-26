/**
 * Audit logger for security and compliance
 * Logs access patterns, errors, and security events
 */

import type { Provider } from '../providers/types.js';

/**
 * Audit event types
 */
export type AuditEventType =
  | 'search'
  | 'judgment_access'
  | 'rate_limit_exceeded'
  | 'domain_blocked'
  | 'cache_hit'
  | 'cache_miss'
  | 'error'
  | 'health_check';

/**
 * Audit log entry
 */
export interface AuditEntry {
  timestamp: string;
  eventType: AuditEventType;
  clientId?: string;
  provider?: Provider;
  resourceId?: string;
  query?: string;
  success: boolean;
  latencyMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  /** Enable logging to console */
  consoleOutput?: boolean;
  /** Minimum level to log */
  minLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Custom log handler */
  handler?: (entry: AuditEntry) => void;
  /** Include sensitive data (e.g., full queries) */
  includeSensitive?: boolean;
}

/**
 * Audit logger for tracking access and security events
 */
export class AuditLogger {
  private readonly config: Required<AuditLoggerConfig>;
  private readonly entries: AuditEntry[] = [];
  private readonly maxEntries = 10000;

  constructor(config: AuditLoggerConfig = {}) {
    this.config = {
      consoleOutput: config.consoleOutput ?? (process.env.NODE_ENV !== 'test'),
      minLevel: config.minLevel ?? 'info',
      handler: config.handler ?? this.defaultHandler.bind(this),
      includeSensitive: config.includeSensitive ?? false,
    };
  }

  /**
   * Default log handler - outputs to console
   */
  private defaultHandler(entry: AuditEntry): void {
    if (!this.config.consoleOutput) {
      return;
    }

    const level = entry.success ? 'info' : 'warn';
    const levelNum = { debug: 0, info: 1, warn: 2, error: 3 };

    if (levelNum[level] < levelNum[this.config.minLevel]) {
      return;
    }

    const logData = {
      ts: entry.timestamp,
      event: entry.eventType,
      client: entry.clientId,
      provider: entry.provider,
      resource: entry.resourceId,
      ok: entry.success,
      ms: entry.latencyMs,
      ...(entry.errorMessage && { error: entry.errorMessage }),
    };

    // Use stderr to avoid interfering with stdio MCP protocol
    console.error(JSON.stringify(logData));
  }

  /**
   * Create and log an audit entry
   */
  private log(entry: Omit<AuditEntry, 'timestamp'>): void {
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Store in memory (with rotation)
    this.entries.push(fullEntry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Call handler
    this.config.handler(fullEntry);
  }

  /**
   * Log a search operation
   */
  logSearch(params: {
    clientId?: string;
    provider: Provider;
    query?: string;
    resultCount: number;
    latencyMs: number;
    cached: boolean;
  }): void {
    this.log({
      eventType: 'search',
      clientId: params.clientId,
      provider: params.provider,
      query: this.config.includeSensitive ? params.query : undefined,
      success: true,
      latencyMs: params.latencyMs,
      metadata: {
        resultCount: params.resultCount,
        cached: params.cached,
      },
    });
  }

  /**
   * Log a judgment access
   */
  logJudgmentAccess(params: {
    clientId?: string;
    provider: Provider;
    resourceId: string;
    latencyMs: number;
    cached: boolean;
    offsetChars?: number;
  }): void {
    this.log({
      eventType: 'judgment_access',
      clientId: params.clientId,
      provider: params.provider,
      resourceId: params.resourceId,
      success: true,
      latencyMs: params.latencyMs,
      metadata: {
        cached: params.cached,
        offsetChars: params.offsetChars,
      },
    });
  }

  /**
   * Log a rate limit exceeded event
   */
  logRateLimitExceeded(params: {
    clientId: string;
    operation: string;
    retryAfterSeconds: number;
  }): void {
    this.log({
      eventType: 'rate_limit_exceeded',
      clientId: params.clientId,
      success: false,
      errorMessage: `Rate limit exceeded for ${params.operation}`,
      metadata: {
        operation: params.operation,
        retryAfterSeconds: params.retryAfterSeconds,
      },
    });
  }

  /**
   * Log a blocked domain access attempt
   */
  logDomainBlocked(params: {
    clientId?: string;
    url: string;
    reason: string;
  }): void {
    this.log({
      eventType: 'domain_blocked',
      clientId: params.clientId,
      success: false,
      errorMessage: params.reason,
      metadata: {
        blockedUrl: params.url,
      },
    });
  }

  /**
   * Log a cache hit
   */
  logCacheHit(params: {
    key: string;
    provider?: Provider;
  }): void {
    this.log({
      eventType: 'cache_hit',
      provider: params.provider,
      success: true,
      metadata: {
        cacheKey: params.key,
      },
    });
  }

  /**
   * Log a cache miss
   */
  logCacheMiss(params: {
    key: string;
    provider?: Provider;
  }): void {
    this.log({
      eventType: 'cache_miss',
      provider: params.provider,
      success: true,
      metadata: {
        cacheKey: params.key,
      },
    });
  }

  /**
   * Log an error
   */
  logError(params: {
    clientId?: string;
    provider?: Provider;
    operation: string;
    error: Error;
  }): void {
    this.log({
      eventType: 'error',
      clientId: params.clientId,
      provider: params.provider,
      success: false,
      errorMessage: params.error.message,
      metadata: {
        operation: params.operation,
        errorName: params.error.name,
      },
    });
  }

  /**
   * Log a health check
   */
  logHealthCheck(params: {
    provider: Provider;
    healthy: boolean;
    latencyMs: number;
  }): void {
    this.log({
      eventType: 'health_check',
      provider: params.provider,
      success: params.healthy,
      latencyMs: params.latencyMs,
    });
  }

  /**
   * Get recent audit entries
   */
  getRecentEntries(count = 100): AuditEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Get entries by type
   */
  getEntriesByType(eventType: AuditEventType, count = 100): AuditEntry[] {
    return this.entries
      .filter((e) => e.eventType === eventType)
      .slice(-count);
  }

  /**
   * Get entry count by type
   */
  getStats(): Record<AuditEventType, number> {
    const stats: Record<string, number> = {};

    for (const entry of this.entries) {
      stats[entry.eventType] = (stats[entry.eventType] ?? 0) + 1;
    }

    return stats as Record<AuditEventType, number>;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.length = 0;
  }
}

/**
 * Create an audit logger instance
 */
export function createAuditLogger(config?: AuditLoggerConfig): AuditLogger {
  return new AuditLogger(config);
}
