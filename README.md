# Gutendex Books Service (Apps SDK + MCP)

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

This repository provides a ChatGPT connector that lets you search and consult books from Project Gutenberg using the public [Gutendex](https://gutendex.com) API. It uses the OpenAI Apps SDK conventions and the Model Context Protocol (MCP) to expose a search tool that returns a rich widget rendered inline in the chat.

> 📚 **Want to build your own ChatGPT app?** Check out our comprehensive [ChatGPT Apps Development Guide](CHATGPT-APPS-DEVELOPMENT-GUIDE.md) to ~~learn~~ _help your agent know_ how to create custom ChatGPT applications from scratch!

## How it works

- The MCP server exposes a single tool: `gutendex.books.search`.
- Tool responses include structured JSON and `_meta.openai/outputTemplate` metadata so the Apps SDK can hydrate the matching widget.
- The widget (`gutendex-search`) renders a paginated list of books with quick links to open formats such as HTML or plain text.

## Repository structure

- `src/` – Widget source (`gutendex-search`).
- `assets/` – Generated HTML, JS, and CSS bundles after running the build step.
- `gutendex_server_node/` – Node MCP server implemented with the official TypeScript SDK.
- `build-all.mts` – Vite build orchestrator that produces hashed bundles for the widget.

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn

## Install dependencies

```bash
pnpm install
```

## Build the widget assets

```bash
pnpm run build
```

This produces versioned `.html`, `.js`, and `.css` files inside `assets/`. The server reads `gutendex-search.html` from this directory.

To iterate on the component locally, you can also launch the Vite dev server:

```bash
pnpm run dev
```

## Serve the static assets (optional)

If you want to preview the generated bundle without the MCP server:

```bash
pnpm run serve
```

Assets are exposed at `http://localhost:4444` with CORS enabled so local tooling (including MCP inspectors) can fetch them.

## Run the MCP server (Node)

```bash
cd gutendex_server_node
pnpm start
```

The server exposes an SSE stream at `GET /mcp` and a post endpoint at `POST /mcp/messages?sessionId=...`.

## Testing in ChatGPT

Enable [developer mode](https://platform.openai.com/docs/guides/developer-mode) and add the server as a Connector in Settings > Connectors. If you need a public URL for your local server, expose it with a tunneling tool like `ngrok` and use the public `/mcp` endpoint.

## Deploy

Host the static assets and the MCP server.

Set `BASE_URL` at build time to the public origin where `assets/` is served:

```
BASE_URL=https://your-public-assets-origin pnpm run build
```

## Additional Resources

### Development Guide
- **[ChatGPT Apps Development Guide](CHATGPT-APPS-DEVELOPMENT-GUIDE.md)** - A comprehensive guide to creating your own simple ChatGPT app from scratch

### Documentation
- **Full Documentation** - Complete technical documentation and API reference available in markdown format in the [ChatGPT Apps SDK Markdown Documentation](https://github.com/viteinfinite/chatgpt-apps-sdk-markdown-docs) repository

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
