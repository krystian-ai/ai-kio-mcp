/**
 * Tool types and shared interfaces
 */

import type { KioProvider, Provider } from '../providers/types.js';
import type { Cache } from '../cache/types.js';
import type { RateLimiter } from '../security/rate-limiter.js';
import type { AuditLogger } from '../security/audit-logger.js';

/**
 * Tool execution context
 * Contains shared resources for all tools
 */
export interface ToolContext {
  /** Provider instances by name */
  providers: Map<Provider, KioProvider>;

  /** Cache instance */
  cache: Cache;

  /** Rate limiters by operation type */
  rateLimiters: {
    search: RateLimiter;
    judgment: RateLimiter;
    health: RateLimiter;
  };

  /** Audit logger */
  auditLogger: AuditLogger;

  /** Server start time for uptime calculation */
  startedAt: Date;

  /** Server version */
  version: string;
}

/**
 * Tool execution result wrapper
 */
export interface ToolResult<T> {
  success: true;
  data: T;
  metadata: {
    queryTimeMs: number;
    cached: boolean;
  };
}

/**
 * Tool error result
 */
export interface ToolError {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
  };
}

/**
 * Union type for tool responses
 */
export type ToolResponse<T> = ToolResult<T> | ToolError;

/**
 * Create a successful tool result
 */
export function createToolResult<T>(
  data: T,
  queryTimeMs: number,
  cached: boolean
): ToolResult<T> {
  return {
    success: true,
    data,
    metadata: {
      queryTimeMs,
      cached,
    },
  };
}

/**
 * Create an error tool result
 */
export function createToolError(
  code: string,
  message: string,
  retryable: boolean,
  retryAfterMs?: number
): ToolError {
  return {
    success: false,
    error: {
      code,
      message,
      retryable,
      retryAfterMs,
    },
  };
}

/**
 * Get client ID from request headers or default
 */
export function getClientId(headers?: Record<string, string>): string {
  return headers?.['x-client-id'] ?? 'default';
}
