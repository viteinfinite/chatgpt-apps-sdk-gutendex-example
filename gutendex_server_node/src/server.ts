import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { fetch } from "undici";

type WidgetDef = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");
const GUTENDEX_CACHE_DIR = path.resolve(ROOT_DIR, ".cache", "gutendex");
const DEBUG = String(process.env.DEBUG ?? "").toLowerCase() === "1" ||
  String(process.env.DEBUG ?? "").toLowerCase() === "true";

function debug(...args: any[]) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[debug]", ...args);
  }
}

function info(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log("[info]", ...args);
}

function truncate(str: string, max = 4000) {
  if (typeof str !== "string") return str as unknown as string;
  if (str.length <= max) return str;
  return str.slice(0, max) + `... [truncated ${str.length - max} chars]`;
}

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected directory ${ASSETS_DIR}. Run "pnpm run build" before starting the server.`
    );
  }

  // Prefer latest hashed HTML if available; fallback to unversioned
  const candidates = fs
    .readdirSync(ASSETS_DIR)
    .filter((file) => file.startsWith(`${componentName}-`) && file.endsWith(".html"))
    .sort();
  const latest = candidates[candidates.length - 1];
  let htmlContents: string | null = null;
  if (latest) {
    htmlContents = fs.readFileSync(path.join(ASSETS_DIR, latest), "utf8");
  }
  if (!htmlContents) {
    const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
    if (fs.existsSync(directPath)) {
      htmlContents = fs.readFileSync(directPath, "utf8");
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "pnpm run build" to generate the assets.`
    );
  }

  return htmlContents;
}

function resolveWidgetTemplateUri(componentName: string): string {
  try {
    const candidates = fs
      .readdirSync(ASSETS_DIR)
      .filter((file) => file.startsWith(`${componentName}-`) && file.endsWith(".html"))
      .sort();
    const latest = candidates[candidates.length - 1];
    if (latest) return `ui://widget/${latest}`;
  } catch {}
  return `ui://widget/${componentName}.html`;
}

function widgetMeta(widget: WidgetDef) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const widgets: WidgetDef[] = [
  {
    id: "gutendex-search",
    title: "Search Project Gutenberg",
    templateUri: resolveWidgetTemplateUri("gutendex-search"),
    invoking: "Searching Project Gutenberg",
    invoked: "Showing search results",
    html: readWidgetHtml("gutendex-search"),
    responseText: "Rendered Project Gutenberg search results.",
  },
];

const widgetsById = new Map<string, WidgetDef>();
const widgetsByUri = new Map<string, WidgetDef>();
widgets.forEach((w) => {
  widgetsById.set(w.id, w);
  widgetsByUri.set(w.templateUri, w);
});

// Tool: gutendex.books.search
const searchInputSchema = {
  type: "object",
  properties: {
    search: { type: "string", description: "Full-text search across titles and authors." },
    languages: {
      type: "string",
      description: "Comma-separated 2-letter language codes (e.g. en,fr)",
    },
    author_year_start: { type: "integer", description: "Author alive on/after this year." },
    author_year_end: { type: "integer", description: "Author alive on/before this year." },
    mime_type: { type: "string", description: "MIME type prefix to match (e.g. text/html)." },
    topic: { type: "string", description: "Substring to match bookshelf or subject." },
    ids: { type: "string", description: "Comma-separated Gutenberg IDs to filter." },
    copyright: {
      type: "string",
      description: "copyright filter: true,false,null or comma-combo",
    },
    sort: {
      type: "string",
      enum: ["popular", "ascending", "descending"],
      description: "Sort order. Defaults to popular.",
    },
    page: { type: "integer", description: "Page number (if supported)." },
    pageUrl: {
      type: "string",
      description: "Direct Gutendex page URL (overrides other params).",
    },
  },
  additionalProperties: false,
} as const;

const searchInputParser = z.object({
  search: z.string().trim().optional(),
  languages: z.string().trim().optional(),
  author_year_start: z.number().int().optional(),
  author_year_end: z.number().int().optional(),
  mime_type: z.string().trim().optional(),
  topic: z.string().trim().optional(),
  ids: z.string().trim().optional(),
  copyright: z.string().trim().optional(),
  sort: z.enum(["popular", "ascending", "descending"]).optional(),
  page: z.number().int().optional(),
  pageUrl: z.string().url().optional(),
});

const tools: Tool[] = [
  {
    name: "gutendex.books.search",
    description: "Search Project Gutenberg via Gutendex API and show results.",
    title: "Search books",
    inputSchema: searchInputSchema,
    _meta: widgetMeta(widgetsById.get("gutendex-search")!),
  },
];

const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

// File-based FIFO cache extracted into its own module
import { FileFifoCache } from "./cache.js";
const gutendexCache = new FileFifoCache(GUTENDEX_CACHE_DIR, 10);

async function gutendexFetch(args: z.infer<typeof searchInputParser>) {
  let url: string;
  if (args.pageUrl) {
    url = args.pageUrl;
  } else {
    const u = new URL("https://gutendex.com/books");
    const set = (k: string, v?: string | number) => {
      if (v === undefined || v === null || v === "") return;
      u.searchParams.set(k, String(v));
    };
    set("search", args.search);
    set("languages", args.languages);
    set("author_year_start", args.author_year_start);
    set("author_year_end", args.author_year_end);
    set("mime_type", args.mime_type);
    set("topic", args.topic);
    set("ids", args.ids);
    set("copyright", args.copyright);
    set("sort", args.sort);
    if (typeof args.page === "number") set("page", args.page);
    url = u.toString();
  }
  info("Gutendex request", { url });

  // Try cache first (simple FIFO, not LRU)
  const cached = await gutendexCache.read(url);
  if (cached) {
    info("Gutendex cache hit", { url });
    return cached;
  }

  const t0 = Date.now();
  const resp = await fetch(url, { method: "GET" });
  const dt = Date.now() - t0;
  info("Gutendex fetch", { status: resp.status, statusText: resp.statusText, ms: dt });
  if (!resp.ok) {
    throw new Error(`Gutendex request failed: ${resp.status} ${resp.statusText}`);
  }
  const data = (await resp.json()) as any;
  try {
    const summary = {
      count: data?.count ?? (Array.isArray(data?.results) ? data.results.length : undefined),
      results: Array.isArray(data?.results) ? data.results.length : undefined,
      next: Boolean(data?.next),
      previous: Boolean(data?.previous),
    };
    info("Gutendex response summary", summary);
    if (DEBUG) {
      const body = (() => {
        try {
          return JSON.stringify(data);
        } catch {
          return String(data);
        }
      })();
      debug("Gutendex response body", truncate(body, 4000));
    }
  } catch (e) {
    debug("error summarizing gutendex response", (e as Error)?.message);
  }
  await gutendexCache.write(url, data);
  return data;
}

function createGutendexServer(): Server {
  const server = new Server(
    {
      name: "gutendex-node",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => {
      info("MCP request: listResources");
      return { resources };
    }
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      info("MCP request: readResource", { uri: request.params.uri });
      const widget = widgetsByUri.get(request.params.uri);
      if (!widget) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }
      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: widget.html,
            _meta: widgetMeta(widget),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => {
      info("MCP request: listResourceTemplates");
      return { resourceTemplates };
    }
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => {
      info("MCP request: listTools");
      return { tools };
    }
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const name = request.params.name;
      if (name !== "gutendex.books.search") {
        throw new Error(`Unknown tool: ${name}`);
      }

      const args = searchInputParser.parse(request.params.arguments ?? {});
      const widget = widgetsById.get("gutendex-search")!;
      info("MCP tool call start", { reqId, tool: name, args });

      const data = await gutendexFetch(args);
      const results = Array.isArray(data?.results) ? data.results : [];
      const mapped = results.map((b: any) => {
        const formats = b.formats ?? {};
        const cover_url = typeof formats["image/jpeg"] === "string" ? formats["image/jpeg"] : null;
        return {
          id: b.id,
          title: b.title,
          authors: Array.isArray(b.authors)
            ? b.authors.map((a: any) => ({
                name: a.name,
                birth_year: a.birth_year ?? null,
                death_year: a.death_year ?? null,
              }))
            : [],
          languages: Array.isArray(b.languages) ? b.languages : [],
          download_count: b.download_count ?? 0,
          media_type: b.media_type ?? null,
          summaries: Array.isArray(b.summaries) ? b.summaries : [],
          subjects: Array.isArray(b.subjects) ? b.subjects : [],
          bookshelves: Array.isArray(b.bookshelves) ? b.bookshelves : [],
          cover_url,
          formats,
        };
      });

      const responseText = `Found ${data?.count ?? mapped.length} books`;

      info("MCP tool call complete", {
        reqId,
        tool: name,
        count: data?.count ?? mapped.length,
        next: Boolean(data?.next),
        previous: Boolean(data?.previous),
        results: mapped.length,
      });

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
        structuredContent: {
          query: args,
          count: data?.count ?? mapped.length,
          next: data?.next ?? null,
          previous: data?.previous ?? null,
          results: mapped,
        },
        _meta: widgetMeta(widget),
      };
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();
const ssePath = "/mcp";
const postPath = "/mcp/messages";

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createGutendexServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;
  info("SSE connect", { sessionId });

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
    info("SSE close", { sessionId });
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");
  info("POST /mcp/messages", { sessionId });

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    console.log("request", req.method, req.url);
    const started = Date.now();
    const done = (status: number) => {
      const dt = Date.now() - started;
      info(`Returned ${status} in ${dt} ms`);
    };
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      done(400);
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    info("HTTP request", { method: req.method, path: url.pathname });

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      done(200);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      // status handled by handler, but assume 200 on success path
      // No direct way to know here; skip done() to avoid duplication.
      return;
    }

    res.writeHead(404).end("Not Found");
    done(404);
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`Gutendex MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
  if (DEBUG) {
    console.log(`Debug logging enabled (DEBUG=${process.env.DEBUG})`);
    console.log(`Cache dir: ${GUTENDEX_CACHE_DIR}`);
  }
});
