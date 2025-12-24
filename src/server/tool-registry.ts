/**
 * Tool registration for MCP server
 * Registers all KIO tools with their schemas and handlers
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from '../tools/types.js';
import { executeKioSearch } from '../tools/kio-search.js';
import { executeKioGetJudgment } from '../tools/kio-get-judgment.js';
import { executeKioGetSourceLinks } from '../tools/kio-get-source-links.js';
import { executeKioHealth } from '../tools/kio-health.js';

/**
 * Tool result content type
 */
interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Format tool response for MCP
 */
function formatToolResponse<T>(
  result: { success: true; data: T; metadata: { queryTimeMs: number; cached: boolean } } |
         { success: false; error: { code: string; message: string; retryable: boolean; retryAfterMs?: number } }
): { content: TextContent[]; isError?: boolean } {
  if (result.success) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  } else {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: result.error.code,
            message: result.error.message,
            retryable: result.error.retryable,
            ...(result.error.retryAfterMs && { retryAfterMs: result.error.retryAfterMs }),
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Register all KIO tools with the MCP server
 */
export function registerKioTools(server: McpServer, context: ToolContext): void {
  // Register kio_search tool
  server.tool(
    'kio_search',
    'Search for KIO (Krajowa Izba Odwoławcza) court judgments by query, case number, date range, or judgment type. Returns paginated results with optional text snippets.',
    {
      query: z.string().min(1).max(500).optional().describe('Full-text search query'),
      case_number: z.string().regex(/^KIO\s*\d+\/\d{2,4}$/i).optional().describe('KIO case number (e.g., KIO 123/23)'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date filter (YYYY-MM-DD)'),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date filter (YYYY-MM-DD)'),
      judgment_type: z.enum(['SENTENCE', 'DECISION', 'RESOLUTION']).optional().describe('Filter by judgment type'),
      limit: z.number().int().min(1).max(100).default(20).describe('Maximum results per page'),
      page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
      provider: z.enum(['saos', 'uzp', 'auto']).default('auto').describe('Data provider preference'),
      include_snippets: z.boolean().default(true).describe('Include text snippets in results'),
    },
    async (params) => {
      const result = await executeKioSearch(params, context);
      return formatToolResponse(result);
    }
  );

  // Register kio_get_judgment tool
  server.tool(
    'kio_get_judgment',
    'Retrieve full content of a KIO judgment by provider and ID. Supports character-based pagination for long documents. Use offset_chars to continue reading from a previous position.',
    {
      provider: z.enum(['saos', 'uzp']).describe('Data provider (saos or uzp)'),
      provider_id: z.string().min(1).describe('Provider-specific judgment ID'),
      format_preference: z.enum(['text', 'html', 'auto']).default('text').describe('Preferred content format'),
      max_chars: z.number().int().min(1000).max(100000).default(40000).describe('Maximum characters to return'),
      offset_chars: z.number().int().min(0).default(0).describe('Character offset for pagination'),
    },
    async (params) => {
      const result = await executeKioGetJudgment(params, context);
      return formatToolResponse(result);
    }
  );

  // Register kio_get_source_links tool
  server.tool(
    'kio_get_source_links',
    'Get canonical source URLs for a KIO judgment. Use these links for citations and references to the original sources.',
    {
      provider: z.enum(['saos', 'uzp']).describe('Data provider'),
      provider_id: z.string().min(1).describe('Provider-specific judgment ID'),
    },
    async (params) => {
      const result = await executeKioGetSourceLinks(params, context);
      return formatToolResponse(result);
    }
  );

  // Register kio_health tool
  server.tool(
    'kio_health',
    'Check health status of the KIO MCP server, including provider availability, cache status, and server uptime.',
    {
      provider: z.enum(['saos', 'uzp']).optional().describe('Check specific provider only'),
    },
    async (params) => {
      const result = await executeKioHealth(params, context);
      return formatToolResponse(result);
    }
  );
}

/**
 * Get tool definitions for documentation
 */
export function getToolDefinitions(): Array<{
  name: string;
  description: string;
}> {
  return [
    {
      name: 'kio_search',
      description: 'Search for KIO court judgments by query, case number, date range, or judgment type.',
    },
    {
      name: 'kio_get_judgment',
      description: 'Retrieve full content of a KIO judgment with character-based pagination.',
    },
    {
      name: 'kio_get_source_links',
      description: 'Get canonical source URLs for citing a KIO judgment.',
    },
    {
      name: 'kio_health',
      description: 'Check health status of the KIO MCP server and providers.',
    },
  ];
}
