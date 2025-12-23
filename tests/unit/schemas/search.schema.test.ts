import { describe, it, expect } from 'vitest';
import {
  KioSearchInputSchema,
  SearchResultItemSchema,
  KioSearchOutputSchema,
} from '../../../src/schemas/search.schema.js';

describe('KioSearchInputSchema', () => {
  it('should accept valid search with query', () => {
    const result = KioSearchInputSchema.parse({
      query: 'zamówienia publiczne',
    });
    expect(result.query).toBe('zamówienia publiczne');
    expect(result.provider).toBe('auto');
    expect(result.limit).toBe(20);
    expect(result.page).toBe(1);
  });

  it('should accept valid search with case_number', () => {
    const result = KioSearchInputSchema.parse({
      case_number: 'KIO 123/23',
    });
    expect(result.case_number).toBe('KIO 123/23');
  });

  it('should accept search with all parameters', () => {
    const result = KioSearchInputSchema.parse({
      query: 'test query',
      case_number: 'KIO 456/24',
      date_from: '2023-01-01',
      date_to: '2024-12-31',
      judgment_type: 'SENTENCE',
      limit: 50,
      page: 2,
      provider: 'saos',
      include_snippets: false,
    });
    expect(result.query).toBe('test query');
    expect(result.case_number).toBe('KIO 456/24');
    expect(result.date_from).toBe('2023-01-01');
    expect(result.date_to).toBe('2024-12-31');
    expect(result.judgment_type).toBe('SENTENCE');
    expect(result.limit).toBe(50);
    expect(result.page).toBe(2);
    expect(result.provider).toBe('saos');
    expect(result.include_snippets).toBe(false);
  });

  it('should reject search without query or case_number', () => {
    expect(() => KioSearchInputSchema.parse({})).toThrow();
  });

  it('should reject query exceeding max length', () => {
    expect(() => KioSearchInputSchema.parse({
      query: 'x'.repeat(501),
    })).toThrow();
  });

  it('should reject empty query', () => {
    expect(() => KioSearchInputSchema.parse({
      query: '',
    })).toThrow();
  });
});

describe('SearchResultItemSchema', () => {
  it('should accept valid search result', () => {
    const result = SearchResultItemSchema.parse({
      id: '123',
      provider: 'saos',
      caseNumbers: ['KIO 123/23', 'KIO 124/23'],
      judgmentDate: '2023-06-15',
      judgmentType: 'SENTENCE',
      courtName: 'Krajowa Izba Odwoławcza',
      decision: 'Oddalono odwołanie',
      snippet: 'Fragment tekstu orzeczenia...',
      relevanceScore: 0.85,
    });
    expect(result.id).toBe('123');
    expect(result.provider).toBe('saos');
    expect(result.caseNumbers).toHaveLength(2);
  });

  it('should accept result with optional fields omitted', () => {
    const result = SearchResultItemSchema.parse({
      id: '456',
      provider: 'uzp',
      caseNumbers: ['KIO 789/24'],
      judgmentDate: '2024-03-20',
      judgmentType: 'DECISION',
    });
    expect(result.courtName).toBeUndefined();
    expect(result.snippet).toBeUndefined();
  });

  it('should reject invalid relevance score', () => {
    expect(() => SearchResultItemSchema.parse({
      id: '123',
      provider: 'saos',
      caseNumbers: ['KIO 123/23'],
      judgmentDate: '2023-06-15',
      judgmentType: 'SENTENCE',
      relevanceScore: 1.5,
    })).toThrow();
  });
});

describe('KioSearchOutputSchema', () => {
  it('should accept valid search output', () => {
    const result = KioSearchOutputSchema.parse({
      results: [
        {
          id: '123',
          provider: 'saos',
          caseNumbers: ['KIO 123/23'],
          judgmentDate: '2023-06-15',
          judgmentType: 'SENTENCE',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 150,
        hasMore: true,
      },
      metadata: {
        provider: 'saos',
        queryTimeMs: 234,
        cached: false,
      },
    });
    expect(result.results).toHaveLength(1);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.metadata.provider).toBe('saos');
  });

  it('should accept output without total count', () => {
    const result = KioSearchOutputSchema.parse({
      results: [],
      pagination: {
        page: 1,
        limit: 20,
        hasMore: false,
      },
      metadata: {
        provider: 'uzp',
        queryTimeMs: 100,
        cached: true,
      },
    });
    expect(result.pagination.total).toBeUndefined();
    expect(result.metadata.cached).toBe(true);
  });
});
