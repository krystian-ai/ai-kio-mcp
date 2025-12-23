import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryCache, createMemoryCache } from '../../../src/cache/memory-cache.js';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new MemoryCache({ defaultTtlMs: 1000 });
  });

  afterEach(async () => {
    await cache.close();
    vi.useRealTimers();
  });

  describe('get/set', () => {
    it('should store and retrieve values', async () => {
      await cache.set('key1', { data: 'value1' });
      const result = await cache.get<{ data: string }>('key1');

      expect(result).toEqual({ data: 'value1' });
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await cache.get('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should expire entries after TTL', async () => {
      await cache.set('key1', 'value1', 500);

      // Before expiration
      expect(await cache.get('key1')).toBe('value1');

      // After expiration
      vi.advanceTimersByTime(600);
      expect(await cache.get('key1')).toBeUndefined();
    });

    it('should use default TTL when not specified', async () => {
      await cache.set('key1', 'value1');

      vi.advanceTimersByTime(900);
      expect(await cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(200);
      expect(await cache.get('key1')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing keys', async () => {
      await cache.set('key1', 'value1');

      expect(await cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', async () => {
      expect(await cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', async () => {
      await cache.set('key1', 'value1', 500);

      vi.advanceTimersByTime(600);
      expect(await cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', async () => {
      await cache.set('key1', 'value1');

      const deleted = await cache.delete('key1');

      expect(deleted).toBe(true);
      expect(await cache.get('key1')).toBeUndefined();
    });

    it('should return false for non-existent keys', async () => {
      const deleted = await cache.delete('nonexistent');

      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.clear();

      expect(await cache.get('key1')).toBeUndefined();
      expect(await cache.get('key2')).toBeUndefined();
    });

    it('should reset stats', async () => {
      await cache.get('key1'); // miss
      await cache.set('key1', 'value1');
      await cache.get('key1'); // hit

      await cache.clear();

      const stats = cache.stats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('stats', () => {
    it('should track hits and misses', async () => {
      await cache.get('miss1');
      await cache.get('miss2');
      await cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.get('key1');

      const stats = cache.stats();

      expect(stats.misses).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track cache size', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = cache.stats();

      expect(stats.size).toBe(2);
    });
  });

  describe('key prefix', () => {
    it('should apply key prefix', async () => {
      const prefixedCache = new MemoryCache({
        defaultTtlMs: 1000,
        keyPrefix: 'test',
      });

      await prefixedCache.set('key1', 'value1');

      // Different cache without prefix shouldn't see it
      expect(await cache.get('key1')).toBeUndefined();
      expect(await prefixedCache.get('key1')).toBe('value1');

      await prefixedCache.close();
    });
  });

  describe('max entries', () => {
    it('should evict oldest entries when over capacity', async () => {
      const smallCache = new MemoryCache({
        defaultTtlMs: 10000,
        maxEntries: 3,
      });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');
      await smallCache.set('key4', 'value4'); // Should evict key1

      expect(await smallCache.get('key1')).toBeUndefined();
      expect(await smallCache.get('key2')).toBe('value2');
      expect(await smallCache.get('key4')).toBe('value4');

      await smallCache.close();
    });
  });
});

describe('createMemoryCache', () => {
  it('should create cache with default config', async () => {
    const cache = createMemoryCache();

    expect(cache).toBeInstanceOf(MemoryCache);
    await cache.close();
  });

  it('should create cache with custom config', async () => {
    const cache = createMemoryCache({
      defaultTtlMs: 5000,
      maxEntries: 100,
    });

    expect(cache).toBeInstanceOf(MemoryCache);
    await cache.close();
  });
});
