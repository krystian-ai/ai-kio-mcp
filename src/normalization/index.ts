/**
 * Normalization module exports
 */

export {
  extractTextFromHtml,
  decodeHtmlEntities,
  normalizeWhitespace,
  extractTitle,
  extractMetaDescription,
  type TextExtractorOptions,
} from './text-extractor.js';

export {
  paginateContent,
  normalizeHtmlContent,
  mergeMetadata,
  extractCaseNumbersFromText,
  extractJudgmentDateFromText,
} from './judgment.js';
