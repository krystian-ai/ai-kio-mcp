import { describe, it, expect } from 'vitest';
import {
  KioGetJudgmentInputSchema,
  JudgmentMetadataSchema,
  JudgmentContentSchema,
  KioGetJudgmentOutputSchema,
} from '../../../src/schemas/judgment.schema.js';

describe('KioGetJudgmentInputSchema', () => {
  it('should accept valid judgment request', () => {
    const result = KioGetJudgmentInputSchema.parse({
      provider: 'saos',
      provider_id: '123456',
    });
    expect(result.provider).toBe('saos');
    expect(result.provider_id).toBe('123456');
    expect(result.format_preference).toBe('text');
    expect(result.max_chars).toBe(40000);
    expect(result.offset_chars).toBe(0);
  });

  it('should accept request with all parameters', () => {
    const result = KioGetJudgmentInputSchema.parse({
      provider: 'uzp',
      provider_id: 'abc-123',
      format_preference: 'html',
      max_chars: 50000,
      offset_chars: 10000,
    });
    expect(result.provider).toBe('uzp');
    expect(result.format_preference).toBe('html');
    expect(result.max_chars).toBe(50000);
    expect(result.offset_chars).toBe(10000);
  });

  it('should reject missing provider', () => {
    expect(() => KioGetJudgmentInputSchema.parse({
      provider_id: '123',
    })).toThrow();
  });

  it('should reject empty provider_id', () => {
    expect(() => KioGetJudgmentInputSchema.parse({
      provider: 'saos',
      provider_id: '',
    })).toThrow();
  });

  it('should reject invalid provider', () => {
    expect(() => KioGetJudgmentInputSchema.parse({
      provider: 'invalid',
      provider_id: '123',
    })).toThrow();
  });
});

describe('JudgmentMetadataSchema', () => {
  it('should accept valid metadata', () => {
    const result = JudgmentMetadataSchema.parse({
      caseNumbers: ['KIO 123/23', 'KIO 124/23'],
      judgmentDate: '2023-06-15',
      judgmentType: 'SENTENCE',
      decision: 'Uwzględniono odwołanie',
      legalBases: ['Art. 226 Pzp', 'Art. 227 Pzp'],
      judges: ['Jan Kowalski', 'Anna Nowak'],
      keywords: ['zamówienia publiczne', 'odwołanie'],
      courtName: 'Krajowa Izba Odwoławcza',
    });
    expect(result.caseNumbers).toHaveLength(2);
    expect(result.judges).toHaveLength(2);
    expect(result.courtName).toBe('Krajowa Izba Odwoławcza');
  });

  it('should accept metadata with empty arrays', () => {
    const result = JudgmentMetadataSchema.parse({
      caseNumbers: [],
      judgmentDate: '2024-01-01',
      judgmentType: 'DECISION',
      legalBases: [],
      judges: [],
      keywords: [],
    });
    expect(result.caseNumbers).toHaveLength(0);
    expect(result.decision).toBeUndefined();
  });

  it('should reject invalid judgment type', () => {
    expect(() => JudgmentMetadataSchema.parse({
      caseNumbers: ['KIO 123/23'],
      judgmentDate: '2023-06-15',
      judgmentType: 'RULING',
      legalBases: [],
      judges: [],
      keywords: [],
    })).toThrow();
  });
});

describe('JudgmentContentSchema', () => {
  it('should accept valid content', () => {
    const result = JudgmentContentSchema.parse({
      text: 'Treść orzeczenia...',
      htmlUrl: 'https://example.com/judgment.html',
      pdfUrl: 'https://example.com/judgment.pdf',
    });
    expect(result.text).toBe('Treść orzeczenia...');
    expect(result.htmlUrl).toBe('https://example.com/judgment.html');
    expect(result.pdfUrl).toBe('https://example.com/judgment.pdf');
  });

  it('should accept content without URLs', () => {
    const result = JudgmentContentSchema.parse({
      text: 'Only text content',
    });
    expect(result.htmlUrl).toBeUndefined();
    expect(result.pdfUrl).toBeUndefined();
  });

  it('should reject invalid URLs', () => {
    expect(() => JudgmentContentSchema.parse({
      text: 'Content',
      htmlUrl: 'not-a-url',
    })).toThrow();
  });
});

describe('KioGetJudgmentOutputSchema', () => {
  it('should accept valid judgment output', () => {
    const result = KioGetJudgmentOutputSchema.parse({
      metadata: {
        caseNumbers: ['KIO 123/23'],
        judgmentDate: '2023-06-15',
        judgmentType: 'SENTENCE',
        legalBases: ['Art. 226 Pzp'],
        judges: ['Jan Kowalski'],
        keywords: ['zamówienia'],
      },
      content: {
        text: 'Orzeczenie KIO...',
      },
      continuation: {
        truncated: false,
      },
      sourceLinks: {
        saosHref: 'https://saos.org.pl/judgments/123',
      },
      retrievalMetadata: {
        provider: 'saos',
        providerId: '123',
        queryTimeMs: 456,
        cached: false,
      },
    });
    expect(result.metadata.caseNumbers).toHaveLength(1);
    expect(result.continuation.truncated).toBe(false);
    expect(result.retrievalMetadata.provider).toBe('saos');
  });

  it('should accept output with truncated content', () => {
    const result = KioGetJudgmentOutputSchema.parse({
      metadata: {
        caseNumbers: ['KIO 789/24'],
        judgmentDate: '2024-03-15',
        judgmentType: 'RESOLUTION',
        legalBases: [],
        judges: [],
        keywords: [],
      },
      content: {
        text: 'Partial content...',
      },
      continuation: {
        truncated: true,
        nextOffsetChars: 40000,
        totalChars: 120000,
      },
      sourceLinks: {},
      retrievalMetadata: {
        provider: 'uzp',
        providerId: 'xyz-789',
        queryTimeMs: 789,
        cached: true,
      },
    });
    expect(result.continuation.truncated).toBe(true);
    expect(result.continuation.nextOffsetChars).toBe(40000);
    expect(result.retrievalMetadata.cached).toBe(true);
  });
});
