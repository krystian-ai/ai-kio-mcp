import { describe, it, expect } from 'vitest';
import {
  ProviderSchema,
  ProviderPreferenceSchema,
  JudgmentTypeSchema,
  FormatPreferenceSchema,
  DateStringSchema,
  CaseNumberSchema,
  LimitSchema,
  PageSchema,
  MaxCharsSchema,
  OffsetCharsSchema,
  ContinuationInfoSchema,
  SourceLinksSchema,
  ErrorResponseSchema,
} from '../../../src/schemas/common.schema.js';

describe('ProviderSchema', () => {
  it('should accept valid providers', () => {
    expect(ProviderSchema.parse('saos')).toBe('saos');
    expect(ProviderSchema.parse('uzp')).toBe('uzp');
  });

  it('should reject invalid providers', () => {
    expect(() => ProviderSchema.parse('invalid')).toThrow();
  });
});

describe('ProviderPreferenceSchema', () => {
  it('should accept valid preferences', () => {
    expect(ProviderPreferenceSchema.parse('saos')).toBe('saos');
    expect(ProviderPreferenceSchema.parse('uzp')).toBe('uzp');
    expect(ProviderPreferenceSchema.parse('auto')).toBe('auto');
  });

  it('should reject invalid preferences', () => {
    expect(() => ProviderPreferenceSchema.parse('invalid')).toThrow();
  });
});

describe('JudgmentTypeSchema', () => {
  it('should accept valid judgment types', () => {
    expect(JudgmentTypeSchema.parse('SENTENCE')).toBe('SENTENCE');
    expect(JudgmentTypeSchema.parse('DECISION')).toBe('DECISION');
    expect(JudgmentTypeSchema.parse('RESOLUTION')).toBe('RESOLUTION');
  });

  it('should reject invalid types', () => {
    expect(() => JudgmentTypeSchema.parse('RULING')).toThrow();
  });
});

describe('FormatPreferenceSchema', () => {
  it('should accept valid formats', () => {
    expect(FormatPreferenceSchema.parse('text')).toBe('text');
    expect(FormatPreferenceSchema.parse('html')).toBe('html');
    expect(FormatPreferenceSchema.parse('auto')).toBe('auto');
  });

  it('should reject invalid formats', () => {
    expect(() => FormatPreferenceSchema.parse('pdf')).toThrow();
  });
});

describe('DateStringSchema', () => {
  it('should accept valid date strings', () => {
    expect(DateStringSchema.parse('2023-01-15')).toBe('2023-01-15');
    expect(DateStringSchema.parse('2024-12-31')).toBe('2024-12-31');
  });

  it('should accept undefined', () => {
    expect(DateStringSchema.parse(undefined)).toBeUndefined();
  });

  it('should reject invalid date formats', () => {
    expect(() => DateStringSchema.parse('2023/01/15')).toThrow();
    expect(() => DateStringSchema.parse('01-15-2023')).toThrow();
    expect(() => DateStringSchema.parse('2023-1-15')).toThrow();
  });
});

describe('CaseNumberSchema', () => {
  it('should accept valid KIO case numbers', () => {
    expect(CaseNumberSchema.parse('KIO 123/23')).toBe('KIO 123/23');
    expect(CaseNumberSchema.parse('KIO 123/2023')).toBe('KIO 123/2023');
    expect(CaseNumberSchema.parse('kio 456/24')).toBe('kio 456/24');
    expect(CaseNumberSchema.parse('KIO123/23')).toBe('KIO123/23');
  });

  it('should accept undefined', () => {
    expect(CaseNumberSchema.parse(undefined)).toBeUndefined();
  });

  it('should reject invalid case numbers', () => {
    expect(() => CaseNumberSchema.parse('123/23')).toThrow();
    expect(() => CaseNumberSchema.parse('ABC 123/23')).toThrow();
  });
});

describe('LimitSchema', () => {
  it('should accept valid limits', () => {
    expect(LimitSchema.parse(1)).toBe(1);
    expect(LimitSchema.parse(50)).toBe(50);
    expect(LimitSchema.parse(100)).toBe(100);
  });

  it('should use default value of 20', () => {
    expect(LimitSchema.parse(undefined)).toBe(20);
  });

  it('should reject out of range limits', () => {
    expect(() => LimitSchema.parse(0)).toThrow();
    expect(() => LimitSchema.parse(101)).toThrow();
  });
});

describe('PageSchema', () => {
  it('should accept valid page numbers', () => {
    expect(PageSchema.parse(1)).toBe(1);
    expect(PageSchema.parse(100)).toBe(100);
  });

  it('should use default value of 1', () => {
    expect(PageSchema.parse(undefined)).toBe(1);
  });

  it('should reject zero or negative pages', () => {
    expect(() => PageSchema.parse(0)).toThrow();
    expect(() => PageSchema.parse(-1)).toThrow();
  });
});

describe('MaxCharsSchema', () => {
  it('should accept valid char limits', () => {
    expect(MaxCharsSchema.parse(1000)).toBe(1000);
    expect(MaxCharsSchema.parse(50000)).toBe(50000);
    expect(MaxCharsSchema.parse(100000)).toBe(100000);
  });

  it('should use default value of 40000', () => {
    expect(MaxCharsSchema.parse(undefined)).toBe(40000);
  });

  it('should reject out of range values', () => {
    expect(() => MaxCharsSchema.parse(999)).toThrow();
    expect(() => MaxCharsSchema.parse(100001)).toThrow();
  });
});

describe('OffsetCharsSchema', () => {
  it('should accept valid offsets', () => {
    expect(OffsetCharsSchema.parse(0)).toBe(0);
    expect(OffsetCharsSchema.parse(1000)).toBe(1000);
  });

  it('should use default value of 0', () => {
    expect(OffsetCharsSchema.parse(undefined)).toBe(0);
  });

  it('should reject negative offsets', () => {
    expect(() => OffsetCharsSchema.parse(-1)).toThrow();
  });
});

describe('ContinuationInfoSchema', () => {
  it('should accept valid continuation info', () => {
    const result = ContinuationInfoSchema.parse({
      truncated: true,
      nextOffsetChars: 40000,
      totalChars: 120000,
    });
    expect(result.truncated).toBe(true);
    expect(result.nextOffsetChars).toBe(40000);
    expect(result.totalChars).toBe(120000);
  });

  it('should accept info without optional fields', () => {
    const result = ContinuationInfoSchema.parse({
      truncated: false,
    });
    expect(result.truncated).toBe(false);
    expect(result.nextOffsetChars).toBeUndefined();
  });
});

describe('SourceLinksSchema', () => {
  it('should accept valid source links', () => {
    const result = SourceLinksSchema.parse({
      saosHref: 'https://saos.org.pl/judgments/123',
      uzpHtml: 'https://uzp.gov.pl/orzeczenia/456',
    });
    expect(result.saosHref).toBe('https://saos.org.pl/judgments/123');
    expect(result.uzpHtml).toBe('https://uzp.gov.pl/orzeczenia/456');
  });

  it('should accept empty source links', () => {
    const result = SourceLinksSchema.parse({});
    expect(result.saosHref).toBeUndefined();
  });

  it('should reject invalid URLs', () => {
    expect(() => SourceLinksSchema.parse({
      saosHref: 'not-a-url',
    })).toThrow();
  });
});

describe('ErrorResponseSchema', () => {
  it('should accept valid error response', () => {
    const result = ErrorResponseSchema.parse({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT',
      retryable: true,
      retryAfterMs: 5000,
    });
    expect(result.error).toBe('Rate limit exceeded');
    expect(result.code).toBe('RATE_LIMIT');
    expect(result.retryable).toBe(true);
    expect(result.retryAfterMs).toBe(5000);
  });

  it('should accept error without retryAfterMs', () => {
    const result = ErrorResponseSchema.parse({
      error: 'Not found',
      code: 'NOT_FOUND',
      retryable: false,
    });
    expect(result.retryAfterMs).toBeUndefined();
  });
});
