import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerKioTools, getToolDefinitions } from '../../../src/server/tool-registry.js';
import type { ToolContext } from '../../../src/tools/types.js';
import type { KioProvider } from '../../../src/providers/types.js';

// Mock provider
function createMockProvider(): KioProvider {
  return {
    name: 'saos',
    search: vi.fn(),
    getJudgment: vi.fn(),
    getSourceLinks: vi.fn(),
    healthCheck: vi.fn(),
  };
}

// Mock cache
function createMockCache() {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    has: vi.fn().mockResolvedValue(false),
    clear: vi.fn().mockResolvedValue(undefined),
    stats: vi.fn().mockReturnValue({ hits: 0, misses: 0, size: 0, hitRate: 0 }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

// Mock rate limiter
function createMockRateLimiter() {
  return {
    checkLimit: vi.fn().mockReturnValue(true),
    getRemainingRequests: vi.fn().mockReturnValue(60),
    getResetTime: vi.fn().mockReturnValue(0),
    reset: vi.fn(),
    clear: vi.fn(),
    close: vi.fn(),
  };
}

// Mock audit logger
function createMockAuditLogger() {
  return {
    logSearch: vi.fn(),
    logJudgmentAccess: vi.fn(),
    logRateLimitExceeded: vi.fn(),
    logDomainBlocked: vi.fn(),
    logCacheHit: vi.fn(),
    logCacheMiss: vi.fn(),
    logError: vi.fn(),
    logHealthCheck: vi.fn(),
    getRecentEntries: vi.fn().mockReturnValue([]),
    getEntriesByType: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({}),
    clear: vi.fn(),
  };
}

describe('registerKioTools', () => {
  let server: McpServer;
  let context: ToolContext;

  beforeEach(() => {
    server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    context = {
      providers: new Map([
        ['saos', createMockProvider()],
        ['uzp', createMockProvider()],
      ]),
      cache: createMockCache(),
      rateLimiters: {
        search: createMockRateLimiter(),
        judgment: createMockRateLimiter(),
        health: createMockRateLimiter(),
      },
      auditLogger: createMockAuditLogger(),
      startedAt: new Date(),
      version: '1.0.0',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register all tools without errors', () => {
    expect(() => registerKioTools(server, context)).not.toThrow();
  });

  it('should register kio_search tool', () => {
    const toolSpy = vi.spyOn(server, 'tool');
    registerKioTools(server, context);

    expect(toolSpy).toHaveBeenCalledWith(
      'kio_search',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should register kio_get_judgment tool', () => {
    const toolSpy = vi.spyOn(server, 'tool');
    registerKioTools(server, context);

    expect(toolSpy).toHaveBeenCalledWith(
      'kio_get_judgment',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should register kio_get_source_links tool', () => {
    const toolSpy = vi.spyOn(server, 'tool');
    registerKioTools(server, context);

    expect(toolSpy).toHaveBeenCalledWith(
      'kio_get_source_links',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should register kio_health tool', () => {
    const toolSpy = vi.spyOn(server, 'tool');
    registerKioTools(server, context);

    expect(toolSpy).toHaveBeenCalledWith(
      'kio_health',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should register exactly 4 tools', () => {
    const toolSpy = vi.spyOn(server, 'tool');
    registerKioTools(server, context);

    expect(toolSpy).toHaveBeenCalledTimes(4);
  });
});

describe('getToolDefinitions', () => {
  it('should return all tool definitions', () => {
    const definitions = getToolDefinitions();

    expect(definitions).toHaveLength(4);
  });

  it('should include kio_search definition', () => {
    const definitions = getToolDefinitions();
    const searchTool = definitions.find((t) => t.name === 'kio_search');

    expect(searchTool).toBeDefined();
    expect(searchTool?.description).toContain('Search');
  });

  it('should include kio_get_judgment definition', () => {
    const definitions = getToolDefinitions();
    const judgmentTool = definitions.find((t) => t.name === 'kio_get_judgment');

    expect(judgmentTool).toBeDefined();
    expect(judgmentTool?.description).toContain('judgment');
  });

  it('should include kio_get_source_links definition', () => {
    const definitions = getToolDefinitions();
    const linksTool = definitions.find((t) => t.name === 'kio_get_source_links');

    expect(linksTool).toBeDefined();
    expect(linksTool?.description).toContain('URL');
  });

  it('should include kio_health definition', () => {
    const definitions = getToolDefinitions();
    const healthTool = definitions.find((t) => t.name === 'kio_health');

    expect(healthTool).toBeDefined();
    expect(healthTool?.description).toContain('health');
  });
});
