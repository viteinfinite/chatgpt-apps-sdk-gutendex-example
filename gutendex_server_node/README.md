# Gutendex MCP server (Node)

This directory contains a minimal Model Context Protocol (MCP) server implemented with the official TypeScript SDK. The server exposes a Project Gutenberg search tool backed by the public [Gutendex](https://gutendex.com) API and returns an Apps SDK widget to render results inline.

## Run the server

First, build the widget assets at the repo root so the server can serve the HTML template:

```
pnpm run build
```

Then start the server:

```
cd gutendex_server_node
pnpm start
```

The server uses Server‑Sent Events (SSE), compatible with the MCP Inspector and ChatGPT connectors.

- SSE stream: `GET /mcp`
- Message post endpoint: `POST /mcp/messages?sessionId=...`


## Versioning and cache busting

- The server registers the widget with a versioned resource URI (for example `ui://widget/gutendex-search-2d2b.html`) when a hashed HTML file exists in `assets/`. This prevents stale templates due to ChatGPT caching.
- The build script creates hashed JS/CSS/HTML files. When you bump the app version and rebuild, a new hash is used and a new resource URI is advertised automatically.
- If no hashed file exists, the server falls back to `ui://widget/gutendex-search.html`.

## Debugging and caching

- Default logs: the server logs when it receives MCP requests, HTTP requests, SSE connect/close, tool calls start/complete, and Gutendex fetches, including response summaries (count, results length, next/previous).

- Debug logging: set `DEBUG=1` (or `DEBUG=true`) to also print verbose details like full Gutendex JSON bodies (truncated) and extra diagnostics.

  Example:

  ```bash
  DEBUG=1 pnpm start
  ```

- File cache: Gutendex responses are cached on disk using a simple FIFO policy with a capacity of 10 distinct URLs. Cache files are stored under `.cache/gutendex/` at the repo root and are keyed by a hash of the request URL. On cache miss the server fetches from Gutendex, writes the response to disk, and evicts the oldest entry if over capacity. Cache hits return the stored JSON without a network request.

## Tool: `gutendex.books.search`

Search Project Gutenberg and return results with pagination metadata. Supported arguments:

- `search` – Full‑text search across titles and authors
- `languages` – Comma‑separated language codes (e.g. `en,fr`)
- `author_year_start`, `author_year_end` – Year bounds for author life
- `mime_type` – MIME prefix to filter formats (e.g. `text/html`)
- `topic` – Substring to match bookshelf/subject
- `ids` – Comma‑separated Gutenberg IDs
- `copyright` – `true`, `false`, `null` or comma combinations
- `sort` – `popular` (default), `ascending`, `descending`
- `page` – Page number
- `pageUrl` – Direct Gutendex page URL (for next/previous)

Each response includes plain text, structured JSON, and `_meta.openai/outputTemplate` linking to the `gutendex-search` widget.
