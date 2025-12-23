/**
 * Judgment retrieval tool Zod schemas
 */

import { z } from 'zod';
import {
  ProviderSchema,
  JudgmentTypeSchema,
  FormatPreferenceSchema,
  MaxCharsSchema,
  OffsetCharsSchema,
  ContinuationInfoSchema,
  SourceLinksSchema,
} from './common.schema.js';

/**
 * Judgment retrieval input schema
 */
export const KioGetJudgmentInputSchema = z.object({
  /** Provider to fetch from */
  provider: ProviderSchema,

  /** Provider-specific judgment ID */
  provider_id: z.string().min(1),

  /** Preferred content format */
  format_preference: FormatPreferenceSchema.default('text'),

  /** Maximum characters to return */
  max_chars: MaxCharsSchema,

  /** Character offset for pagination */
  offset_chars: OffsetCharsSchema,
});

export type KioGetJudgmentInput = z.infer<typeof KioGetJudgmentInputSchema>;

/**
 * Judgment metadata schema
 */
export const JudgmentMetadataSchema = z.object({
  /** Case numbers */
  caseNumbers: z.array(z.string()),

  /** Judgment date (YYYY-MM-DD) */
  judgmentDate: z.string(),

  /** Type of judgment */
  judgmentType: JudgmentTypeSchema,

  /** Decision summary */
  decision: z.string().optional(),

  /** Legal bases referenced */
  legalBases: z.array(z.string()),

  /** Judges */
  judges: z.array(z.string()),

  /** Keywords */
  keywords: z.array(z.string()),

  /** Court name */
  courtName: z.string().optional(),
});

export type JudgmentMetadata = z.infer<typeof JudgmentMetadataSchema>;

/**
 * Judgment content schema
 */
export const JudgmentContentSchema = z.object({
  /** Text content (possibly truncated) */
  text: z.string(),

  /** HTML URL if available */
  htmlUrl: z.string().url().optional(),

  /** PDF URL if available */
  pdfUrl: z.string().url().optional(),
});

export type JudgmentContent = z.infer<typeof JudgmentContentSchema>;

/**
 * Judgment retrieval output schema
 */
export const KioGetJudgmentOutputSchema = z.object({
  /** Judgment metadata */
  metadata: JudgmentMetadataSchema,

  /** Judgment content */
  content: JudgmentContentSchema,

  /** Continuation info for pagination */
  continuation: ContinuationInfoSchema,

  /** Source links for citations */
  sourceLinks: SourceLinksSchema,

  /** Retrieval metadata */
  retrievalMetadata: z.object({
    provider: ProviderSchema,
    providerId: z.string(),
    queryTimeMs: z.number(),
    cached: z.boolean(),
  }),
});

export type KioGetJudgmentOutput = z.infer<typeof KioGetJudgmentOutputSchema>;
