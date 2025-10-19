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

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected directory ${ASSETS_DIR}. Run "pnpm run build" before starting the server.`
    );
  }

  const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
  let htmlContents: string | null = null;

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
  } else {
    const candidates = fs
      .readdirSync(ASSETS_DIR)
      .filter(
        (file) => file.startsWith(`${componentName}-`) && file.endsWith(".html")
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      htmlContents = fs.readFileSync(path.join(ASSETS_DIR, fallback), "utf8");
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "pnpm run build" to generate the assets.`
    );
  }

  return htmlContents;
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
    templateUri: "ui://widget/gutendex-search.html",
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

  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) {
    throw new Error(`Gutendex request failed: ${resp.status} ${resp.statusText}`);
  }
  const data = (await resp.json()) as any;
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
    async (_request: ListResourcesRequest) => ({
      resources,
    })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
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
    async (_request: ListResourceTemplatesRequest) => ({
      resourceTemplates,
    })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({
      tools,
    })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const name = request.params.name;
      if (name !== "gutendex.books.search") {
        throw new Error(`Unknown tool: ${name}`);
      }

      const args = searchInputParser.parse(request.params.arguments ?? {});
      const widget = widgetsById.get("gutendex-search")!;

      const data = await gutendexFetch(args);
      const results = Array.isArray(data?.results) ? data.results : [];
      const mapped = results.map((b: any) => ({
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
        formats: b.formats ?? {},
      }));

      const responseText = `Found ${data?.count ?? mapped.length} books`;

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

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
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
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

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
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    res.writeHead(404).end("Not Found");
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
});

