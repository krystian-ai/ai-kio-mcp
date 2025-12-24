#!/usr/bin/env tsx
/**
 * Performance benchmark script
 * Validates SLO requirements:
 * - Search P95 ≤ 2000ms
 * - Judgment retrieval P95 ≤ 5000ms
 * - Health check P95 ≤ 1000ms
 */

import { createSaosProvider } from '../src/providers/saos/provider.js';

interface BenchmarkResult {
  operation: string;
  samples: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  sloTarget: number;
  sloPassed: boolean;
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculateStats(times: number[], sloTarget: number): BenchmarkResult {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const p95 = percentile(sorted, 95);

  return {
    operation: '',
    samples: times.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(sum / sorted.length),
    p50: percentile(sorted, 50),
    p95,
    p99: percentile(sorted, 99),
    sloTarget,
    sloPassed: p95 <= sloTarget,
  };
}

async function measureTime<T>(fn: () => Promise<T>): Promise<number> {
  const start = performance.now();
  await fn();
  return Math.round(performance.now() - start);
}

async function benchmarkSearch(
  provider: ReturnType<typeof createSaosProvider>,
  iterations: number
): Promise<BenchmarkResult> {
  const times: number[] = [];

  console.log(`  Running ${iterations} search iterations...`);

  for (let i = 0; i < iterations; i++) {
    const time = await measureTime(() =>
      provider.search({
        query: 'zamówienia publiczne',
        limit: 10,
        page: 1,
        includeSnippets: false,
      })
    );
    times.push(time);
    process.stdout.write(`\r  Progress: ${i + 1}/${iterations}`);
  }
  console.log();

  const result = calculateStats(times, 2000);
  result.operation = 'search';
  return result;
}

async function benchmarkJudgment(
  provider: ReturnType<typeof createSaosProvider>,
  providerId: string,
  iterations: number
): Promise<BenchmarkResult> {
  const times: number[] = [];

  console.log(`  Running ${iterations} judgment retrieval iterations...`);

  for (let i = 0; i < iterations; i++) {
    const time = await measureTime(() =>
      provider.getJudgment({
        providerId,
        formatPreference: 'text',
        maxChars: 10000,
        offsetChars: 0,
      })
    );
    times.push(time);
    process.stdout.write(`\r  Progress: ${i + 1}/${iterations}`);
  }
  console.log();

  const result = calculateStats(times, 5000);
  result.operation = 'judgment';
  return result;
}

async function benchmarkHealth(
  provider: ReturnType<typeof createSaosProvider>,
  iterations: number
): Promise<BenchmarkResult> {
  const times: number[] = [];

  console.log(`  Running ${iterations} health check iterations...`);

  for (let i = 0; i < iterations; i++) {
    const time = await measureTime(() => provider.healthCheck());
    times.push(time);
    process.stdout.write(`\r  Progress: ${i + 1}/${iterations}`);
  }
  console.log();

  const result = calculateStats(times, 1000);
  result.operation = 'health';
  return result;
}

function printResults(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK RESULTS');
  console.log('='.repeat(80));

  const headers = ['Operation', 'Samples', 'Min', 'Mean', 'P50', 'P95', 'P99', 'Max', 'SLO', 'Status'];
  const widths = [12, 8, 8, 8, 8, 8, 8, 8, 8, 8];

  console.log(headers.map((h, i) => h.padEnd(widths[i])).join(' '));
  console.log('-'.repeat(80));

  for (const r of results) {
    const status = r.sloPassed ? '✓ PASS' : '✗ FAIL';
    const row = [
      r.operation,
      r.samples.toString(),
      `${r.min}ms`,
      `${r.mean}ms`,
      `${r.p50}ms`,
      `${r.p95}ms`,
      `${r.p99}ms`,
      `${r.max}ms`,
      `${r.sloTarget}ms`,
      status,
    ];
    console.log(row.map((v, i) => v.padEnd(widths[i])).join(' '));
  }

  console.log('='.repeat(80));

  const allPassed = results.every((r) => r.sloPassed);
  if (allPassed) {
    console.log('\n✓ All SLO targets met!\n');
  } else {
    console.log('\n✗ Some SLO targets not met!\n');
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const iterations = parseInt(process.env.BENCHMARK_ITERATIONS || '10', 10);

  console.log('mcp-kio Performance Benchmark');
  console.log('==============================');
  console.log(`Iterations per operation: ${iterations}`);
  console.log('SLO Targets:');
  console.log('  - Search P95: ≤ 2000ms');
  console.log('  - Judgment P95: ≤ 5000ms');
  console.log('  - Health P95: ≤ 1000ms');
  console.log();

  const provider = createSaosProvider();
  const results: BenchmarkResult[] = [];

  try {
    // Warm up with a single search to establish connection
    console.log('Warming up...');
    const warmupResult = await provider.search({
      query: 'test',
      limit: 1,
      page: 1,
      includeSnippets: false,
    });

    if (warmupResult.results.length === 0) {
      console.error('No results found for warmup query. Cannot continue benchmark.');
      process.exit(1);
    }

    const providerId = warmupResult.results[0].providerId;
    console.log(`Using judgment ID: ${providerId}\n`);

    // Run benchmarks
    console.log('1. Search Benchmark');
    results.push(await benchmarkSearch(provider, iterations));

    console.log('\n2. Judgment Retrieval Benchmark');
    results.push(await benchmarkJudgment(provider, providerId, iterations));

    console.log('\n3. Health Check Benchmark');
    results.push(await benchmarkHealth(provider, iterations));

    // Print results
    printResults(results);
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

main();
