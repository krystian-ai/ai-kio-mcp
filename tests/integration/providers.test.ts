/**
 * Provider integration tests
 * These tests verify provider functionality against real APIs
 * Run with: INTEGRATION_TESTS=1 npm test -- tests/integration/
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSaosProvider } from '../../src/providers/saos/index.js';
import { createUzpProvider } from '../../src/providers/uzp/index.js';
import type { KioProvider } from '../../src/providers/types.js';
import {
  shouldRunNetworkTests,
  NETWORK_TIMEOUT,
  TEST_QUERIES,
} from './setup.js';

describe.skipIf(!shouldRunNetworkTests())('SAOS Provider Integration', () => {
  let provider: KioProvider;

  beforeAll(() => {
    provider = createSaosProvider();
  });

  describe('healthCheck', () => {
    it('should report healthy status', async () => {
      const status = await provider.healthCheck();

      expect(status.provider).toBe('saos');
      expect(status.available).toBe(true);
      expect(status.latencyMs).toBeGreaterThan(0);
      expect(status.timestamp).toBeDefined();
    }, NETWORK_TIMEOUT);
  });

  describe('search', () => {
    it('should return results for common query', async () => {
      const response = await provider.search({
        query: TEST_QUERIES.common[0],
        limit: 10,
        page: 1,
        includeSnippets: true,
      });

      expect(response.results).toBeDefined();
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results.length).toBeLessThanOrEqual(10);

      // Verify result structure
      const firstResult = response.results[0];
      expect(firstResult.provider).toBe('saos');
      expect(firstResult.providerId).toBeDefined();
      expect(firstResult.caseNumbers).toBeDefined();
      expect(firstResult.judgmentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(firstResult.judgmentType).toBeDefined();
    }, NETWORK_TIMEOUT);

    it('should handle pagination', async () => {
      const page1 = await provider.search({
        query: TEST_QUERIES.common[0],
        limit: 5,
        page: 1,
        includeSnippets: false,
      });

      const page2 = await provider.search({
        query: TEST_QUERIES.common[0],
        limit: 5,
        page: 2,
        includeSnippets: false,
      });

      // Results should be different
      if (page1.results.length > 0 && page2.results.length > 0) {
        expect(page1.results[0].providerId).not.toBe(page2.results[0].providerId);
      }
    }, NETWORK_TIMEOUT);

    it('should filter by date range', async () => {
      const response = await provider.search({
        query: TEST_QUERIES.common[0],
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
        limit: 10,
        page: 1,
        includeSnippets: false,
      });

      // All results should be within date range
      for (const result of response.results) {
        const date = new Date(result.judgmentDate);
        expect(date.getFullYear()).toBe(2023);
      }
    }, NETWORK_TIMEOUT);

    it('should filter by judgment type', async () => {
      const response = await provider.search({
        query: TEST_QUERIES.common[0],
        judgmentType: 'SENTENCE',
        limit: 10,
        page: 1,
        includeSnippets: false,
      });

      // All results should be SENTENCE type
      for (const result of response.results) {
        expect(result.judgmentType).toBe('SENTENCE');
      }
    }, NETWORK_TIMEOUT);

    it('should return empty results for nonsense query', async () => {
      const response = await provider.search({
        query: 'xyzabc123nonsensequery',
        limit: 10,
        page: 1,
        includeSnippets: false,
      });

      expect(response.results).toHaveLength(0);
    }, NETWORK_TIMEOUT);
  });

  describe('getJudgment', () => {
    let testProviderId: string;

    beforeAll(async () => {
      // Get a valid provider ID from search
      const searchResponse = await provider.search({
        query: TEST_QUERIES.common[0],
        limit: 1,
        page: 1,
        includeSnippets: false,
      });

      if (searchResponse.results.length > 0) {
        testProviderId = searchResponse.results[0].providerId;
      }
    });

    it('should retrieve judgment content', async () => {
      if (!testProviderId) {
        console.log('Skipping: no test provider ID available');
        return;
      }

      const response = await provider.getJudgment({
        providerId: testProviderId,
        formatPreference: 'text',
        maxChars: 10000,
        offsetChars: 0,
      });

      expect(response.metadata).toBeDefined();
      expect(response.metadata.caseNumbers).toBeDefined();
      expect(response.metadata.judgmentDate).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content.text.length).toBeGreaterThan(0);
      expect(response.continuation).toBeDefined();
      expect(response.sourceLinks).toBeDefined();
    }, NETWORK_TIMEOUT);

    it('should handle content pagination', async () => {
      if (!testProviderId) {
        console.log('Skipping: no test provider ID available');
        return;
      }

      // Get first chunk
      const chunk1 = await provider.getJudgment({
        providerId: testProviderId,
        formatPreference: 'text',
        maxChars: 1000,
        offsetChars: 0,
      });

      if (chunk1.continuation.truncated && chunk1.continuation.nextOffsetChars) {
        // Get second chunk
        const chunk2 = await provider.getJudgment({
          providerId: testProviderId,
          formatPreference: 'text',
          maxChars: 1000,
          offsetChars: chunk1.continuation.nextOffsetChars,
        });

        // Content should be different
        expect(chunk1.content.text).not.toBe(chunk2.content.text);
      }
    }, NETWORK_TIMEOUT);
  });

  describe('getSourceLinks', () => {
    it('should return source links for valid ID', async () => {
      const links = provider.getSourceLinks('123456');

      expect(links).toBeDefined();
      expect(links.saosHref).toContain('saos.org.pl');
    });
  });
});

describe.skipIf(!shouldRunNetworkTests())('UZP Provider Integration', () => {
  let provider: KioProvider;

  beforeAll(() => {
    provider = createUzpProvider();
  });

  describe('healthCheck', () => {
    it('should report status', async () => {
      const status = await provider.healthCheck();

      expect(status.provider).toBe('uzp');
      expect(status.timestamp).toBeDefined();
      // UZP may not always be available
      if (status.available) {
        expect(status.latencyMs).toBeGreaterThan(0);
      }
    }, NETWORK_TIMEOUT);
  });

  describe('getSourceLinks', () => {
    it('should return UZP source links', () => {
      const links = provider.getSourceLinks('test-id');

      expect(links).toBeDefined();
      // UZP provider should return UZP-specific links
    });
  });
});
