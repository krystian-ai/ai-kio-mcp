import { describe, it, expect } from 'vitest';
import {
  mapJudgmentType,
  extractCaseNumbers,
  extractJudgeNames,
  mapSearchResult,
  mapJudgmentMetadata,
  mapJudgmentContent,
  buildSourceLinks,
} from '../../../../src/providers/saos/mapper.js';
import type { SaosSearchResultItem, SaosJudgmentResponse } from '../../../../src/providers/saos/types.js';

describe('mapJudgmentType', () => {
  it('should map SENTENCE to SENTENCE', () => {
    expect(mapJudgmentType('SENTENCE')).toBe('SENTENCE');
  });

  it('should map DECISION to DECISION', () => {
    expect(mapJudgmentType('DECISION')).toBe('DECISION');
  });

  it('should map RESOLUTION to RESOLUTION', () => {
    expect(mapJudgmentType('RESOLUTION')).toBe('RESOLUTION');
  });

  it('should map REASONS to DECISION', () => {
    expect(mapJudgmentType('REASONS')).toBe('DECISION');
  });
});

describe('extractCaseNumbers', () => {
  it('should extract case numbers from court cases', () => {
    const courtCases = [
      { caseNumber: 'KIO 3177/23' },
      { caseNumber: 'KIO 3178/23' },
    ];

    expect(extractCaseNumbers(courtCases)).toEqual(['KIO 3177/23', 'KIO 3178/23']);
  });

  it('should return empty array for empty input', () => {
    expect(extractCaseNumbers([])).toEqual([]);
  });
});

describe('extractJudgeNames', () => {
  it('should extract judge names', () => {
    const judges = [
      { name: 'Jan Kowalski', function: 'przewodniczący' },
      { name: 'Anna Nowak' },
    ];

    expect(extractJudgeNames(judges)).toEqual(['Jan Kowalski', 'Anna Nowak']);
  });

  it('should return empty array for empty input', () => {
    expect(extractJudgeNames([])).toEqual([]);
  });
});

describe('mapSearchResult', () => {
  const baseUrl = 'https://www.saos.org.pl';

  it('should map search result item correctly', () => {
    const item: SaosSearchResultItem = {
      id: 524389,
      courtType: 'NATIONAL_APPEAL_CHAMBER',
      courtCases: [{ caseNumber: 'KIO 3177/23' }],
      judgmentType: 'SENTENCE',
      judgmentDate: '2023-12-15',
      judges: [{ name: 'Jan Kowalski' }],
      source: { code: 'KIO' },
      decision: 'uwzględnia odwołanie',
      summary: 'Test summary content',
    };

    const result = mapSearchResult(item, baseUrl);

    expect(result).toEqual({
      provider: 'saos',
      providerId: '524389',
      caseNumbers: ['KIO 3177/23'],
      judgmentDate: '2023-12-15',
      judgmentType: 'SENTENCE',
      decision: 'uwzględnia odwołanie',
      snippet: 'Test summary content',
      sourceUrl: 'https://www.saos.org.pl/judgments/524389',
    });
  });

  it('should use thesis as snippet when summary is missing', () => {
    const item: SaosSearchResultItem = {
      id: 12345,
      courtType: 'NATIONAL_APPEAL_CHAMBER',
      courtCases: [{ caseNumber: 'KIO 100/23' }],
      judgmentType: 'DECISION',
      judgmentDate: '2023-06-01',
      judges: [],
      source: { code: 'KIO' },
      thesis: 'This is a thesis',
    };

    const result = mapSearchResult(item, baseUrl);

    expect(result.snippet).toBe('This is a thesis');
  });

  it('should truncate long snippets', () => {
    const longText = 'A'.repeat(500);
    const item: SaosSearchResultItem = {
      id: 12345,
      courtType: 'NATIONAL_APPEAL_CHAMBER',
      courtCases: [{ caseNumber: 'KIO 100/23' }],
      judgmentType: 'DECISION',
      judgmentDate: '2023-06-01',
      judges: [],
      source: { code: 'KIO' },
      summary: longText,
    };

    const result = mapSearchResult(item, baseUrl);

    expect(result.snippet?.length).toBeLessThanOrEqual(303); // 300 + '...'
    expect(result.snippet?.endsWith('...')).toBe(true);
  });

  it('should handle multiple case numbers', () => {
    const item: SaosSearchResultItem = {
      id: 12345,
      courtType: 'NATIONAL_APPEAL_CHAMBER',
      courtCases: [
        { caseNumber: 'KIO 100/23' },
        { caseNumber: 'KIO 101/23' },
      ],
      judgmentType: 'SENTENCE',
      judgmentDate: '2023-06-01',
      judges: [],
      source: { code: 'KIO' },
    };

    const result = mapSearchResult(item, baseUrl);

    expect(result.caseNumbers).toEqual(['KIO 100/23', 'KIO 101/23']);
  });
});

describe('mapJudgmentMetadata', () => {
  it('should map judgment metadata correctly', () => {
    const response: SaosJudgmentResponse = {
      id: 524389,
      courtType: 'NATIONAL_APPEAL_CHAMBER',
      courtCases: [{ caseNumber: 'KIO 3177/23' }],
      judgmentType: 'SENTENCE',
      judgmentDate: '2023-12-15',
      judges: [
        { name: 'Jan Kowalski', function: 'przewodniczący' },
        { name: 'Anna Nowak' },
      ],
      source: { code: 'KIO' },
      decision: 'uwzględnia odwołanie',
      textContent: 'Full judgment text...',
      legalBases: ['Art. 226 ust. 1 pkt 8 ustawy Pzp'],
      keywords: ['rażąco niska cena'],
    };

    const metadata = mapJudgmentMetadata(response);

    expect(metadata).toEqual({
      caseNumbers: ['KIO 3177/23'],
      judgmentDate: '2023-12-15',
      judgmentType: 'SENTENCE',
      decision: 'uwzględnia odwołanie',
      legalBases: ['Art. 226 ust. 1 pkt 8 ustawy Pzp'],
      judges: ['Jan Kowalski', 'Anna Nowak'],
      keywords: ['rażąco niska cena'],
      courtName: 'Krajowa Izba Odwoławcza',
    });
  });

  it('should handle missing optional fields', () => {
    const response: SaosJudgmentResponse = {
      id: 12345,
      courtType: 'NATIONAL_APPEAL_CHAMBER',
      courtCases: [{ caseNumber: 'KIO 100/23' }],
      judgmentType: 'DECISION',
      judgmentDate: '2023-06-01',
      judges: [],
      source: { code: 'KIO' },
      textContent: 'Text',
    };

    const metadata = mapJudgmentMetadata(response);

    expect(metadata.legalBases).toEqual([]);
    expect(metadata.judges).toEqual([]);
    expect(metadata.keywords).toEqual([]);
    expect(metadata.decision).toBeUndefined();
  });
});

describe('mapJudgmentContent', () => {
  const baseUrl = 'https://www.saos.org.pl';

  it('should map judgment content correctly', () => {
    const response: SaosJudgmentResponse = {
      id: 524389,
      courtType: 'NATIONAL_APPEAL_CHAMBER',
      courtCases: [{ caseNumber: 'KIO 3177/23' }],
      judgmentType: 'SENTENCE',
      judgmentDate: '2023-12-15',
      judges: [],
      source: {
        code: 'KIO',
        judgmentUrl: 'https://example.com/pdf/524389.pdf',
      },
      textContent: 'Full judgment text here',
    };

    const content = mapJudgmentContent(response, baseUrl);

    expect(content).toEqual({
      text: 'Full judgment text here',
      htmlUrl: undefined,
      pdfUrl: 'https://example.com/pdf/524389.pdf',
    });
  });
});

describe('buildSourceLinks', () => {
  const baseUrl = 'https://www.saos.org.pl';

  it('should build source links correctly', () => {
    const response: SaosJudgmentResponse = {
      id: 524389,
      courtType: 'NATIONAL_APPEAL_CHAMBER',
      courtCases: [{ caseNumber: 'KIO 3177/23' }],
      judgmentType: 'SENTENCE',
      judgmentDate: '2023-12-15',
      judges: [],
      source: {
        code: 'KIO',
        judgmentUrl: 'https://orzeczenia.uzp.gov.pl/pdf/524389',
      },
      textContent: 'Text',
    };

    const links = buildSourceLinks(524389, response, baseUrl);

    expect(links).toEqual({
      saosHref: 'https://www.saos.org.pl/judgments/524389',
      saosSourceUrl: 'https://orzeczenia.uzp.gov.pl/pdf/524389',
      uzpHtml: undefined,
      uzpPdf: undefined,
    });
  });
});
