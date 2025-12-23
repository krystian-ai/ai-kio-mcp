/**
 * Health check tool Zod schemas
 */

import { z } from 'zod';
import { ProviderSchema } from './common.schema.js';

/**
 * Provider health status
 */
export const ProviderHealthStatusSchema = z.object({
  /** Provider name */
  provider: ProviderSchema,

  /** Whether provider is healthy */
  healthy: z.boolean(),

  /** Response time in ms */
  responseTimeMs: z.number().optional(),

  /** Error message if unhealthy */
  error: z.string().optional(),

  /** Last successful check timestamp */
  lastChecked: z.string().datetime(),
});

export type ProviderHealthStatus = z.infer<typeof ProviderHealthStatusSchema>;

/**
 * Health check input schema (no parameters required)
 */
export const KioHealthInputSchema = z.object({
  /** Optional: check specific provider only */
  provider: ProviderSchema.optional(),
});

export type KioHealthInput = z.infer<typeof KioHealthInputSchema>;

/**
 * Health check output schema
 */
export const KioHealthOutputSchema = z.object({
  /** Overall system health */
  healthy: z.boolean(),

  /** Individual provider statuses */
  providers: z.array(ProviderHealthStatusSchema),

  /** Cache status */
  cache: z.object({
    type: z.enum(['memory', 'redis']),
    healthy: z.boolean(),
    stats: z.object({
      hits: z.number(),
      misses: z.number(),
      size: z.number(),
    }).optional(),
  }),

  /** Server info */
  server: z.object({
    version: z.string(),
    uptime: z.number(),
    startedAt: z.string().datetime(),
  }),
});

export type KioHealthOutput = z.infer<typeof KioHealthOutputSchema>;
