/**
 * mcp-kio - MCP server for Polish KIO court judgments
 *
 * Main library export
 */

// Server
export {
  createKioServer,
  getServerInfo,
  registerKioTools,
  getToolDefinitions,
  type KioServerConfig,
  type KioMcpServer,
} from './server/index.js';

// Tools
export {
  createToolContext,
  closeToolContext,
  executeKioSearch,
  executeKioGetJudgment,
  executeKioGetSourceLinks,
  executeKioHealth,
  type ToolContext,
  type ToolContextConfig,
  type ToolResult,
  type ToolError,
  type ToolResponse,
} from './tools/index.js';

// Schemas
export {
  // Common schemas
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
  // Search schemas
  KioSearchInputSchema,
  SearchResultItemSchema,
  KioSearchOutputSchema,
  // Judgment schemas
  KioGetJudgmentInputSchema,
  JudgmentMetadataSchema,
  JudgmentContentSchema,
  KioGetJudgmentOutputSchema,
  // Source links schemas
  KioGetSourceLinksInputSchema,
  KioGetSourceLinksOutputSchema,
  // Health schemas
  ProviderHealthStatusSchema,
  KioHealthInputSchema,
  KioHealthOutputSchema,
  // Type exports
  type KioSearchInput,
  type SearchResultItem,
  type KioSearchOutput,
  type KioGetJudgmentInput,
  type JudgmentMetadata,
  type JudgmentContent,
  type KioGetJudgmentOutput,
  type KioGetSourceLinksInput,
  type KioGetSourceLinksOutput,
  type ProviderHealthStatus,
  type KioHealthInput,
  type KioHealthOutput,
} from './schemas/index.js';

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
  // UZP Provider
  UzpProvider,
  createUzpProvider,
  type UzpProviderConfig,
} from './providers/index.js';

// Normalization
export {
  extractTextFromHtml,
  decodeHtmlEntities,
  normalizeWhitespace,
  extractTitle,
  extractMetaDescription,
  paginateContent,
  normalizeHtmlContent,
  mergeMetadata,
  extractCaseNumbersFromText,
  extractJudgmentDateFromText,
} from './normalization/index.js';

// Cache
export {
  type Cache,
  type CacheEntry,
  type CacheConfig,
  type CacheStats,
  CacheTTL,
  MemoryCache,
  createMemoryCache,
  RedisCache,
  createRedisCache,
  isRedisConfigured,
  createCache,
} from './cache/index.js';

// Security
export {
  RateLimiter,
  createRateLimiter,
  createRateLimiters,
  RateLimits,
  type RateLimitConfig,
  DomainAllowlist,
  createAllowlist,
  createDefaultAllowlist,
  DEFAULT_ALLOWED_DOMAINS,
  type AllowlistConfig,
  AuditLogger,
  createAuditLogger,
  type AuditLoggerConfig,
  type AuditEntry,
  type AuditEventType,
} from './security/index.js';
