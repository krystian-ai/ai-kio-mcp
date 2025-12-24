/**
 * Server integration tests
 * Tests the complete server setup and tool execution flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createKioServer, type KioMcpServer } from '../../src/server/index.js';
import { shouldRunNetworkTests, NETWORK_TIMEOUT } from './setup.js';

describe('Server Integration', () => {
  let kioServer: KioMcpServer;

  beforeAll(() => {
    kioServer = createKioServer({
      name: 'test-kio-server',
      version: '1.0.0-test',
    });
  });

  afterAll(async () => {
    await kioServer.close();
  });

  describe('server initialization', () => {
    it('should create server with all providers', () => {
      expect(kioServer.context.providers.size).toBe(2);
      expect(kioServer.context.providers.has('saos')).toBe(true);
      expect(kioServer.context.providers.has('uzp')).toBe(true);
    });

    it('should initialize cache', () => {
      const stats = kioServer.context.cache.stats();
      expect(stats).toBeDefined();
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
    });

    it('should initialize rate limiters', () => {
      expect(kioServer.context.rateLimiters.search).toBeDefined();
      expect(kioServer.context.rateLimiters.judgment).toBeDefined();
      expect(kioServer.context.rateLimiters.health).toBeDefined();
    });

    it('should track server start time', () => {
      expect(kioServer.context.startedAt).toBeInstanceOf(Date);
      expect(kioServer.context.startedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should have correct version', () => {
      expect(kioServer.context.version).toBe('1.0.0-test');
    });
  });

  describe('MCP server', () => {
    it('should have server instance', () => {
      expect(kioServer.server).toBeDefined();
    });
  });

  describe.skipIf(!shouldRunNetworkTests())('end-to-end flow', () => {
    it('should complete search -> get judgment flow', async () => {
      const saosProvider = kioServer.context.providers.get('saos');
      expect(saosProvider).toBeDefined();

      // Search for judgments
      const searchResponse = await saosProvider!.search({
        query: 'zamówienia publiczne',
        limit: 1,
        page: 1,
        includeSnippets: false,
      });

      expect(searchResponse.results.length).toBeGreaterThan(0);

      // Get judgment content
      const providerId = searchResponse.results[0].providerId;
      const judgmentResponse = await saosProvider!.getJudgment({
        providerId,
        formatPreference: 'text',
        maxChars: 5000,
        offsetChars: 0,
      });

      expect(judgmentResponse.metadata).toBeDefined();
      expect(judgmentResponse.content.text.length).toBeGreaterThan(0);

      // Get source links
      const sourceLinks = saosProvider!.getSourceLinks(providerId);
      expect(sourceLinks.saosHref).toBeDefined();
    }, NETWORK_TIMEOUT);
  });
});

describe('Server Resource Management', () => {
  it('should cleanup resources on close', async () => {
    const server = createKioServer();

    // Verify resources are initialized
    expect(server.context.providers.size).toBe(2);

    // Close and verify no errors
    await expect(server.close()).resolves.toBeUndefined();
  });

  it('should handle multiple server instances', async () => {
    const server1 = createKioServer({ name: 'server1' });
    const server2 = createKioServer({ name: 'server2' });

    expect(server1.context).not.toBe(server2.context);

    await server1.close();
    await server2.close();
  });
});
