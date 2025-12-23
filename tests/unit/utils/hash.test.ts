import { describe, it, expect } from 'vitest';
import { sha256, shortHash, cacheKey, generateRequestId } from '../../../src/utils/hash.js';

describe('sha256', () => {
  it('should compute consistent hash for same content', () => {
    const content = 'test content';
    const hash1 = sha256(content);
    const hash2 = sha256(content);

    expect(hash1).toBe(hash2);
  });

  it('should compute different hashes for different content', () => {
    const hash1 = sha256('content1');
    const hash2 = sha256('content2');

    expect(hash1).not.toBe(hash2);
  });

  it('should return 64 character hex string', () => {
    const hash = sha256('test');

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('should handle empty string', () => {
    const hash = sha256('');

    expect(hash).toHaveLength(64);
    // Known SHA-256 hash of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('should handle unicode content', () => {
    const hash = sha256('Krajowa Izba Odwoławcza - orzeczenie');

    expect(hash).toHaveLength(64);
  });
});

describe('shortHash', () => {
  it('should return first 16 characters of SHA-256', () => {
    const content = 'test content';
    const full = sha256(content);
    const short = shortHash(content);

    expect(short).toHaveLength(16);
    expect(full.startsWith(short)).toBe(true);
  });

  it('should be consistent', () => {
    const hash1 = shortHash('test');
    const hash2 = shortHash('test');

    expect(hash1).toBe(hash2);
  });
});

describe('cacheKey', () => {
  it('should create consistent key from parts', () => {
    const key1 = cacheKey('search', 'query', 10);
    const key2 = cacheKey('search', 'query', 10);

    expect(key1).toBe(key2);
  });

  it('should create different keys for different parts', () => {
    const key1 = cacheKey('search', 'query1');
    const key2 = cacheKey('search', 'query2');

    expect(key1).not.toBe(key2);
  });

  it('should handle undefined and null values', () => {
    const key1 = cacheKey('search', undefined, null);
    const key2 = cacheKey('search', undefined, null);

    expect(key1).toBe(key2);
  });

  it('should treat undefined/null as empty strings', () => {
    const key1 = cacheKey('a', undefined, 'b');
    const key2 = cacheKey('a', '', 'b');

    expect(key1).toBe(key2);
  });

  it('should handle boolean values', () => {
    const key1 = cacheKey('search', true);
    const key2 = cacheKey('search', false);

    expect(key1).not.toBe(key2);
  });

  it('should return SHA-256 hash', () => {
    const key = cacheKey('test');

    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });
});

describe('generateRequestId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();

    expect(id1).not.toBe(id2);
  });

  it('should generate IDs with expected format', () => {
    const id = generateRequestId();

    // Format: timestamp-random (base36)
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });

  it('should generate IDs of reasonable length', () => {
    const id = generateRequestId();

    // Timestamp in base36 + dash + 8 random chars
    expect(id.length).toBeGreaterThan(10);
    expect(id.length).toBeLessThan(30);
  });

  it('should generate many unique IDs quickly', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateRequestId());
    }

    expect(ids.size).toBe(1000);
  });
});
