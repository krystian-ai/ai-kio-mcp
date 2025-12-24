#!/usr/bin/env node
/**
 * HTTP entrypoint for MCP KIO server
 * Used for remote MCP connections via Streamable HTTP transport
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createKioServer, type KioMcpServer } from './server/index.js';

// Configuration from environment
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const VERSION = process.env.npm_package_version ?? '1.0.0';

// Active transports by session ID
const transports = new Map<string, StreamableHTTPServerTransport>();

// Single KIO server instance
let kioServer: KioMcpServer;

/**
 * Handle MCP requests
 */
async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const sessionId = req.headers['x-session-id'] as string | undefined;

  // Handle based on HTTP method
  if (req.method === 'POST') {
    // New or existing session
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      // Create new transport for new session
      const newSessionId = randomUUID();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        onsessioninitialized: (id) => {
          transports.set(id, transport!);
        },
      });

      // Connect to our server
      await kioServer.server.connect(transport);
    }

    // Handle the request
    await transport.handleRequest(req, res);
  } else if (req.method === 'GET') {
    // SSE stream for server-sent events
    if (!sessionId || !transports.has(sessionId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or missing session ID' }));
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  } else if (req.method === 'DELETE') {
    // Session termination
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.close();
      transports.delete(sessionId);
    }
    res.writeHead(200);
    res.end();
  } else if (req.method === 'OPTIONS') {
    // CORS preflight
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    });
    res.end();
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
}

/**
 * Handle health check
 */
function handleHealthCheck(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    version: VERSION,
    sessions: transports.size,
  }));
}

/**
 * Route requests
 */
async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  try {
    if (url.pathname === '/health') {
      handleHealthCheck(res);
    } else if (url.pathname === '/mcp' || url.pathname === '/') {
      await handleMcpRequest(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('[mcp-kio] Request error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
}

/**
 * Start the HTTP server
 */
async function main(): Promise<void> {
  // Create the KIO server
  kioServer = createKioServer({
    name: 'mcp-kio',
    version: VERSION,
  });

  // Create HTTP server
  const httpServer = createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('[mcp-kio] Unhandled request error:', error);
    });
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('[mcp-kio] Shutting down...');

    // Close all transports
    for (const [sessionId, transport] of transports) {
      await transport.close();
      transports.delete(sessionId);
    }

    // Close KIO server
    await kioServer.close();

    // Close HTTP server
    httpServer.close(() => {
      console.log('[mcp-kio] Server stopped');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start listening
  httpServer.listen(PORT, HOST, () => {
    console.log(`[mcp-kio] HTTP server started on http://${HOST}:${PORT}`);
    console.log(`[mcp-kio] MCP endpoint: http://${HOST}:${PORT}/mcp`);
    console.log(`[mcp-kio] Health check: http://${HOST}:${PORT}/health`);
    console.log('[mcp-kio] Available tools: kio_search, kio_get_judgment, kio_get_source_links, kio_health');
  });
}

// Run
main().catch((error) => {
  console.error('[mcp-kio] Fatal error:', error);
  process.exit(1);
});
