import { describe, it, expect } from 'vitest';
import {
  extractTextFromHtml,
  decodeHtmlEntities,
  normalizeWhitespace,
  extractTitle,
  extractMetaDescription,
} from '../../../src/normalization/text-extractor.js';

describe('extractTextFromHtml', () => {
  it('should extract plain text from simple HTML', () => {
    const html = '<p>Hello, world!</p>';
    const text = extractTextFromHtml(html);
    expect(text).toBe('Hello, world!');
  });

  it('should handle nested elements', () => {
    const html = '<div><p>First <strong>paragraph</strong></p><p>Second paragraph</p></div>';
    const text = extractTextFromHtml(html);
    expect(text).toContain('First paragraph');
    expect(text).toContain('Second paragraph');
  });

  it('should remove script and style tags', () => {
    const html = `
      <p>Visible text</p>
      <script>alert('hidden');</script>
      <style>.hidden { display: none; }</style>
      <p>More text</p>
    `;
    const text = extractTextFromHtml(html);
    expect(text).toContain('Visible text');
    expect(text).toContain('More text');
    expect(text).not.toContain('alert');
    expect(text).not.toContain('display');
  });

  it('should handle line breaks', () => {
    const html = 'Line 1<br>Line 2<br/>Line 3';
    const text = extractTextFromHtml(html);
    expect(text).toContain('Line 1');
    expect(text).toContain('Line 2');
    expect(text).toContain('Line 3');
  });

  it('should preserve list formatting', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const text = extractTextFromHtml(html, { preserveLists: true });
    expect(text).toContain('• Item 1');
    expect(text).toContain('• Item 2');
  });

  it('should decode HTML entities', () => {
    const html = '<p>Test &amp; example &mdash; with entities</p>';
    const text = extractTextFromHtml(html);
    expect(text).toBe('Test & example — with entities');
  });

  it('should limit consecutive newlines', () => {
    const html = '<p>First</p><p></p><p></p><p></p><p>Second</p>';
    const text = extractTextFromHtml(html, { maxConsecutiveNewlines: 2 });
    const newlineCount = (text.match(/\n/g) || []).length;
    expect(newlineCount).toBeLessThanOrEqual(4); // At most 2 consecutive newlines
  });

  it('should handle tables', () => {
    const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
    const text = extractTextFromHtml(html);
    expect(text).toContain('Cell 1');
    expect(text).toContain('Cell 2');
  });

  it('should handle empty input', () => {
    expect(extractTextFromHtml('')).toBe('');
  });

  it('should handle Polish legal document structure', () => {
    const html = `
      <h1>WYROK</h1>
      <p>z dnia 15 grudnia 2023 r.</p>
      <p>Sygn. akt: KIO 3177/23</p>
      <p><strong>Krajowa Izba Odwoławcza</strong> orzeka:</p>
      <ol>
        <li>Uwzględnia odwołanie.</li>
        <li>Kosztami obciąża Zamawiającego.</li>
      </ol>
    `;
    const text = extractTextFromHtml(html);
    expect(text).toContain('WYROK');
    expect(text).toContain('z dnia 15 grudnia 2023 r.');
    expect(text).toContain('KIO 3177/23');
    expect(text).toContain('Uwzględnia odwołanie');
  });
});

describe('decodeHtmlEntities', () => {
  it('should decode named entities', () => {
    expect(decodeHtmlEntities('&amp;')).toBe('&');
    expect(decodeHtmlEntities('&lt;')).toBe('<');
    expect(decodeHtmlEntities('&gt;')).toBe('>');
    expect(decodeHtmlEntities('&quot;')).toBe('"');
    expect(decodeHtmlEntities('&nbsp;')).toBe(' ');
    expect(decodeHtmlEntities('&mdash;')).toBe('—');
    expect(decodeHtmlEntities('&ndash;')).toBe('–');
  });

  it('should decode decimal numeric entities', () => {
    expect(decodeHtmlEntities('&#65;')).toBe('A');
    expect(decodeHtmlEntities('&#8212;')).toBe('—');
  });

  it('should decode hex numeric entities', () => {
    expect(decodeHtmlEntities('&#x41;')).toBe('A');
    expect(decodeHtmlEntities('&#x2014;')).toBe('—');
  });

  it('should handle mixed content', () => {
    expect(decodeHtmlEntities('Test &amp; &#65; &#x42;')).toBe('Test & A B');
  });

  it('should preserve non-entity text', () => {
    expect(decodeHtmlEntities('Normal text')).toBe('Normal text');
  });
});

describe('normalizeWhitespace', () => {
  it('should replace tabs with spaces', () => {
    expect(normalizeWhitespace('a\tb')).toBe('a b');
  });

  it('should collapse multiple spaces', () => {
    expect(normalizeWhitespace('a    b')).toBe('a b');
  });

  it('should trim lines', () => {
    expect(normalizeWhitespace('  line 1  \n  line 2  ')).toBe('line 1\nline 2');
  });

  it('should limit consecutive newlines', () => {
    const input = 'a\n\n\n\n\nb';
    const result = normalizeWhitespace(input, 2);
    expect(result).toBe('a\n\nb');
  });
});

describe('extractTitle', () => {
  it('should extract title from title tag', () => {
    const html = '<html><head><title>Test Title</title></head></html>';
    expect(extractTitle(html)).toBe('Test Title');
  });

  it('should extract title from h1 tag', () => {
    const html = '<html><body><h1>Main Heading</h1></body></html>';
    expect(extractTitle(html)).toBe('Main Heading');
  });

  it('should prefer title tag over h1', () => {
    const html = '<html><head><title>Title Tag</title></head><body><h1>H1 Tag</h1></body></html>';
    expect(extractTitle(html)).toBe('Title Tag');
  });

  it('should return undefined when no title found', () => {
    const html = '<html><body><p>No title here</p></body></html>';
    expect(extractTitle(html)).toBeUndefined();
  });
});

describe('extractMetaDescription', () => {
  it('should extract meta description', () => {
    const html = '<html><head><meta name="description" content="Test description"></head></html>';
    expect(extractMetaDescription(html)).toBe('Test description');
  });

  it('should return undefined when not found', () => {
    const html = '<html><head></head></html>';
    expect(extractMetaDescription(html)).toBeUndefined();
  });
});
