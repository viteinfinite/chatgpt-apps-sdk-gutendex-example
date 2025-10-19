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

