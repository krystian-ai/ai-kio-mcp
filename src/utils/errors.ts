/**
 * Custom error classes for mcp-kio
 */

/**
 * Base error class for mcp-kio errors
 */
export class KioError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly isRetryable: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'KioError';
    this.code = code;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isRetryable: this.isRetryable,
    };
  }
}

/**
 * Error thrown when a provider (SAOS/UZP) is unavailable or returns an error
 */
export class ProviderError extends KioError {
  readonly provider: string;

  constructor(
    message: string,
    provider: string,
    statusCode: number = 503,
    isRetryable: boolean = true
  ) {
    super(message, 'PROVIDER_ERROR', statusCode, isRetryable);
    this.name = 'ProviderError';
    this.provider = provider;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      provider: this.provider,
    };
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends KioError {
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfterMs: this.retryAfterMs,
    };
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends KioError {
  readonly field?: string;
  readonly details?: unknown;

  constructor(message: string, field?: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, false);
    this.name = 'ValidationError';
    this.field = field;
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
      details: this.details,
    };
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends KioError {
  readonly resourceType: string;
  readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`, 'NOT_FOUND', 404, false);
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }
}

/**
 * Error thrown when an HTTP request times out
 */
export class TimeoutError extends KioError {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message, 'TIMEOUT', 504, true);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs,
    };
  }
}

/**
 * Error thrown when a domain is not in the allowlist
 */
export class DomainNotAllowedError extends KioError {
  readonly domain: string;

  constructor(domain: string) {
    super(`Domain not allowed: ${domain}`, 'DOMAIN_NOT_ALLOWED', 403, false);
    this.name = 'DomainNotAllowedError';
    this.domain = domain;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      domain: this.domain,
    };
  }
}

/**
 * Type guard to check if an error is a KioError
 */
export function isKioError(error: unknown): error is KioError {
  return error instanceof KioError;
}

/**
 * Wrap an unknown error into a KioError
 */
export function wrapError(error: unknown, defaultMessage: string = 'An unexpected error occurred'): KioError {
  if (isKioError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new KioError(error.message, 'INTERNAL_ERROR', 500, false);
  }

  return new KioError(defaultMessage, 'INTERNAL_ERROR', 500, false);
}
