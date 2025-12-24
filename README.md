# mcp-kio

MCP server for searching and retrieving Polish KIO (Krajowa Izba Odwoławcza) court judgments.

## Features

- **kio_search** - Search judgments by query, case number, date range, or type
- **kio_get_judgment** - Retrieve full judgment content with pagination
- **kio_get_source_links** - Get canonical URLs for citations
- **kio_health** - Check provider and cache health status

## Installation

```bash
npm install mcp-kio
```

## Usage

### Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "kio": {
      "command": "npx",
      "args": ["mcp-kio"]
    }
  }
}
```

### Command Line

```bash
# stdio transport (local)
npx mcp-kio

# HTTP transport (remote)
PORT=3000 npx mcp-kio-http
```

### Programmatic Usage

```typescript
import { createKioServer } from 'mcp-kio';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createKioServer({ version: '1.0.0' });
await server.server.connect(new StdioServerTransport());
```

## Tools

### kio_search

Search for KIO court judgments.

**Parameters:**
- `query` (string, optional) - Full-text search query
- `case_number` (string, optional) - KIO case number (e.g., "KIO 123/23")
- `date_from` (string, optional) - Start date (YYYY-MM-DD)
- `date_to` (string, optional) - End date (YYYY-MM-DD)
- `judgment_type` (string, optional) - Filter by type: SENTENCE, DECISION, RESOLUTION
- `limit` (number, default: 20) - Results per page (1-100)
- `page` (number, default: 1) - Page number
- `provider` (string, default: "auto") - Provider: saos, uzp, or auto
- `include_snippets` (boolean, default: true) - Include text snippets

**Example:**
```json
{
  "query": "zamówienia publiczne",
  "date_from": "2023-01-01",
  "limit": 10
}
```

### kio_get_judgment

Retrieve full judgment content with character-based pagination.

**Parameters:**
- `provider` (string, required) - Provider: saos or uzp
- `provider_id` (string, required) - Provider-specific judgment ID
- `format_preference` (string, default: "text") - Format: text, html, or auto
- `max_chars` (number, default: 40000) - Maximum characters (1000-100000)
- `offset_chars` (number, default: 0) - Character offset for pagination

**Example:**
```json
{
  "provider": "saos",
  "provider_id": "123456",
  "max_chars": 50000
}
```

### kio_get_source_links

Get canonical source URLs for citing a judgment.

**Parameters:**
- `provider` (string, required) - Provider: saos or uzp
- `provider_id` (string, required) - Provider-specific judgment ID

### kio_health

Check health status of providers and cache.

**Parameters:**
- `provider` (string, optional) - Check specific provider only

## Data Sources

- **SAOS** - System Analizy Orzeczeń Sądowych (primary)
- **UZP** - Urząd Zamówień Publicznych (fallback)

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | 3000 |
| `HOST` | HTTP server host | 0.0.0.0 |
| `REDIS_URL` | Redis connection URL (optional) | Memory cache |

## Rate Limits

- Search: 60 requests/minute
- Judgment retrieval: 20 requests/minute
- Health check: 10 requests/minute

## Cache TTLs

- Search results: 15 minutes
- Judgment content: 7 days
- Health status: 1 minute

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run integration tests (requires network)
INTEGRATION_TESTS=1 npm test -- tests/integration/

# Development mode
npm run dev:stdio
npm run dev:http
```

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/stdio.js
```

## License

MIT
