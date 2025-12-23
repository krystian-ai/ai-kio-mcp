/**
 * Source links tool Zod schemas
 */

import { z } from 'zod';
import { ProviderSchema, SourceLinksSchema } from './common.schema.js';

/**
 * Source links retrieval input schema
 */
export const KioGetSourceLinksInputSchema = z.object({
  /** Provider to get links for */
  provider: ProviderSchema,

  /** Provider-specific judgment ID */
  provider_id: z.string().min(1),
});

export type KioGetSourceLinksInput = z.infer<typeof KioGetSourceLinksInputSchema>;

/**
 * Source links retrieval output schema
 */
export const KioGetSourceLinksOutputSchema = z.object({
  /** Provider that returned links */
  provider: ProviderSchema,

  /** Provider-specific ID */
  providerId: z.string(),

  /** Source links */
  links: SourceLinksSchema,

  /** Retrieval metadata */
  metadata: z.object({
    queryTimeMs: z.number(),
  }),
});

export type KioGetSourceLinksOutput = z.infer<typeof KioGetSourceLinksOutputSchema>;
