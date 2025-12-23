/**
 * Cache module exports
 */

export * from './types.js';
export { MemoryCache, createMemoryCache } from './memory-cache.js';
export { RedisCache, createRedisCache, isRedisConfigured } from './redis-cache.js';

import type { Cache, CacheConfig } from './types.js';
import { createMemoryCache } from './memory-cache.js';
import { createRedisCache, isRedisConfigured } from './redis-cache.js';

/**
 * Create appropriate cache based on environment
 * Uses Redis if REDIS_URL is set, otherwise falls back to memory cache
 */
export function createCache(config?: CacheConfig): Cache {
  if (isRedisConfigured()) {
    const redisUrl = process.env.REDIS_URL!;
    return createRedisCache(redisUrl, config);
  }

  return createMemoryCache(config);
}
