/**
 * MCP Server factory
 * Creates and configures the KIO MCP server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerKioTools } from './tool-registry.js';
import { createToolContext, closeToolContext, type ToolContext } from '../tools/index.js';

/**
 * Server configuration
 */
export interface KioServerConfig {
  /** Server version */
  version?: string;
  /** Server name */
  name?: string;
}

/**
 * KIO MCP Server wrapper
 */
export interface KioMcpServer {
  /** The underlying MCP server */
  server: McpServer;
  /** Tool context with providers, cache, etc. */
  context: ToolContext;
  /** Close server and cleanup resources */
  close(): Promise<void>;
}

/**
 * Create a KIO MCP server instance
 */
export function createKioServer(config: KioServerConfig = {}): KioMcpServer {
  const version = config.version ?? '1.0.0';
  const name = config.name ?? 'mcp-kio';

  // Create MCP server
  const server = new McpServer({
    name,
    version,
  });

  // Create tool context with all dependencies
  const context = createToolContext({ version });

  // Register all tools
  registerKioTools(server, context);

  return {
    server,
    context,
    async close() {
      await closeToolContext(context);
    },
  };
}

/**
 * Get server info
 */
export function getServerInfo(config: KioServerConfig = {}): {
  name: string;
  version: string;
} {
  return {
    name: config.name ?? 'mcp-kio',
    version: config.version ?? '1.0.0',
  };
}
