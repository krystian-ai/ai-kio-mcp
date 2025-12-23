import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RateLimiter,
  createRateLimiter,
  createRateLimiters,
  RateLimits,
} from '../../../src/security/rate-limiter.js';
import { RateLimitError } from '../../../src/utils/errors.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
  });

  afterEach(() => {
    limiter.close();
    vi.useRealTimers();
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(() => limiter.checkLimit('client1')).not.toThrow();
      }
    });

    it('should throw RateLimitError when limit exceeded', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('client1');
      }

      expect(() => limiter.checkLimit('client1')).toThrow(RateLimitError);
    });

    it('should track clients separately', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('client1');
      }

      // Client2 should still have their full limit
      expect(() => limiter.checkLimit('client2')).not.toThrow();
    });

    it('should reset after window expires', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('client1');
      }

      // Advance time past window
      vi.advanceTimersByTime(1100);

      // Should be able to make requests again
      expect(() => limiter.checkLimit('client1')).not.toThrow();
    });

    it('should include retry-after in error', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('client1');
      }

      try {
        limiter.checkLimit('client1');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfterMs).toBeGreaterThan(0);
      }
    });
  });

  describe('getRemainingRequests', () => {
    it('should return full limit for new clients', () => {
      expect(limiter.getRemainingRequests('newclient')).toBe(5);
    });

    it('should decrease as requests are made', () => {
      limiter.checkLimit('client1');
      limiter.checkLimit('client1');

      expect(limiter.getRemainingRequests('client1')).toBe(3);
    });

    it('should return 0 when exhausted', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('client1');
      }

      expect(limiter.getRemainingRequests('client1')).toBe(0);
    });

    it('should restore after window expires', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('client1');
      }

      vi.advanceTimersByTime(1100);

      expect(limiter.getRemainingRequests('client1')).toBe(5);
    });
  });

  describe('getResetTime', () => {
    it('should return 0 for new clients', () => {
      expect(limiter.getResetTime('newclient')).toBe(0);
    });

    it('should return time until window expires', () => {
      limiter.checkLimit('client1');

      const resetTime = limiter.getResetTime('client1');
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(1);
    });
  });

  describe('reset', () => {
    it('should clear rate limit for a client', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('client1');
      }

      limiter.reset('client1');

      expect(limiter.getRemainingRequests('client1')).toBe(5);
    });
  });

  describe('clear', () => {
    it('should clear all client entries', () => {
      limiter.checkLimit('client1');
      limiter.checkLimit('client2');

      limiter.clear();

      expect(limiter.getRemainingRequests('client1')).toBe(5);
      expect(limiter.getRemainingRequests('client2')).toBe(5);
    });
  });
});

describe('RateLimits', () => {
  it('should have search limit of 60/min', () => {
    expect(RateLimits.SEARCH.maxRequests).toBe(60);
    expect(RateLimits.SEARCH.windowMs).toBe(60000);
  });

  it('should have judgment limit of 20/min', () => {
    expect(RateLimits.JUDGMENT.maxRequests).toBe(20);
    expect(RateLimits.JUDGMENT.windowMs).toBe(60000);
  });

  it('should have health limit of 10/min', () => {
    expect(RateLimits.HEALTH.maxRequests).toBe(10);
    expect(RateLimits.HEALTH.windowMs).toBe(60000);
  });
});

describe('createRateLimiter', () => {
  it('should create limiter with custom config', () => {
    const limiter = createRateLimiter({ maxRequests: 10, windowMs: 5000 });

    for (let i = 0; i < 10; i++) {
      expect(() => limiter.checkLimit('test')).not.toThrow();
    }
    expect(() => limiter.checkLimit('test')).toThrow(RateLimitError);

    limiter.close();
  });
});

describe('createRateLimiters', () => {
  it('should create all operation type limiters', () => {
    const limiters = createRateLimiters();

    expect(limiters.search).toBeInstanceOf(RateLimiter);
    expect(limiters.judgment).toBeInstanceOf(RateLimiter);
    expect(limiters.health).toBeInstanceOf(RateLimiter);

    limiters.search.close();
    limiters.judgment.close();
    limiters.health.close();
  });
});
