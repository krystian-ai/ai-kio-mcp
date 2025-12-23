/**
 * Rate limiter for API requests
 * Implements sliding window rate limiting
 */

import { RateLimitError } from '../utils/errors.js';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Rate limit entry tracking request timestamps
 */
interface RateLimitEntry {
  timestamps: number[];
}

/**
 * Predefined rate limits
 */
export const RateLimits = {
  /** Search: 60 requests per minute */
  SEARCH: { maxRequests: 60, windowMs: 60 * 1000 } as RateLimitConfig,
  /** Judgment retrieval: 20 requests per minute */
  JUDGMENT: { maxRequests: 20, windowMs: 60 * 1000 } as RateLimitConfig,
  /** Health check: 10 requests per minute */
  HEALTH: { maxRequests: 10, windowMs: 60 * 1000 } as RateLimitConfig,
} as const;

/**
 * Rate limiter with sliding window algorithm
 */
export class RateLimiter {
  private readonly entries: Map<string, RateLimitEntry>;
  private readonly config: RateLimitConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.entries = new Map();

    // Cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request is allowed and record it
   * @param clientId Unique client identifier
   * @returns true if allowed, throws RateLimitError if exceeded
   */
  checkLimit(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.entries.get(clientId);

    if (!entry) {
      entry = { timestamps: [] };
      this.entries.set(clientId, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (entry.timestamps.length >= this.config.maxRequests) {
      const retryAfterMs = entry.timestamps[0]! + this.config.windowMs - now;
      throw new RateLimitError(
        `Rate limit exceeded. Max ${this.config.maxRequests} requests per ${this.config.windowMs / 1000}s`,
        retryAfterMs
      );
    }

    // Record this request
    entry.timestamps.push(now);
    return true;
  }

  /**
   * Get remaining requests for a client
   */
  getRemainingRequests(clientId: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const entry = this.entries.get(clientId);

    if (!entry) {
      return this.config.maxRequests;
    }

    const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
    return Math.max(0, this.config.maxRequests - validTimestamps.length);
  }

  /**
   * Get time until rate limit resets (in seconds)
   */
  getResetTime(clientId: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const entry = this.entries.get(clientId);

    if (!entry || entry.timestamps.length === 0) {
      return 0;
    }

    const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
    if (validTimestamps.length === 0) {
      return 0;
    }

    const oldestTimestamp = Math.min(...validTimestamps);
    return Math.ceil((oldestTimestamp + this.config.windowMs - now) / 1000);
  }

  /**
   * Reset rate limit for a client
   */
  reset(clientId: string): void {
    this.entries.delete(clientId);
  }

  /**
   * Clear all rate limit entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [clientId, entry] of this.entries.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
      if (entry.timestamps.length === 0) {
        this.entries.delete(clientId);
      }
    }
  }

  /**
   * Close and cleanup
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.entries.clear();
  }
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Create rate limiters for all operation types
 */
export function createRateLimiters(): {
  search: RateLimiter;
  judgment: RateLimiter;
  health: RateLimiter;
} {
  return {
    search: new RateLimiter(RateLimits.SEARCH),
    judgment: new RateLimiter(RateLimits.JUDGMENT),
    health: new RateLimiter(RateLimits.HEALTH),
  };
}
