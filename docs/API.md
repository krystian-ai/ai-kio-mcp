# mcp-kio API Reference

Complete API reference for the mcp-kio MCP server tools.

## Table of Contents

- [Tools Overview](#tools-overview)
- [kio_search](#kio_search)
- [kio_get_judgment](#kio_get_judgment)
- [kio_get_source_links](#kio_get_source_links)
- [kio_health](#kio_health)
- [Common Types](#common-types)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)

---

## Tools Overview

| Tool | Description | Rate Limit |
|------|-------------|------------|
| `kio_search` | Search for KIO court judgments | 60/min |
| `kio_get_judgment` | Retrieve full judgment content | 20/min |
| `kio_get_source_links` | Get canonical URLs for citations | 20/min |
| `kio_health` | Check provider and cache health | 10/min |

---

## kio_search

Search for KIO (Krajowa Izba Odwoławcza) court judgments.

### Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | No* | - | Full-text search query (1-500 chars) |
| `case_number` | string | No* | - | KIO case number (e.g., "KIO 123/23") |
| `date_from` | string | No | - | Start date filter (YYYY-MM-DD) |
| `date_to` | string | No | - | End date filter (YYYY-MM-DD) |
| `judgment_type` | string | No | - | Filter: SENTENCE, DECISION, RESOLUTION |
| `limit` | number | No | 20 | Results per page (1-100) |
| `page` | number | No | 1 | Page number |
| `provider` | string | No | "auto" | Provider: saos, uzp, or auto |
| `include_snippets` | boolean | No | true | Include text snippets in results |

*Either `query` or `case_number` must be provided.

### Case Number Format

Valid formats:
- `KIO 123/23` - Standard format with space
- `KIO123/23` - Without space
- `KIO 123/2023` - Full year
- `kio 456/24` - Case insensitive

### Output

```typescript
{
  results: Array<{
    id: string;                    // Unique judgment ID
    provider: "saos" | "uzp";      // Source provider
    caseNumbers: string[];         // Case numbers
    judgmentDate: string;          // YYYY-MM-DD
    judgmentType: "SENTENCE" | "DECISION" | "RESOLUTION";
    courtName?: string;            // Court name
    decision?: string;             // Decision summary
    snippet?: string;              // Text snippet with highlights
    relevanceScore?: number;       // 0-1 relevance score
  }>;
  pagination: {
    page: number;
    limit: number;
    total?: number;                // Total results if known
    hasMore: boolean;
  };
  metadata: {
    provider: "saos" | "uzp";
    queryTimeMs: number;
    cached: boolean;
  };
}
```

### Examples

**Full-text search:**
```json
{
  "query": "zamówienia publiczne",
  "limit": 10
}
```

**Case number lookup:**
```json
{
  "case_number": "KIO 2611/21"
}
```

**Date range with type filter:**
```json
{
  "query": "odwołanie",
  "date_from": "2023-01-01",
  "date_to": "2023-12-31",
  "judgment_type": "SENTENCE",
  "limit": 20
}
```

---

## kio_get_judgment

Retrieve full judgment content with character-based pagination.

### Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `provider` | string | Yes | - | Provider: saos or uzp |
| `provider_id` | string | Yes | - | Provider-specific judgment ID |
| `format_preference` | string | No | "text" | Format: text, html, or auto |
| `max_chars` | number | No | 40000 | Maximum characters (1000-100000) |
| `offset_chars` | number | No | 0 | Character offset for pagination |

### Character-Based Pagination

For large judgments that exceed `max_chars`, use character-based pagination:

1. First request: `offset_chars: 0`
2. If `continuation.truncated` is true, use `continuation.nextOffsetChars` for next request
3. Continue until `continuation.truncated` is false

### Output

```typescript
{
  metadata: {
    caseNumbers: string[];         // Case numbers
    judgmentDate: string;          // YYYY-MM-DD
    judgmentType: "SENTENCE" | "DECISION" | "RESOLUTION";
    decision?: string;             // Decision summary
    legalBases: string[];          // Referenced legal bases
    judges: string[];              // Judge names
    keywords: string[];            // Keywords/tags
    courtName?: string;            // Court name
  };
  content: {
    text: string;                  // Text content (may be truncated)
    htmlUrl?: string;              // URL to HTML version
    pdfUrl?: string;               // URL to PDF version
  };
  continuation: {
    truncated: boolean;            // True if more content available
    nextOffsetChars?: number;      // Offset for next request
    totalChars?: number;           // Total content length
  };
  sourceLinks: {
    saosHref?: string;             // SAOS detail page
    saosSourceUrl?: string;        // Original source URL
    uzpHtml?: string;              // UZP HTML version
    uzpPdf?: string;               // UZP PDF version
  };
  retrievalMetadata: {
    provider: "saos" | "uzp";
    providerId: string;
    queryTimeMs: number;
    cached: boolean;
  };
}
```

### Examples

**Basic retrieval:**
```json
{
  "provider": "saos",
  "provider_id": "123456"
}
```

**With pagination:**
```json
{
  "provider": "saos",
  "provider_id": "123456",
  "max_chars": 50000,
  "offset_chars": 50000
}
```

**HTML format preference:**
```json
{
  "provider": "uzp",
  "provider_id": "abc-123",
  "format_preference": "html"
}
```

---

## kio_get_source_links

Get canonical source URLs for citing a judgment.

### Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `provider` | string | Yes | - | Provider: saos or uzp |
| `provider_id` | string | Yes | - | Provider-specific judgment ID |

### Output

```typescript
{
  provider: "saos" | "uzp";
  providerId: string;
  links: {
    saosHref?: string;             // SAOS detail page URL
    saosSourceUrl?: string;        // Original court source URL
    uzpHtml?: string;              // UZP HTML version URL
    uzpPdf?: string;               // UZP PDF version URL
  };
  metadata: {
    queryTimeMs: number;
  };
}
```

### Examples

**Get SAOS links:**
```json
{
  "provider": "saos",
  "provider_id": "123456"
}
```

---

## kio_health

Check health status of providers and cache.

### Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `provider` | string | No | - | Check specific provider only (saos or uzp) |

### Output

```typescript
{
  healthy: boolean;                // Overall system health
  providers: Array<{
    provider: "saos" | "uzp";
    healthy: boolean;
    responseTimeMs?: number;       // Response time if healthy
    error?: string;                // Error message if unhealthy
    lastChecked: string;           // ISO datetime
  }>;
  cache: {
    type: "memory" | "redis";
    healthy: boolean;
    stats?: {
      hits: number;
      misses: number;
      size: number;
    };
  };
  server: {
    version: string;
    uptime: number;                // Seconds since start
    startedAt: string;             // ISO datetime
  };
}
```

### Examples

**Check all providers:**
```json
{}
```

**Check specific provider:**
```json
{
  "provider": "saos"
}
```

---

## Common Types

### Provider

Available data providers:

| Value | Description |
|-------|-------------|
| `saos` | System Analizy Orzeczeń Sądowych (primary) |
| `uzp` | Urząd Zamówień Publicznych (fallback) |
| `auto` | Automatic selection based on availability |

### JudgmentType

Types of court judgments:

| Value | Polish | Description |
|-------|--------|-------------|
| `SENTENCE` | Wyrok | Court sentence/verdict |
| `DECISION` | Postanowienie | Court decision |
| `RESOLUTION` | Uchwała | Court resolution |

### FormatPreference

Content format preferences:

| Value | Description |
|-------|-------------|
| `text` | Plain text (cleaned, normalized) |
| `html` | Original HTML formatting |
| `auto` | Best available format |

---

## Error Handling

All tools return errors in a consistent format:

```typescript
{
  error: string;                   // Error message
  code: string;                    // Error code
  retryable: boolean;              // Whether request can be retried
  retryAfterMs?: number;           // Suggested retry delay
}
```

### Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `RATE_LIMITED` | Too many requests | Yes |
| `PROVIDER_ERROR` | Provider API error | Yes |
| `NOT_FOUND` | Judgment not found | No |
| `VALIDATION_ERROR` | Invalid input parameters | No |
| `TIMEOUT` | Request timed out | Yes |
| `INTERNAL_ERROR` | Server error | Yes |

---

## Rate Limits

Rate limits are applied per client on a sliding window basis:

| Operation | Limit | Window |
|-----------|-------|--------|
| Search | 60 requests | 1 minute |
| Judgment retrieval | 20 requests | 1 minute |
| Health check | 10 requests | 1 minute |

When rate limited:
- HTTP clients receive `429 Too Many Requests`
- MCP tool responses include `retryable: true` and `retryAfterMs`

---

## Cache Behavior

### TTLs (Time-To-Live)

| Content Type | TTL | Rationale |
|--------------|-----|-----------|
| Search results | 15 minutes | Balance freshness with performance |
| Judgment content | 7 days | Court judgments rarely change |
| Health status | 1 minute | Quick feedback on provider status |

### Cache Configuration

By default, an in-memory cache is used. For production deployments, Redis is recommended:

```bash
REDIS_URL=redis://localhost:6379 npx mcp-kio
```

---

## TypeScript Types

For programmatic usage, all types are exported:

```typescript
import {
  // Input types
  KioSearchInput,
  KioGetJudgmentInput,
  KioGetSourceLinksInput,
  KioHealthInput,

  // Output types
  KioSearchOutput,
  KioGetJudgmentOutput,
  KioGetSourceLinksOutput,
  KioHealthOutput,

  // Common types
  Provider,
  JudgmentType,
  FormatPreference,
} from 'mcp-kio';
```
