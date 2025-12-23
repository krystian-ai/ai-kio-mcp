/**
 * Search tool Zod schemas
 */

import { z } from 'zod';
import {
  ProviderPreferenceSchema,
  JudgmentTypeSchema,
  DateStringSchema,
  CaseNumberSchema,
  LimitSchema,
  PageSchema,
} from './common.schema.js';

/**
 * Search input schema
 */
export const KioSearchInputSchema = z
  .object({
    /** Full-text search query */
    query: z.string().min(1).max(500).optional(),

    /** Specific case number to search for */
    case_number: CaseNumberSchema,

    /** Filter by start date (YYYY-MM-DD) */
    date_from: DateStringSchema,

    /** Filter by end date (YYYY-MM-DD) */
    date_to: DateStringSchema,

    /** Filter by judgment type */
    judgment_type: JudgmentTypeSchema.optional(),

    /** Maximum results per page */
    limit: LimitSchema,

    /** Page number (1-based) */
    page: PageSchema,

    /** Provider preference */
    provider: ProviderPreferenceSchema.default('auto'),

    /** Include text snippets in results */
    include_snippets: z.boolean().default(true),
  })
  .refine((data) => data.query || data.case_number, {
    message: 'Either query or case_number must be provided',
  });

export type KioSearchInput = z.infer<typeof KioSearchInputSchema>;

/**
 * Search result item schema
 */
export const SearchResultItemSchema = z.object({
  /** Unique identifier for the judgment */
  id: z.string(),

  /** Provider that returned this result */
  provider: z.enum(['saos', 'uzp']),

  /** Case numbers */
  caseNumbers: z.array(z.string()),

  /** Judgment date */
  judgmentDate: z.string(),

  /** Type of judgment */
  judgmentType: JudgmentTypeSchema,

  /** Court name */
  courtName: z.string().optional(),

  /** Decision summary */
  decision: z.string().optional(),

  /** Text snippet with search term highlighted */
  snippet: z.string().optional(),

  /** Relevance score (0-1) */
  relevanceScore: z.number().min(0).max(1).optional(),
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

/**
 * Search output schema
 */
export const KioSearchOutputSchema = z.object({
  /** Search results */
  results: z.array(SearchResultItemSchema),

  /** Pagination info */
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number().optional(),
    hasMore: z.boolean(),
  }),

  /** Search metadata */
  metadata: z.object({
    provider: z.enum(['saos', 'uzp']),
    queryTimeMs: z.number(),
    cached: z.boolean(),
  }),
});

export type KioSearchOutput = z.infer<typeof KioSearchOutputSchema>;
