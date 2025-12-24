#!/usr/bin/env node
/**
 * stdio entrypoint for MCP KIO server
 * Used for local MCP client connections (Claude Desktop, etc.)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createKioServer } from './server/index.js';

// Get version from package.json
const VERSION = process.env.npm_package_version ?? '1.0.0';

/**
 * Start the MCP server with stdio transport
 */
async function main(): Promise<void> {
  // Create the KIO server
  const kioServer = createKioServer({
    name: 'mcp-kio',
    version: VERSION,
  });

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Handle graceful shutdown
  const shutdown = async () => {
    await kioServer.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Connect server to transport
  await kioServer.server.connect(transport);

  // Log startup (to stderr to avoid interfering with stdio protocol)
  console.error(`[mcp-kio] Server started (version ${VERSION})`);
  console.error('[mcp-kio] Available tools: kio_search, kio_get_judgment, kio_get_source_links, kio_health');
}

// Run
main().catch((error) => {
  console.error('[mcp-kio] Fatal error:', error);
  process.exit(1);
});
