/**
 * Cache layer types and interfaces
 */

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix timestamp in ms
  createdAt: number;
}

/**
 * Cache interface for storage backends
 */
export interface Cache {
  /**
   * Get a value from cache
   * @returns The cached value or undefined if not found/expired
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Set a value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlMs Time-to-live in milliseconds
   */
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;

  /**
   * Delete a value from cache
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): Promise<boolean>;

  /**
   * Clear all entries from cache
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   */
  stats(): CacheStats;

  /**
   * Close cache connections (for Redis)
   */
  close(): Promise<void>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTtlMs: number;
  /** Maximum entries (for memory cache) */
  maxEntries?: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;
}

/**
 * TTL constants for different content types
 */
export const CacheTTL = {
  /** Search results: 15 minutes */
  SEARCH: 15 * 60 * 1000,
  /** Judgment content: 7 days */
  JUDGMENT: 7 * 24 * 60 * 60 * 1000,
  /** Health check: 1 minute */
  HEALTH: 60 * 1000,
} as const;
