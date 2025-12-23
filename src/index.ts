/**
 * mcp-kio - MCP server for Polish KIO court judgments
 *
 * Main library export
 */

// Configuration
export { loadConfig, ConfigError, defaults } from './config/index.js';
export type { KioConfig, LogLevel, CacheType } from './config/index.js';

// Utilities
export {
  KioError,
  ProviderError,
  RateLimitError,
  ValidationError,
  NotFoundError,
  TimeoutError,
  DomainNotAllowedError,
  isKioError,
  wrapError,
  sha256,
  shortHash,
  cacheKey,
  generateRequestId,
} from './utils/index.js';

// Providers
export {
  // Types
  type Provider,
  type JudgmentType,
  type ProviderPreference,
  type FormatPreference,
  type NormalizedSearchResult,
  type NormalizedJudgmentMetadata,
  type NormalizedJudgmentContent,
  type SourceLinks,
  type ContinuationInfo,
  type SearchParams,
  type SearchResponse,
  type JudgmentParams,
  type JudgmentResponse,
  type HealthStatus,
  type KioProvider,
  // SAOS Provider
  SaosProvider,
  createSaosProvider,
  type SaosProviderConfig,
} from './providers/index.js';
