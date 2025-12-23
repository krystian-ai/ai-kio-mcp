/**
 * Common Zod schemas shared across tools
 */

import { z } from 'zod';

/**
 * Provider type
 */
export const ProviderSchema = z.enum(['saos', 'uzp']);
export type Provider = z.infer<typeof ProviderSchema>;

/**
 * Provider preference for search/retrieval
 */
export const ProviderPreferenceSchema = z.enum(['saos', 'uzp', 'auto']);
export type ProviderPreference = z.infer<typeof ProviderPreferenceSchema>;

/**
 * Judgment type
 */
export const JudgmentTypeSchema = z.enum(['SENTENCE', 'DECISION', 'RESOLUTION']);
export type JudgmentType = z.infer<typeof JudgmentTypeSchema>;

/**
 * Format preference for content
 */
export const FormatPreferenceSchema = z.enum(['text', 'html', 'auto']);
export type FormatPreference = z.infer<typeof FormatPreferenceSchema>;

/**
 * Date string in YYYY-MM-DD format
 */
export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .optional();

/**
 * Case number pattern (KIO format)
 */
export const CaseNumberSchema = z
  .string()
  .regex(/^KIO\s*\d+\/\d{2,4}$/i, 'Case number must be in format KIO 123/23 or KIO 123/2023')
  .optional();

/**
 * Pagination limit
 */
export const LimitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20);

/**
 * Page number
 */
export const PageSchema = z
  .number()
  .int()
  .min(1)
  .default(1);

/**
 * Character limit for content
 */
export const MaxCharsSchema = z
  .number()
  .int()
  .min(1000)
  .max(100000)
  .default(40000);

/**
 * Character offset for pagination
 */
export const OffsetCharsSchema = z
  .number()
  .int()
  .min(0)
  .default(0);

/**
 * Continuation info for paginated content
 */
export const ContinuationInfoSchema = z.object({
  truncated: z.boolean(),
  nextOffsetChars: z.number().optional(),
  totalChars: z.number().optional(),
});

/**
 * Source links schema
 */
export const SourceLinksSchema = z.object({
  saosHref: z.string().url().optional(),
  saosSourceUrl: z.string().url().optional(),
  uzpHtml: z.string().url().optional(),
  uzpPdf: z.string().url().optional(),
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  retryable: z.boolean(),
  retryAfterMs: z.number().optional(),
});
