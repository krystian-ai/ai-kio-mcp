/**
 * HTML to text extraction utilities
 * Converts HTML content to clean plain text for LLM consumption
 */

/**
 * Options for text extraction
 */
export interface TextExtractorOptions {
  /** Preserve paragraph breaks as double newlines */
  preserveParagraphs?: boolean;
  /** Preserve list formatting */
  preserveLists?: boolean;
  /** Maximum consecutive newlines to allow */
  maxConsecutiveNewlines?: number;
}

const defaultOptions: TextExtractorOptions = {
  preserveParagraphs: true,
  preserveLists: true,
  maxConsecutiveNewlines: 2,
};

/**
 * Extract plain text from HTML content
 */
export function extractTextFromHtml(
  html: string,
  options: TextExtractorOptions = {}
): string {
  const opts = { ...defaultOptions, ...options };

  let text = html;

  // Remove script and style tags with content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Handle block elements - add newlines
  const blockElements = [
    'p', 'div', 'section', 'article', 'header', 'footer', 'aside',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'address',
    'table', 'tr', 'thead', 'tbody', 'tfoot',
  ];

  for (const tag of blockElements) {
    // Opening tag - add newline before
    text = text.replace(new RegExp(`<${tag}[^>]*>`, 'gi'), '\n');
    // Closing tag - add newline after
    text = text.replace(new RegExp(`</${tag}>`, 'gi'), '\n');
  }

  // Handle line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Handle lists
  if (opts.preserveLists) {
    text = text.replace(/<li[^>]*>/gi, '\n• ');
    text = text.replace(/<\/li>/gi, '');
    text = text.replace(/<[ou]l[^>]*>/gi, '\n');
    text = text.replace(/<\/[ou]l>/gi, '\n');
  } else {
    text = text.replace(/<li[^>]*>/gi, '\n');
    text = text.replace(/<\/li>/gi, '');
    text = text.replace(/<[ou]l[^>]*>/gi, '');
    text = text.replace(/<\/[ou]l>/gi, '');
  }

  // Handle table cells - add spacing
  text = text.replace(/<td[^>]*>/gi, ' ');
  text = text.replace(/<\/td>/gi, ' | ');
  text = text.replace(/<th[^>]*>/gi, ' ');
  text = text.replace(/<\/th>/gi, ' | ');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Normalize whitespace
  text = normalizeWhitespace(text, opts.maxConsecutiveNewlines ?? 2);

  return text.trim();
}

/**
 * Decode common HTML entities
 */
export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '...',
    '&laquo;': '«',
    '&raquo;': '»',
    '&bdquo;': '„',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&bull;': '•',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&sect;': '§',
    '&para;': '¶',
    '&deg;': '°',
    '&plusmn;': '±',
    '&frac12;': '½',
    '&frac14;': '¼',
    '&frac34;': '¾',
    '&times;': '×',
    '&divide;': '÷',
  };

  let result = text;

  // Named entities
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }

  // Numeric entities (decimal)
  result = result.replace(/&#(\d+);/g, (_, code) => {
    const num = parseInt(code, 10);
    return String.fromCharCode(num);
  });

  // Numeric entities (hex)
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => {
    const num = parseInt(code, 16);
    return String.fromCharCode(num);
  });

  return result;
}

/**
 * Normalize whitespace in text
 */
export function normalizeWhitespace(text: string, maxNewlines: number = 2): string {
  // Replace tabs with spaces
  let result = text.replace(/\t/g, ' ');

  // Replace multiple spaces (but not newlines) with single space
  result = result.replace(/[^\S\n]+/g, ' ');

  // Trim whitespace from each line
  result = result
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // Limit consecutive newlines
  const newlinePattern = new RegExp(`\n{${maxNewlines + 1},}`, 'g');
  result = result.replace(newlinePattern, '\n'.repeat(maxNewlines));

  return result;
}

/**
 * Extract title from HTML document
 */
export function extractTitle(html: string): string | undefined {
  // Try <title> tag first
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(titleMatch[1]).trim();
  }

  // Try <h1> tag
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match?.[1]) {
    return decodeHtmlEntities(h1Match[1]).trim();
  }

  return undefined;
}

/**
 * Extract meta description from HTML document
 */
export function extractMetaDescription(html: string): string | undefined {
  const match = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
  );
  if (match?.[1]) {
    return decodeHtmlEntities(match[1]).trim();
  }
  return undefined;
}
