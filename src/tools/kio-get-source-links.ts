/**
 * KIO Get Source Links Tool
 * Returns canonical URLs for citing judgments
 */

import type { ToolContext, ToolResponse } from './types.js';
import { createToolResult, createToolError, getClientId } from './types.js';
import type { KioGetSourceLinksOutput } from '../schemas/index.js';
import { KioGetSourceLinksInputSchema } from '../schemas/index.js';
import { RateLimitError } from '../utils/errors.js';

/**
 * Execute KIO get source links
 */
export async function executeKioGetSourceLinks(
  input: unknown,
  context: ToolContext,
  headers?: Record<string, string>
): Promise<ToolResponse<KioGetSourceLinksOutput>> {
  const startTime = Date.now();
  const clientId = getClientId(headers);

  // Validate input
  const parseResult = KioGetSourceLinksInputSchema.safeParse(input);
  if (!parseResult.success) {
    return createToolError(
      'VALIDATION_ERROR',
      `Invalid input: ${parseResult.error.message}`,
      false
    );
  }

  const validatedInput = parseResult.data;

  // Check rate limit (uses judgment rate limit as it's related)
  try {
    context.rateLimiters.judgment.checkLimit(clientId);
  } catch (error) {
    if (error instanceof RateLimitError) {
      context.auditLogger.logRateLimitExceeded({
        clientId,
        operation: 'source_links',
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

  // Get source links (synchronous operation)
  try {
    const links = providerInstance.getSourceLinks(validatedInput.provider_id);

    const output: KioGetSourceLinksOutput = {
      provider: validatedInput.provider,
      providerId: validatedInput.provider_id,
      links: {
        saosHref: links.saosHref,
        saosSourceUrl: links.saosSourceUrl,
        uzpHtml: links.uzpHtml,
        uzpPdf: links.uzpPdf,
      },
      metadata: {
        queryTimeMs: Date.now() - startTime,
      },
    };

    return createToolResult(output, Date.now() - startTime, false);
  } catch (error) {
    // Log error
    context.auditLogger.logError({
      clientId,
      provider: validatedInput.provider,
      operation: 'get_source_links',
      error: error instanceof Error ? error : new Error(String(error)),
    });

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
export const kioGetSourceLinksTool = {
  name: 'kio_get_source_links',
  description:
    'Get canonical source URLs for a KIO judgment. Use these links for citations and references.',
  inputSchema: KioGetSourceLinksInputSchema,
  execute: executeKioGetSourceLinks,
};
