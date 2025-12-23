import { describe, it, expect } from 'vitest';
import {
  paginateContent,
  normalizeHtmlContent,
  mergeMetadata,
  extractCaseNumbersFromText,
  extractJudgmentDateFromText,
} from '../../../src/normalization/judgment.js';
import type { NormalizedJudgmentMetadata } from '../../../src/providers/types.js';

describe('paginateContent', () => {
  const sampleText = 'A'.repeat(1000);

  it('should return full content when within maxChars', () => {
    const result = paginateContent(sampleText, 2000, 0);

    expect(result.text).toBe(sampleText);
    expect(result.continuation.truncated).toBe(false);
    expect(result.continuation.nextOffsetChars).toBeUndefined();
    expect(result.continuation.totalChars).toBe(1000);
  });

  it('should truncate content when exceeding maxChars', () => {
    const result = paginateContent(sampleText, 500, 0);

    expect(result.text.length).toBe(500);
    expect(result.continuation.truncated).toBe(true);
    expect(result.continuation.nextOffsetChars).toBe(500);
    expect(result.continuation.totalChars).toBe(1000);
  });

  it('should apply offset correctly', () => {
    const result = paginateContent(sampleText, 500, 200);

    expect(result.text.length).toBe(500);
    expect(result.continuation.truncated).toBe(true);
    expect(result.continuation.nextOffsetChars).toBe(700);
  });

  it('should handle offset near end of content', () => {
    const result = paginateContent(sampleText, 500, 800);

    expect(result.text.length).toBe(200); // Only 200 chars remaining
    expect(result.continuation.truncated).toBe(false);
    expect(result.continuation.nextOffsetChars).toBeUndefined();
  });

  it('should handle offset beyond content', () => {
    const result = paginateContent(sampleText, 500, 1500);

    expect(result.text).toBe('');
    expect(result.continuation.truncated).toBe(false);
  });

  it('should handle empty content', () => {
    const result = paginateContent('', 500, 0);

    expect(result.text).toBe('');
    expect(result.continuation.truncated).toBe(false);
    expect(result.continuation.totalChars).toBe(0);
  });
});

describe('normalizeHtmlContent', () => {
  it('should convert HTML to text and paginate', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>';
    const result = normalizeHtmlContent(html, 100, 0);

    expect(result.text).toContain('First paragraph');
    expect(result.continuation.totalChars).toBeGreaterThan(0);
  });

  it('should handle pagination of HTML content', () => {
    const html = '<p>' + 'A'.repeat(500) + '</p><p>' + 'B'.repeat(500) + '</p>';
    const result = normalizeHtmlContent(html, 300, 0);

    expect(result.text.length).toBe(300);
    expect(result.continuation.truncated).toBe(true);
  });
});

describe('mergeMetadata', () => {
  it('should merge metadata from multiple sources', () => {
    const source1: Partial<NormalizedJudgmentMetadata> = {
      caseNumbers: ['KIO 100/23'],
      judgmentDate: '2023-01-01',
      judges: ['Judge 1'],
    };

    const source2: Partial<NormalizedJudgmentMetadata> = {
      caseNumbers: ['KIO 101/23'],
      judgmentDate: '2023-06-01', // Later date takes precedence
      judges: ['Judge 2'],
      decision: 'Uwzględnia',
    };

    const result = mergeMetadata(source1, source2);

    expect(result.caseNumbers).toEqual(['KIO 100/23', 'KIO 101/23']);
    expect(result.judgmentDate).toBe('2023-06-01');
    expect(result.judges).toEqual(['Judge 1', 'Judge 2']);
    expect(result.decision).toBe('Uwzględnia');
  });

  it('should deduplicate arrays', () => {
    const source1: Partial<NormalizedJudgmentMetadata> = {
      caseNumbers: ['KIO 100/23'],
      legalBases: ['Art. 226'],
    };

    const source2: Partial<NormalizedJudgmentMetadata> = {
      caseNumbers: ['KIO 100/23', 'KIO 101/23'],
      legalBases: ['Art. 226', 'Art. 224'],
    };

    const result = mergeMetadata(source1, source2);

    expect(result.caseNumbers).toEqual(['KIO 100/23', 'KIO 101/23']);
    expect(result.legalBases).toEqual(['Art. 226', 'Art. 224']);
  });

  it('should handle empty sources', () => {
    const result = mergeMetadata({}, {});

    expect(result.caseNumbers).toEqual([]);
    expect(result.judgmentDate).toBe('');
    expect(result.judgmentType).toBe('DECISION');
  });
});

describe('extractCaseNumbersFromText', () => {
  it('should extract KIO case numbers', () => {
    const text = 'W sprawie KIO 3177/23 Izba orzekła...';
    const caseNumbers = extractCaseNumbersFromText(text);

    expect(caseNumbers).toContain('KIO 3177/23');
  });

  it('should extract multiple case numbers', () => {
    const text = 'Sprawy KIO 100/23 oraz KIO 101/23 zostały połączone.';
    const caseNumbers = extractCaseNumbersFromText(text);

    expect(caseNumbers).toHaveLength(2);
    expect(caseNumbers).toContain('KIO 100/23');
    expect(caseNumbers).toContain('KIO 101/23');
  });

  it('should extract from Sygn. akt format', () => {
    const text = 'Sygn. akt: KIO 3177/23';
    const caseNumbers = extractCaseNumbersFromText(text);

    expect(caseNumbers).toContain('KIO 3177/23');
  });

  it('should handle 4-digit years', () => {
    const text = 'Sprawa KIO 100/2023';
    const caseNumbers = extractCaseNumbersFromText(text);

    expect(caseNumbers).toContain('KIO 100/2023');
  });

  it('should return empty array when no case numbers found', () => {
    const text = 'Text without case numbers';
    const caseNumbers = extractCaseNumbersFromText(text);

    expect(caseNumbers).toEqual([]);
  });

  it('should deduplicate results', () => {
    const text = 'KIO 100/23 ... Sygn. akt: KIO 100/23';
    const caseNumbers = extractCaseNumbersFromText(text);

    expect(caseNumbers.filter((n) => n.includes('100/23'))).toHaveLength(1);
  });
});

describe('extractJudgmentDateFromText', () => {
  it('should extract ISO format date', () => {
    const text = 'Data: 2023-12-15';
    const date = extractJudgmentDateFromText(text);

    expect(date).toBe('2023-12-15');
  });

  it('should extract Polish format date', () => {
    const text = 'WYROK z dnia 15 grudnia 2023 r.';
    const date = extractJudgmentDateFromText(text);

    expect(date).toBe('2023-12-15');
  });

  it('should handle different Polish months', () => {
    expect(extractJudgmentDateFromText('z dnia 1 stycznia 2023')).toBe('2023-01-01');
    expect(extractJudgmentDateFromText('z dnia 28 lutego 2023')).toBe('2023-02-28');
    expect(extractJudgmentDateFromText('z dnia 15 marca 2023')).toBe('2023-03-15');
    expect(extractJudgmentDateFromText('z dnia 1 kwietnia 2023')).toBe('2023-04-01');
    expect(extractJudgmentDateFromText('z dnia 1 maja 2023')).toBe('2023-05-01');
    expect(extractJudgmentDateFromText('z dnia 1 czerwca 2023')).toBe('2023-06-01');
    expect(extractJudgmentDateFromText('z dnia 1 lipca 2023')).toBe('2023-07-01');
    expect(extractJudgmentDateFromText('z dnia 1 sierpnia 2023')).toBe('2023-08-01');
    expect(extractJudgmentDateFromText('z dnia 1 września 2023')).toBe('2023-09-01');
    expect(extractJudgmentDateFromText('z dnia 1 października 2023')).toBe('2023-10-01');
    expect(extractJudgmentDateFromText('z dnia 1 listopada 2023')).toBe('2023-11-01');
    expect(extractJudgmentDateFromText('z dnia 1 grudnia 2023')).toBe('2023-12-01');
  });

  it('should prefer ISO format over Polish format', () => {
    const text = '2023-12-15 z dnia 1 stycznia 2023';
    const date = extractJudgmentDateFromText(text);

    expect(date).toBe('2023-12-15');
  });

  it('should return undefined when no date found', () => {
    const text = 'No date here';
    const date = extractJudgmentDateFromText(text);

    expect(date).toBeUndefined();
  });
});
