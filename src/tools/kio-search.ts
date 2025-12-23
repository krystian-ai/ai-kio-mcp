/**
 * KIO Search Tool
 * Searches for judgments across providers with caching and rate limiting
 */

import type { ToolContext, ToolResponse } from './types.js';
import { createToolResult, createToolError, getClientId } from './types.js';
import type { KioSearchInput, KioSearchOutput, SearchResultItem } from '../schemas/index.js';
import { KioSearchInputSchema } from '../schemas/index.js';
import type { Provider, NormalizedSearchResult, SearchParams } from '../providers/types.js';
import { CacheTTL } from '../cache/types.js';
import { RateLimitError, ProviderError, ValidationError } from '../utils/errors.js';

/**
 * Generate cache key for search request
 */
function generateCacheKey(input: KioSearchInput, provider: Provider): string {
  const parts = [
    'search',
    provider,
    input.query ?? '',
    input.case_number ?? '',
    input.date_from ?? '',
    input.date_to ?? '',
    input.judgment_type ?? '',
    String(input.limit),
    String(input.page),
  ];
  return parts.join(':');
}

/**
 * Map provider preference to actual provider
 */
function resolveProvider(preference: 'auto' | 'saos' | 'uzp'): Provider {
  // Auto defaults to SAOS as it has the most comprehensive data
  return preference === 'auto' ? 'saos' : preference;
}

/**
 * Map normalized search result to output schema format
 */
function mapToOutputResult(result: NormalizedSearchResult): SearchResultItem {
  return {
    id: result.providerId,
    provider: result.provider,
    caseNumbers: result.caseNumbers,
    judgmentDate: result.judgmentDate,
    judgmentType: result.judgmentType,
    courtName: undefined, // Not available in normalized result
    decision: result.decision,
    snippet: result.snippet,
    relevanceScore: undefined, // Not available in normalized result
  };
}

/**
 * Execute KIO search
 */
export async function executeKioSearch(
  input: unknown,
  context: ToolContext,
  headers?: Record<string, string>
): Promise<ToolResponse<KioSearchOutput>> {
  const startTime = Date.now();
  const clientId = getClientId(headers);

  // Validate input
  const parseResult = KioSearchInputSchema.safeParse(input);
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
    context.rateLimiters.search.checkLimit(clientId);
  } catch (error) {
    if (error instanceof RateLimitError) {
      context.auditLogger.logRateLimitExceeded({
        clientId,
        operation: 'search',
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

  // Resolve provider
  const provider = resolveProvider(validatedInput.provider);
  const providerInstance = context.providers.get(provider);

  if (!providerInstance) {
    return createToolError(
      'PROVIDER_NOT_FOUND',
      `Provider ${provider} not available`,
      false
    );
  }

  // Check cache
  const cacheKey = generateCacheKey(validatedInput, provider);
  let cached = false;

  try {
    const cachedResult = await context.cache.get<KioSearchOutput>(cacheKey);
    if (cachedResult) {
      context.auditLogger.logCacheHit({ key: cacheKey, provider });
      context.auditLogger.logSearch({
        clientId,
        provider,
        query: validatedInput.query,
        resultCount: cachedResult.results.length,
        latencyMs: Date.now() - startTime,
        cached: true,
      });
      return createToolResult(cachedResult, Date.now() - startTime, true);
    }
    context.auditLogger.logCacheMiss({ key: cacheKey, provider });
  } catch {
    // Cache errors are non-fatal, continue with fresh fetch
  }

  // Build search params
  const searchParams: SearchParams = {
    query: validatedInput.query,
    caseNumber: validatedInput.case_number,
    dateFrom: validatedInput.date_from,
    dateTo: validatedInput.date_to,
    judgmentType: validatedInput.judgment_type,
    limit: validatedInput.limit,
    page: validatedInput.page,
    includeSnippets: validatedInput.include_snippets,
  };

  // Execute search
  try {
    const response = await providerInstance.search(searchParams);

    // Build output
    const output: KioSearchOutput = {
      results: response.results.map(mapToOutputResult),
      pagination: {
        page: validatedInput.page,
        limit: validatedInput.limit,
        total: response.totalCount,
        hasMore: response.nextPage !== undefined,
      },
      metadata: {
        provider,
        queryTimeMs: Date.now() - startTime,
        cached: false,
      },
    };

    // Cache result
    try {
      await context.cache.set(cacheKey, output, CacheTTL.SEARCH);
    } catch {
      // Cache errors are non-fatal
    }

    // Log success
    context.auditLogger.logSearch({
      clientId,
      provider,
      query: validatedInput.query,
      resultCount: output.results.length,
      latencyMs: Date.now() - startTime,
      cached: false,
    });

    return createToolResult(output, Date.now() - startTime, cached);
  } catch (error) {
    // Log error
    context.auditLogger.logError({
      clientId,
      provider,
      operation: 'search',
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
export const kioSearchTool = {
  name: 'kio_search',
  description:
    'Search for KIO (Krajowa Izba Odwoławcza) court judgments by query, case number, date range, or judgment type. Returns paginated results with snippets.',
  inputSchema: KioSearchInputSchema,
  execute: executeKioSearch,
};
