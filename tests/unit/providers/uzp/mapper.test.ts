import { describe, it, expect } from 'vitest';
import {
  mapUzpMetadata,
  mapUzpContent,
  buildUzpSourceLinks,
  inferJudgmentType,
  parseUzpHtml,
} from '../../../../src/providers/uzp/mapper.js';

describe('parseUzpHtml', () => {
  it('should extract case numbers from HTML', () => {
    const html = `
      <h1>WYROK</h1>
      <p>Sygn. akt: KIO 3177/23</p>
    `;

    const result = parseUzpHtml(html);

    expect(result.caseNumbers).toContain('KIO 3177/23');
  });

  it('should extract judgment date', () => {
    const html = `
      <h1>WYROK</h1>
      <p>z dnia 15 grudnia 2023 r.</p>
    `;

    const result = parseUzpHtml(html);

    expect(result.judgmentDate).toBe('2023-12-15');
  });

  it('should set default court name', () => {
    const html = '<p>Some content</p>';

    const result = parseUzpHtml(html);

    expect(result.courtName).toBe('Krajowa Izba Odwoławcza');
  });
});

describe('inferJudgmentType', () => {
  it('should detect SENTENCE from "wyrok"', () => {
    expect(inferJudgmentType('<h1>WYROK</h1>')).toBe('SENTENCE');
  });

  it('should detect SENTENCE from "orzeka"', () => {
    expect(inferJudgmentType('<p>Izba orzeka:</p>')).toBe('SENTENCE');
  });

  it('should detect DECISION from "postanowienie"', () => {
    expect(inferJudgmentType('<h1>POSTANOWIENIE</h1>')).toBe('DECISION');
  });

  it('should detect RESOLUTION from "uchwała"', () => {
    expect(inferJudgmentType('<h1>UCHWAŁA</h1>')).toBe('RESOLUTION');
  });

  it('should default to DECISION', () => {
    expect(inferJudgmentType('<p>Some text</p>')).toBe('DECISION');
  });
});

describe('mapUzpMetadata', () => {
  it('should map HTML to normalized metadata', () => {
    const html = `
      <h1>WYROK</h1>
      <p>z dnia 15 grudnia 2023 r.</p>
      <p>Sygn. akt: KIO 3177/23</p>
    `;

    const metadata = mapUzpMetadata(html, 'kio-3177-23');

    expect(metadata.caseNumbers).toContain('KIO 3177/23');
    expect(metadata.judgmentDate).toBe('2023-12-15');
    expect(metadata.judgmentType).toBe('SENTENCE');
    expect(metadata.courtName).toBe('Krajowa Izba Odwoławcza');
  });

  it('should use providerId as fallback for case numbers', () => {
    const html = '<p>Some content without case number</p>';

    const metadata = mapUzpMetadata(html, 'KIO-100-23');

    expect(metadata.caseNumbers).toContain('KIO-100-23');
  });

  it('should return empty date when not found', () => {
    const html = '<p>No date here</p>';

    const metadata = mapUzpMetadata(html, 'id');

    expect(metadata.judgmentDate).toBe('');
  });
});

describe('mapUzpContent', () => {
  const baseUrl = 'https://orzeczenia.uzp.gov.pl';

  it('should convert HTML to text content', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>';

    const content = mapUzpContent(html, 'test-id', baseUrl);

    expect(content.text).toContain('First paragraph');
    expect(content.text).toContain('Second paragraph');
  });

  it('should include HTML URL', () => {
    const content = mapUzpContent('<p>Text</p>', 'test-123', baseUrl);

    expect(content.htmlUrl).toBe('https://orzeczenia.uzp.gov.pl/Home/ContentHtml/test-123?Kind=KIO');
  });

  it('should include PDF URL', () => {
    const content = mapUzpContent('<p>Text</p>', 'test-123', baseUrl);

    expect(content.pdfUrl).toBe('https://orzeczenia.uzp.gov.pl/Home/PdfContent/test-123?Kind=KIO');
  });

  it('should handle different kinds', () => {
    const content = mapUzpContent('<p>Text</p>', 'test-123', baseUrl, 'KIO');

    expect(content.htmlUrl).toContain('Kind=KIO');
  });
});

describe('buildUzpSourceLinks', () => {
  const baseUrl = 'https://orzeczenia.uzp.gov.pl';

  it('should build source links', () => {
    const links = buildUzpSourceLinks('kio-3177-23', baseUrl);

    expect(links.uzpHtml).toBe('https://orzeczenia.uzp.gov.pl/Home/ContentHtml/kio-3177-23?Kind=KIO');
    expect(links.uzpPdf).toBe('https://orzeczenia.uzp.gov.pl/Home/PdfContent/kio-3177-23?Kind=KIO');
  });

  it('should not include SAOS links', () => {
    const links = buildUzpSourceLinks('test', baseUrl);

    expect(links.saosHref).toBeUndefined();
    expect(links.saosSourceUrl).toBeUndefined();
  });
});
