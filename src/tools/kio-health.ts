/**
 * KIO Health Check Tool
 * Returns health status of providers and cache
 */

import type { ToolContext, ToolResponse } from './types.js';
import { createToolResult, createToolError, getClientId } from './types.js';
import type { KioHealthOutput, ProviderHealthStatus } from '../schemas/index.js';
import { KioHealthInputSchema } from '../schemas/index.js';
import type { Provider, HealthStatus } from '../providers/types.js';
import { CacheTTL } from '../cache/types.js';
import { RateLimitError } from '../utils/errors.js';

/**
 * Convert provider health status to output schema format
 */
function mapHealthStatus(status: HealthStatus): ProviderHealthStatus {
  return {
    provider: status.provider,
    healthy: status.available,
    responseTimeMs: status.latencyMs,
    error: status.error,
    lastChecked: status.timestamp,
  };
}

/**
 * Execute KIO health check
 */
export async function executeKioHealth(
  input: unknown,
  context: ToolContext,
  headers?: Record<string, string>
): Promise<ToolResponse<KioHealthOutput>> {
  const startTime = Date.now();
  const clientId = getClientId(headers);

  // Validate input
  const parseResult = KioHealthInputSchema.safeParse(input);
  if (!parseResult.success) {
    return createToolError(
      'VALIDATION_ERROR',
      `Invalid input: ${parseResult.error.message}`,
      false
    );
  }

  const validatedInput = parseResult.data;

  // Check rate limit
  try {
    context.rateLimiters.health.checkLimit(clientId);
  } catch (error) {
    if (error instanceof RateLimitError) {
      context.auditLogger.logRateLimitExceeded({
        clientId,
        operation: 'health',
        retryAfterSeconds: Math.ceil(error.retryAfterMs / 1000),
      });
      return createToolError(
        'RATE_LIMIT_EXCEEDED',
        error.message,
        true,
        error.retryAfterMs
      );
    }
    throw error;
  }

  // Check cache for recent health status
  const cacheKey = `health:${validatedInput.provider ?? 'all'}`;

  try {
    const cachedResult = await context.cache.get<KioHealthOutput>(cacheKey);
    if (cachedResult) {
      return createToolResult(cachedResult, Date.now() - startTime, true);
    }
  } catch {
    // Cache errors are non-fatal
  }

  // Determine which providers to check
  const providersToCheck: Provider[] = validatedInput.provider
    ? [validatedInput.provider]
    : Array.from(context.providers.keys());

  // Execute health checks in parallel
  const healthResults: ProviderHealthStatus[] = [];

  const healthPromises = providersToCheck.map(async (providerName) => {
    const provider = context.providers.get(providerName);
    if (!provider) {
      return {
        provider: providerName,
        healthy: false,
        error: 'Provider not configured',
        lastChecked: new Date().toISOString(),
      } as ProviderHealthStatus;
    }

    try {
      const status = await provider.healthCheck();

      // Log health check
      context.auditLogger.logHealthCheck({
        provider: providerName,
        healthy: status.available,
        latencyMs: status.latencyMs ?? 0,
      });

      return mapHealthStatus(status);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Log failed health check
      context.auditLogger.logHealthCheck({
        provider: providerName,
        healthy: false,
        latencyMs: Date.now() - startTime,
      });

      return {
        provider: providerName,
        healthy: false,
        error: errorMessage,
        lastChecked: new Date().toISOString(),
      } as ProviderHealthStatus;
    }
  });

  const results = await Promise.all(healthPromises);
  healthResults.push(...results);

  // Determine overall health
  const allHealthy = healthResults.every((r) => r.healthy);

  // Get cache stats
  const cacheStats = context.cache.stats();
  const cacheHealthy = true; // Memory cache is always healthy

  // Determine cache type
  const cacheType =
    process.env.REDIS_URL ? 'redis' : 'memory';

  // Build output
  const output: KioHealthOutput = {
    healthy: allHealthy && cacheHealthy,
    providers: healthResults,
    cache: {
      type: cacheType,
      healthy: cacheHealthy,
      stats: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        size: cacheStats.size,
      },
    },
    server: {
      version: context.version,
      uptime: Math.floor((Date.now() - context.startedAt.getTime()) / 1000),
      startedAt: context.startedAt.toISOString(),
    },
  };

  // Cache result briefly
  try {
    await context.cache.set(cacheKey, output, CacheTTL.HEALTH);
  } catch {
    // Cache errors are non-fatal
  }

  return createToolResult(output, Date.now() - startTime, false);
}

/**
 * Tool definition for MCP registration
 */
export const kioHealthTool = {
  name: 'kio_health',
  description:
    'Check health status of KIO MCP server, providers, and cache.',
  inputSchema: KioHealthInputSchema,
  execute: executeKioHealth,
};
