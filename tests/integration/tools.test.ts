/**
 * Tool integration tests
 * End-to-end tests for MCP tools
 * Run with: INTEGRATION_TESTS=1 npm test -- tests/integration/
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestContext,
  cleanupTestContext,
  shouldRunNetworkTests,
  NETWORK_TIMEOUT,
  TEST_QUERIES,
} from './setup.js';
import type { ToolContext } from '../../src/tools/types.js';
import { executeKioSearch } from '../../src/tools/kio-search.js';
import { executeKioGetJudgment } from '../../src/tools/kio-get-judgment.js';
import { executeKioGetSourceLinks } from '../../src/tools/kio-get-source-links.js';
import { executeKioHealth } from '../../src/tools/kio-health.js';

describe.skipIf(!shouldRunNetworkTests())('Tool Integration Tests', () => {
  let context: ToolContext;

  beforeAll(() => {
    context = createTestContext();
  });

  afterAll(async () => {
    await cleanupTestContext(context);
  });

  describe('kio_search', () => {
    it('should search and return valid results', async () => {
      const result = await executeKioSearch(
        {
          query: TEST_QUERIES.common[0],
          limit: 5,
          page: 1,
        },
        context
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.results).toBeDefined();
        expect(result.data.pagination).toBeDefined();
        expect(result.data.metadata.provider).toBe('saos');
        expect(result.metadata.queryTimeMs).toBeGreaterThan(0);
      }
    }, NETWORK_TIMEOUT);

    it('should cache search results', async () => {
      // First call
      const result1 = await executeKioSearch(
        {
          query: 'cached search test query',
          limit: 5,
        },
        context
      );

      // Second call with same params
      const result2 = await executeKioSearch(
        {
          query: 'cached search test query',
          limit: 5,
        },
        context
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.metadata.cached).toBe(true);
      }
    }, NETWORK_TIMEOUT);

    it('should validate input', async () => {
      const result = await executeKioSearch({}, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('kio_get_judgment', () => {
    let testProviderId: string;

    beforeAll(async () => {
      // Get a valid provider ID
      const searchResult = await executeKioSearch(
        {
          query: TEST_QUERIES.common[0],
          limit: 1,
        },
        context
      );

      if (searchResult.success && searchResult.data.results.length > 0) {
        testProviderId = searchResult.data.results[0].id;
      }
    });

    it('should retrieve judgment content', async () => {
      if (!testProviderId) {
        console.log('Skipping: no test provider ID');
        return;
      }

      const result = await executeKioGetJudgment(
        {
          provider: 'saos',
          provider_id: testProviderId,
          max_chars: 5000,
        },
        context
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.caseNumbers).toBeDefined();
        expect(result.data.content.text.length).toBeGreaterThan(0);
        expect(result.data.retrievalMetadata.provider).toBe('saos');
      }
    }, NETWORK_TIMEOUT);

    it('should cache judgment results', async () => {
      if (!testProviderId) {
        console.log('Skipping: no test provider ID');
        return;
      }

      // First call
      await executeKioGetJudgment(
        {
          provider: 'saos',
          provider_id: testProviderId,
          max_chars: 1000,
        },
        context
      );

      // Second call
      const result2 = await executeKioGetJudgment(
        {
          provider: 'saos',
          provider_id: testProviderId,
          max_chars: 1000,
        },
        context
      );

      if (result2.success) {
        expect(result2.metadata.cached).toBe(true);
      }
    }, NETWORK_TIMEOUT);

    it('should validate required fields', async () => {
      const result = await executeKioGetJudgment(
        {
          provider: 'saos',
          // missing provider_id
        },
        context
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('kio_get_source_links', () => {
    it('should return source links', async () => {
      const result = await executeKioGetSourceLinks(
        {
          provider: 'saos',
          provider_id: '123456',
        },
        context
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe('saos');
        expect(result.data.providerId).toBe('123456');
        expect(result.data.links).toBeDefined();
      }
    });

    it('should validate input', async () => {
      const result = await executeKioGetSourceLinks(
        {
          provider: 'invalid' as any,
          provider_id: '123',
        },
        context
      );

      expect(result.success).toBe(false);
    });
  });

  describe('kio_health', () => {
    it('should return health status', async () => {
      const result = await executeKioHealth({}, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.providers).toBeDefined();
        expect(result.data.providers.length).toBe(2);
        expect(result.data.cache).toBeDefined();
        expect(result.data.server).toBeDefined();
        expect(result.data.server.version).toBe('test');
      }
    }, NETWORK_TIMEOUT);

    it('should check specific provider', async () => {
      const result = await executeKioHealth(
        { provider: 'saos' },
        context
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.providers.length).toBe(1);
        expect(result.data.providers[0].provider).toBe('saos');
      }
    }, NETWORK_TIMEOUT);
  });
});
