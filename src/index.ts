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
