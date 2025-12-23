/**
 * Content hashing utilities for audit logging
 * Uses native Node.js crypto module
 */

import { createHash } from 'node:crypto';

/**
 * Compute SHA-256 hash of content
 * Used for audit logging without storing actual content
 */
export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Compute a short hash (first 16 chars of SHA-256)
 * Useful for log entries where full hash is too verbose
 */
export function shortHash(content: string): string {
  return sha256(content).substring(0, 16);
}

/**
 * Generate a cache key from multiple parts
 * Creates a deterministic key from input parameters
 */
export function cacheKey(...parts: (string | number | boolean | undefined | null)[]): string {
  const normalized = parts
    .map((part) => {
      if (part === undefined || part === null) return '';
      return String(part);
    })
    .join(':');
  return sha256(normalized);
}

/**
 * Generate a unique request ID
 * Combines timestamp with random component for uniqueness
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}
