import { describe, it, expect, afterEach } from 'vitest';
import { createKioServer, getServerInfo } from '../../../src/server/mcp-server.js';

describe('createKioServer', () => {
  let kioServer: ReturnType<typeof createKioServer> | null = null;

  afterEach(async () => {
    if (kioServer) {
      await kioServer.close();
      kioServer = null;
    }
  });

  it('should create server with default config', () => {
    kioServer = createKioServer();

    expect(kioServer).toBeDefined();
    expect(kioServer.server).toBeDefined();
    expect(kioServer.context).toBeDefined();
    expect(kioServer.close).toBeInstanceOf(Function);
  });

  it('should create server with custom config', () => {
    kioServer = createKioServer({
      name: 'custom-kio',
      version: '2.0.0',
    });

    expect(kioServer).toBeDefined();
    expect(kioServer.context.version).toBe('2.0.0');
  });

  it('should have providers initialized', () => {
    kioServer = createKioServer();

    expect(kioServer.context.providers.size).toBe(2);
    expect(kioServer.context.providers.has('saos')).toBe(true);
    expect(kioServer.context.providers.has('uzp')).toBe(true);
  });

  it('should have cache initialized', () => {
    kioServer = createKioServer();

    expect(kioServer.context.cache).toBeDefined();
    expect(kioServer.context.cache.get).toBeInstanceOf(Function);
    expect(kioServer.context.cache.set).toBeInstanceOf(Function);
  });

  it('should have rate limiters initialized', () => {
    kioServer = createKioServer();

    expect(kioServer.context.rateLimiters).toBeDefined();
    expect(kioServer.context.rateLimiters.search).toBeDefined();
    expect(kioServer.context.rateLimiters.judgment).toBeDefined();
    expect(kioServer.context.rateLimiters.health).toBeDefined();
  });

  it('should have audit logger initialized', () => {
    kioServer = createKioServer();

    expect(kioServer.context.auditLogger).toBeDefined();
    expect(kioServer.context.auditLogger.logSearch).toBeInstanceOf(Function);
  });

  it('should have startedAt set', () => {
    kioServer = createKioServer();

    expect(kioServer.context.startedAt).toBeInstanceOf(Date);
    expect(kioServer.context.startedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should close resources properly', async () => {
    kioServer = createKioServer();

    // Should not throw
    await expect(kioServer.close()).resolves.toBeUndefined();
    kioServer = null; // Prevent afterEach from double-closing
  });
});

describe('getServerInfo', () => {
  it('should return default server info', () => {
    const info = getServerInfo();

    expect(info.name).toBe('mcp-kio');
    expect(info.version).toBe('1.0.0');
  });

  it('should return custom server info', () => {
    const info = getServerInfo({
      name: 'custom-server',
      version: '3.0.0',
    });

    expect(info.name).toBe('custom-server');
    expect(info.version).toBe('3.0.0');
  });
});
