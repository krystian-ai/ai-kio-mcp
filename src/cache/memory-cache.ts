/**
 * In-memory cache implementation with TTL support
 */

import type { Cache, CacheEntry, CacheConfig, CacheStats } from './types.js';

/**
 * Memory cache with automatic expiration
 */
export class MemoryCache implements Cache {
  private readonly cache: Map<string, CacheEntry<unknown>>;
  private readonly config: Required<CacheConfig>;
  private hits = 0;
  private misses = 0;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: CacheConfig = { defaultTtlMs: 60000 }) {
    this.cache = new Map();
    this.config = {
      defaultTtlMs: config.defaultTtlMs,
      maxEntries: config.maxEntries ?? 10000,
      keyPrefix: config.keyPrefix ?? '',
    };

    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Evict oldest entries if over capacity
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.config.maxEntries) {
      return;
    }

    // Evict oldest entries (first in map = oldest)
    const toEvict = this.cache.size - this.config.maxEntries;
    const keys = Array.from(this.cache.keys()).slice(0, toEvict);

    for (const key of keys) {
      this.cache.delete(key);
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const fullKey = this.buildKey(key);
    const entry = this.cache.get(fullKey) as CacheEntry<T> | undefined;

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(fullKey);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttl = ttlMs ?? this.config.defaultTtlMs;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttl,
      createdAt: now,
    };

    this.cache.set(fullKey, entry);
    this.evictIfNeeded();
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    return this.cache.delete(fullKey);
  }

  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(fullKey);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/**
 * Create a memory cache instance
 */
export function createMemoryCache(config?: CacheConfig): MemoryCache {
  return new MemoryCache(config);
}
