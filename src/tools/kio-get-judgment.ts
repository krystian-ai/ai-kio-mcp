/**
 * KIO Get Judgment Tool
 * Retrieves full judgment content with pagination support
 */

import type { ToolContext, ToolResponse } from './types.js';
import { createToolResult, createToolError, getClientId } from './types.js';
import type { KioGetJudgmentInput, KioGetJudgmentOutput } from '../schemas/index.js';
import { KioGetJudgmentInputSchema } from '../schemas/index.js';
import type { JudgmentParams, FormatPreference } from '../providers/types.js';
import { CacheTTL } from '../cache/types.js';
import { RateLimitError, ProviderError, ValidationError } from '../utils/errors.js';

/**
 * Generate cache key for judgment request
 */
function generateCacheKey(input: KioGetJudgmentInput): string {
  const parts = [
    'judgment',
    input.provider,
    input.provider_id,
    input.format_preference,
    String(input.max_chars),
    String(input.offset_chars),
  ];
  return parts.join(':');
}

/**
 * Map format preference from schema to provider type
 */
function mapFormatPreference(
  preference: 'text' | 'html' | 'auto'
): FormatPreference {
  if (preference === 'auto') {
    return 'text'; // Default to text for LLM consumption
  }
  return preference;
}

/**
 * Execute KIO get judgment
 */
export async function executeKioGetJudgment(
  input: unknown,
  context: ToolContext,
  headers?: Record<string, string>
): Promise<ToolResponse<KioGetJudgmentOutput>> {
  const startTime = Date.now();
  const clientId = getClientId(headers);

  // Validate input
  const parseResult = KioGetJudgmentInputSchema.safeParse(input);
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
    context.rateLimiters.judgment.checkLimit(clientId);
  } catch (error) {
    if (error instanceof RateLimitError) {
      context.auditLogger.logRateLimitExceeded({
        clientId,
        operation: 'judgment',
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

  // Get provider instance
  const providerInstance = context.providers.get(validatedInput.provider);

  if (!providerInstance) {
    return createToolError(
      'PROVIDER_NOT_FOUND',
      `Provider ${validatedInput.provider} not available`,
      false
    );
  }

  // Check cache
  const cacheKey = generateCacheKey(validatedInput);
  let cached = false;

  try {
    const cachedResult = await context.cache.get<KioGetJudgmentOutput>(cacheKey);
    if (cachedResult) {
      context.auditLogger.logCacheHit({
        key: cacheKey,
        provider: validatedInput.provider,
      });
      context.auditLogger.logJudgmentAccess({
        clientId,
        provider: validatedInput.provider,
        resourceId: validatedInput.provider_id,
        latencyMs: Date.now() - startTime,
        cached: true,
        offsetChars: validatedInput.offset_chars,
      });
      return createToolResult(cachedResult, Date.now() - startTime, true);
    }
    context.auditLogger.logCacheMiss({
      key: cacheKey,
      provider: validatedInput.provider,
    });
  } catch {
    // Cache errors are non-fatal
  }

  // Build judgment params
  const judgmentParams: JudgmentParams = {
    providerId: validatedInput.provider_id,
    formatPreference: mapFormatPreference(validatedInput.format_preference),
    maxChars: validatedInput.max_chars,
    offsetChars: validatedInput.offset_chars,
  };

  // Execute judgment retrieval
  try {
    const response = await providerInstance.getJudgment(judgmentParams);

    // Build output
    const output: KioGetJudgmentOutput = {
      metadata: {
        caseNumbers: response.metadata.caseNumbers,
        judgmentDate: response.metadata.judgmentDate,
        judgmentType: response.metadata.judgmentType,
        decision: response.metadata.decision,
        legalBases: response.metadata.legalBases,
        judges: response.metadata.judges,
        keywords: response.metadata.keywords,
        courtName: response.metadata.courtName,
      },
      content: {
        text: response.content.text,
        htmlUrl: response.content.htmlUrl,
        pdfUrl: response.content.pdfUrl,
      },
      continuation: {
        truncated: response.continuation.truncated,
        nextOffsetChars: response.continuation.nextOffsetChars,
        totalChars: response.continuation.totalChars,
      },
      sourceLinks: {
        saosHref: response.sourceLinks.saosHref,
        saosSourceUrl: response.sourceLinks.saosSourceUrl,
        uzpHtml: response.sourceLinks.uzpHtml,
        uzpPdf: response.sourceLinks.uzpPdf,
      },
      retrievalMetadata: {
        provider: validatedInput.provider,
        providerId: validatedInput.provider_id,
        queryTimeMs: Date.now() - startTime,
        cached: false,
      },
    };

    // Cache result
    try {
      await context.cache.set(cacheKey, output, CacheTTL.JUDGMENT);
    } catch {
      // Cache errors are non-fatal
    }

    // Log success
    context.auditLogger.logJudgmentAccess({
      clientId,
      provider: validatedInput.provider,
      resourceId: validatedInput.provider_id,
      latencyMs: Date.now() - startTime,
      cached: false,
      offsetChars: validatedInput.offset_chars,
    });

    return createToolResult(output, Date.now() - startTime, cached);
  } catch (error) {
    // Log error
    context.auditLogger.logError({
      clientId,
      provider: validatedInput.provider,
      operation: 'get_judgment',
      error: error instanceof Error ? error : new Error(String(error)),
    });

    if (error instanceof ProviderError) {
      return createToolError(
        'PROVIDER_ERROR',
        error.message,
        error.isRetryable
      );
    }

    if (error instanceof ValidationError) {
      return createToolError('VALIDATION_ERROR', error.message, false);
    }

    return createToolError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      true
    );
  }
}

/**
 * Tool definition for MCP registration
 */
export const kioGetJudgmentTool = {
  name: 'kio_get_judgment',
  description:
    'Retrieve full content of a KIO judgment by provider and ID. Supports character-based pagination for long documents.',
  inputSchema: KioGetJudgmentInputSchema,
  execute: executeKioGetJudgment,
};
