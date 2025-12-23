/**
 * Redis cache implementation
 * Optional - requires REDIS_URL environment variable
 */

import type { Cache, CacheConfig, CacheStats } from './types.js';

// Dynamically import ioredis only when needed
type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: string, ttl: number): Promise<unknown>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  flushdb(): Promise<string>;
  dbsize(): Promise<number>;
  quit(): Promise<string>;
};

/**
 * Redis cache with TTL support
 */
export class RedisCache implements Cache {
  private client: RedisClient | null = null;
  private readonly config: Required<CacheConfig>;
  private hits = 0;
  private misses = 0;
  private connected = false;

  constructor(
    private readonly redisUrl: string,
    config: CacheConfig = { defaultTtlMs: 60000 }
  ) {
    this.config = {
      defaultTtlMs: config.defaultTtlMs,
      maxEntries: config.maxEntries ?? 100000,
      keyPrefix: config.keyPrefix ?? 'kio',
    };
  }

  /**
   * Lazy connect to Redis
   */
  private async ensureConnected(): Promise<RedisClient> {
    if (this.client && this.connected) {
      return this.client;
    }

    // Dynamic import to avoid loading ioredis if not using Redis
    const { Redis } = await import('ioredis');
    this.client = new Redis(this.redisUrl) as unknown as RedisClient;
    this.connected = true;

    return this.client;
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const client = await this.ensureConnected();
      const fullKey = this.buildKey(key);
      const data = await client.get(fullKey);

      if (!data) {
        this.misses++;
        return undefined;
      }

      this.hits++;
      return JSON.parse(data) as T;
    } catch {
      this.misses++;
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      const client = await this.ensureConnected();
      const fullKey = this.buildKey(key);
      const ttl = ttlMs ?? this.config.defaultTtlMs;
      const ttlSeconds = Math.ceil(ttl / 1000);

      await client.set(fullKey, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Silently fail - cache is optional
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const client = await this.ensureConnected();
      const fullKey = this.buildKey(key);
      const result = await client.del(fullKey);
      return result > 0;
    } catch {
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const client = await this.ensureConnected();
      const fullKey = this.buildKey(key);
      const exists = await client.exists(fullKey);
      return exists > 0;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const client = await this.ensureConnected();
      await client.flushdb();
      this.hits = 0;
      this.misses = 0;
    } catch {
      // Silently fail
    }
  }

  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: 0, // Redis doesn't expose size easily
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  async close(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }
}

/**
 * Create a Redis cache instance
 * @param redisUrl Redis connection URL
 * @param config Cache configuration
 */
export function createRedisCache(
  redisUrl: string,
  config?: CacheConfig
): RedisCache {
  return new RedisCache(redisUrl, config);
}

/**
 * Check if Redis URL is configured
 */
export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}
