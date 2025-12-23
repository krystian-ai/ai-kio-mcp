import { describe, it, expect } from 'vitest';
import {
  KioError,
  ProviderError,
  RateLimitError,
  ValidationError,
  NotFoundError,
  TimeoutError,
  DomainNotAllowedError,
  isKioError,
  wrapError,
} from '../../../src/utils/errors.js';

describe('KioError', () => {
  it('should create a base error with default values', () => {
    const error = new KioError('test message', 'TEST_ERROR');

    expect(error.message).toBe('test message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.isRetryable).toBe(false);
    expect(error.name).toBe('KioError');
  });

  it('should create a base error with custom values', () => {
    const error = new KioError('test message', 'TEST_ERROR', 400, true);

    expect(error.statusCode).toBe(400);
    expect(error.isRetryable).toBe(true);
  });

  it('should serialize to JSON', () => {
    const error = new KioError('test', 'TEST', 400, true);
    const json = error.toJSON();

    expect(json).toEqual({
      name: 'KioError',
      message: 'test',
      code: 'TEST',
      statusCode: 400,
      isRetryable: true,
    });
  });
});

describe('ProviderError', () => {
  it('should create a provider error', () => {
    const error = new ProviderError('SAOS unavailable', 'saos');

    expect(error.message).toBe('SAOS unavailable');
    expect(error.provider).toBe('saos');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.statusCode).toBe(503);
    expect(error.isRetryable).toBe(true);
    expect(error.name).toBe('ProviderError');
  });

  it('should serialize to JSON with provider', () => {
    const error = new ProviderError('UZP error', 'uzp', 500, false);
    const json = error.toJSON();

    expect(json).toEqual({
      name: 'ProviderError',
      message: 'UZP error',
      code: 'PROVIDER_ERROR',
      statusCode: 500,
      isRetryable: false,
      provider: 'uzp',
    });
  });
});

describe('RateLimitError', () => {
  it('should create a rate limit error', () => {
    const error = new RateLimitError('Too many requests', 60000);

    expect(error.message).toBe('Too many requests');
    expect(error.retryAfterMs).toBe(60000);
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.statusCode).toBe(429);
    expect(error.isRetryable).toBe(true);
    expect(error.name).toBe('RateLimitError');
  });

  it('should serialize to JSON with retryAfterMs', () => {
    const error = new RateLimitError('Limit exceeded', 30000);
    const json = error.toJSON();

    expect(json.retryAfterMs).toBe(30000);
  });
});

describe('ValidationError', () => {
  it('should create a validation error', () => {
    const error = new ValidationError('Invalid input', 'query', { min: 1 });

    expect(error.message).toBe('Invalid input');
    expect(error.field).toBe('query');
    expect(error.details).toEqual({ min: 1 });
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.isRetryable).toBe(false);
    expect(error.name).toBe('ValidationError');
  });

  it('should work without field and details', () => {
    const error = new ValidationError('Invalid');

    expect(error.field).toBeUndefined();
    expect(error.details).toBeUndefined();
  });
});

describe('NotFoundError', () => {
  it('should create a not found error', () => {
    const error = new NotFoundError('judgment', '12345');

    expect(error.message).toBe('judgment not found: 12345');
    expect(error.resourceType).toBe('judgment');
    expect(error.resourceId).toBe('12345');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.isRetryable).toBe(false);
    expect(error.name).toBe('NotFoundError');
  });
});

describe('TimeoutError', () => {
  it('should create a timeout error', () => {
    const error = new TimeoutError('Request timed out', 30000);

    expect(error.message).toBe('Request timed out');
    expect(error.timeoutMs).toBe(30000);
    expect(error.code).toBe('TIMEOUT');
    expect(error.statusCode).toBe(504);
    expect(error.isRetryable).toBe(true);
    expect(error.name).toBe('TimeoutError');
  });
});

describe('DomainNotAllowedError', () => {
  it('should create a domain not allowed error', () => {
    const error = new DomainNotAllowedError('evil.com');

    expect(error.message).toBe('Domain not allowed: evil.com');
    expect(error.domain).toBe('evil.com');
    expect(error.code).toBe('DOMAIN_NOT_ALLOWED');
    expect(error.statusCode).toBe(403);
    expect(error.isRetryable).toBe(false);
    expect(error.name).toBe('DomainNotAllowedError');
  });
});

describe('isKioError', () => {
  it('should return true for KioError instances', () => {
    expect(isKioError(new KioError('test', 'TEST'))).toBe(true);
    expect(isKioError(new ProviderError('test', 'saos'))).toBe(true);
    expect(isKioError(new RateLimitError('test', 1000))).toBe(true);
    expect(isKioError(new ValidationError('test'))).toBe(true);
    expect(isKioError(new NotFoundError('type', 'id'))).toBe(true);
    expect(isKioError(new TimeoutError('test', 1000))).toBe(true);
    expect(isKioError(new DomainNotAllowedError('test.com'))).toBe(true);
  });

  it('should return false for non-KioError values', () => {
    expect(isKioError(new Error('test'))).toBe(false);
    expect(isKioError('string')).toBe(false);
    expect(isKioError(null)).toBe(false);
    expect(isKioError(undefined)).toBe(false);
    expect(isKioError({})).toBe(false);
  });
});

describe('wrapError', () => {
  it('should return KioError as-is', () => {
    const original = new ProviderError('test', 'saos');
    const wrapped = wrapError(original);

    expect(wrapped).toBe(original);
  });

  it('should wrap standard Error', () => {
    const original = new Error('Something went wrong');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(KioError);
    expect(wrapped.message).toBe('Something went wrong');
    expect(wrapped.code).toBe('INTERNAL_ERROR');
  });

  it('should wrap unknown values', () => {
    const wrapped = wrapError('string error');

    expect(wrapped).toBeInstanceOf(KioError);
    expect(wrapped.message).toBe('An unexpected error occurred');
    expect(wrapped.code).toBe('INTERNAL_ERROR');
  });

  it('should use custom default message', () => {
    const wrapped = wrapError(null, 'Custom message');

    expect(wrapped.message).toBe('Custom message');
  });
});
