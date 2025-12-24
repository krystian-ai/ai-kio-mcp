/**
 * Integration test setup and utilities
 */

import { createToolContext, closeToolContext, type ToolContext } from '../../src/tools/index.js';

/**
 * Check if network tests should run
 * Set INTEGRATION_TESTS=1 to enable real API calls
 */
export function shouldRunNetworkTests(): boolean {
  return process.env.INTEGRATION_TESTS === '1';
}

/**
 * Skip test if network tests are disabled
 */
export function skipIfNoNetwork(testFn: () => void | Promise<void>): () => void | Promise<void> {
  if (!shouldRunNetworkTests()) {
    return () => {
      console.log('Skipping network test (set INTEGRATION_TESTS=1 to enable)');
    };
  }
  return testFn;
}

/**
 * Create a test context with real providers
 */
export function createTestContext(): ToolContext {
  return createToolContext({ version: 'test' });
}

/**
 * Cleanup test context
 */
export async function cleanupTestContext(context: ToolContext): Promise<void> {
  await closeToolContext(context);
}

/**
 * Timeout for network tests (30 seconds)
 */
export const NETWORK_TIMEOUT = 30000;

/**
 * Known KIO case numbers for testing
 * These are real case numbers that should exist in SAOS
 */
export const TEST_CASE_NUMBERS = {
  // Recent cases that should be searchable
  recent: ['KIO 1/24', 'KIO 100/23', 'KIO 500/23'],
  // Well-known cases for specific testing
  known: ['KIO 2611/21', 'KIO 1234/22'],
};

/**
 * Test search queries
 */
export const TEST_QUERIES = {
  // Common legal terms
  common: ['zamówienia publiczne', 'odwołanie', 'przetarg'],
  // Specific topics
  specific: ['wykluczenie wykonawcy', 'rażąco niska cena'],
};
