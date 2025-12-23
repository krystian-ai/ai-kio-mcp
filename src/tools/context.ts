/**
 * Tool context factory and initialization
 */

import type { ToolContext } from './types.js';
import type { Provider, KioProvider } from '../providers/types.js';
import { createSaosProvider } from '../providers/saos/index.js';
import { createUzpProvider } from '../providers/uzp/index.js';
import { createCache } from '../cache/index.js';
import { createRateLimiters } from '../security/rate-limiter.js';
import { createAuditLogger } from '../security/audit-logger.js';

/**
 * Tool context configuration
 */
export interface ToolContextConfig {
  /** Server version */
  version?: string;
}

/**
 * Create a tool context with all dependencies initialized
 */
export function createToolContext(config: ToolContextConfig = {}): ToolContext {
  const providers = new Map<Provider, KioProvider>();

  // Initialize providers
  providers.set('saos', createSaosProvider());
  providers.set('uzp', createUzpProvider());

  // Initialize cache
  const cache = createCache();

  // Initialize rate limiters
  const rateLimiters = createRateLimiters();

  // Initialize audit logger
  const auditLogger = createAuditLogger();

  return {
    providers,
    cache,
    rateLimiters,
    auditLogger,
    startedAt: new Date(),
    version: config.version ?? '1.0.0',
  };
}

/**
 * Close all context resources
 */
export async function closeToolContext(context: ToolContext): Promise<void> {
  // Close cache
  await context.cache.close();

  // Close rate limiters
  context.rateLimiters.search.close();
  context.rateLimiters.judgment.close();
  context.rateLimiters.health.close();
}
