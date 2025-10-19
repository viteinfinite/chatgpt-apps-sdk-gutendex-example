# ChatGPT Apps Development Guide

## Overview

This guide enables Agentic coding tools (like Claude) to create ChatGPT applications using the OpenAI Apps SDK and Model Context Protocol (MCP). The patterns are based on a real-world Gutendex books search application.

### What is a ChatGPT App?

A ChatGPT App consists of:
- **MCP Server**: Exposes tools that ChatGPT can invoke
- **Widget**: React component that renders tool results inline in chat
- **Static Assets**: Built HTML/CSS/JS bundles served independently
- **Metadata**: Special OpenAI-specific metadata for widget integration

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ChatGPT       │───▶│   MCP Server     │───▶│   External API  │
│   (Frontend)    │    │   (Node.js)      │    │   (Gutendex)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Widget  │◀───│   Tool Response  │◀───│   API Response  │
│   (Inline UI)   │    │   + Metadata     │    │   + Data        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Project Structure

```
your-app/
├── package.json             # Main dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.mts          # Vite build config
├── build-all.mts            # Asset build orchestrator
├── pnpm-workspace.yaml      # Workspace config
├── src/                     # Widget source code
│   └── your-widget/
│       ├── index.jsx        # Main React widget
│       └── (optional css)   # Widget-specific styles
├── src/index.css            # Global styles (Tailwind)
├── src/use-widget-props.ts  # OpenAI global state hook
├── src/use-openai-global.ts # OpenAI global context
├── assets/                  # Generated build artifacts
│   ├── your-widget.html     # HTML entry point
│   ├── your-widget.js       # Built JavaScript
│   ├── your-widget.css      # Built CSS
│   └── your-widget-[hash].* # Versioned assets
└── your_server_node/        # MCP server
    ├── package.json         # Server dependencies
    ├── tsconfig.json        # Server TypeScript config
    └── src/
        └── server.ts        # MCP server implementation
```

## Step-by-Step Implementation

### Step 1: Project Setup

#### 1.1 Create Root Package.json

```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "description": "Your ChatGPT App",
  "main": "host/main.ts",
  "scripts": {
    "build": "tsx ./build-all.mts",
    "serve": "serve -s ./assets -p 4444 --cors",
    "dev": "vite --config vite.config.mts",
    "tsc": "tsc -b",
    "tsc:app": "tsc -p tsconfig.app.json",
    "tsc:node": "tsc -p tsconfig.node.json"
  },
  "packageManager": "pnpm@10.13.1",
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.11",
    "@types/node": "^24.3.0",
    "@vitejs/plugin-react": "^4.5.2e",
    "autoprefixer": "10.4.21",
    "fast-glob": "^3.3.3",
    "postcss": "8.5.6",
    "serve": "^14.2.4",
    "tailwindcss": "4.1.11",
    "tsx": "^4.20.4",
    "typescript": "^5.9.2",
    "vite": "^7.1.1"
  },
  "dependencies": {
    "@types/react": "^19.1.12",
    "@types/react-dom": "^19.1.9",
    "clsx": "^2.1.1",
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  }
}
```

#### 1.2 Create Workspace Config

```yaml
# pnpm-workspace.yaml
packages:
  - "."
  - "./your_server_node"
```

#### 1.3 Create TypeScript Configs

```json
// tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

```json
// tsconfig.app.json
{
  "extends": "@tsconfig/react/tsconfig.json",
  "include": ["src/**/*"],
  "exclude": ["assets", "build", "node_modules"],
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

```json
// tsconfig.node.json
{
  "include": ["build-all.mts", "vite.config.mts"],
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

### Step 2: Widget Development

#### 2.1 Create OpenAI Global Hooks

```typescript
// src/use-openai-global.ts
export function useOpenAiGlobal<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  const global = window as any;
  if (!global.openai?.globals?.[key]) return null;

  try {
    return typeof global.openai.globals[key] === 'string'
      ? JSON.parse(global.openai.globals[key])
      : global.openai.globals[key];
  } catch {
    return null;
  }
}
```

```typescript
// src/use-widget-props.ts
import { useOpenAiGlobal } from "./use-openai-global";

export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  const props = useOpenAiGlobal("toolOutput") as T;

  const fallback =
    typeof defaultState === "function"
      ? (defaultState as () => T | null)()
      : defaultState ?? null;

  return props ?? fallback;
}
```

#### 2.2 Create Your Widget Component

```jsx
// src/your-widget/index.jsx
import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { useWidgetProps } from "../use-widget-props";

// Data item component - customize for your data
function DataItem({ item }) {
  const title = item?.title || "Untitled";
  const description = item?.description || "No description";

  return (
    <li className="py-3 px-3 -mx-2 rounded-xl hover:bg-black/5 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-black truncate">{title}</div>
        <div className="text-xs text-black/70 mt-0.5 truncate">
          {description}
        </div>
      </div>
      <div className="shrink-0">
        <a
          className="inline-flex items-center rounded-full bg-black text-white px-3 py-1 text-xs hover:opacity-90"
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          View
        </a>
      </div>
    </li>
  );
}

// Main widget component
function App() {
  // Get data from MCP tool response
  const data = useWidgetProps(() => ({ results: [], count: 0 }));
  const { results = [], count = 0, next = null, previous = null } = data || {};

  // Handle pagination (if applicable)
  const onNavigate = (which) => {
    const target = which === "next" ? next : previous;
    if (!target) return;
    if (window?.openai?.sendFollowUpMessage) {
      const prompt = `Fetch ${which} page with URL: ${target}`;
      window.openai.sendFollowUpMessage({ prompt }).catch(() => {});
    }
  };

  return (
    <div className="antialiased w-full text-black px-4 pb-2 border border-black/10 rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
      <div className="max-w-full">
        <div className="flex items-baseline justify-between border-b border-black/5 py-3">
          <div>
            <div className="text-base font-medium">Your App Title</div>
            <div className="text-xs text-black/60 mt-0.5">
              {count} result{count === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full bg-black text-white text-xs px-3 py-1 disabled:opacity-40"
              disabled={!previous}
              onClick={() => onNavigate("previous")}
            >
              Previous
            </button>
            <button
              className="rounded-full bg-black text-white text-xs px-3 py-1 disabled:opacity-40"
              disabled={!next}
              onClick={() => onNavigate("next")}
            >
              Next
            </button>
          </div>
        </div>

        <ul className="mt-1">
          {results.map((item) => (
            <DataItem key={item.id} item={item} />
          ))}
          {results.length === 0 && (
            <li className="py-6 text-center text-black/60">No items found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// Render the widget
createRoot(document.getElementById("your-widget-root")).render(<App />);

// Export for build system
export default App;
export { App };
```

#### 2.3 Create Global Styles

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom widget styles can go here */
```

### Step 3: Build System

#### 3.1 Create Vite Config

```typescript
// vite.config.mts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  build: {
    outDir: "assets",
    emptyOutDir: true,
  },
});
```

#### 3.2 Create Build Orchestrator

```typescript
// build-all.mts
import { build, type InlineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fg from "fast-glob";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import pkg from "./package.json" with { type: "json" };
import tailwindcss from "@tailwindcss/vite";

const entries = fg.sync("src/**/index.{tsx,jsx}");
const outDir = "assets";

const PER_ENTRY_CSS_GLOB = "**/*.{css,pcss,scss,sass}";
const PER_ENTRY_CSS_IGNORE = "**/*.module.*".split(",").map((s) => s.trim());
const GLOBAL_CSS_LIST = [path.resolve("src/index.css")];

// Add your widget name here
const targets: string[] = [
  "your-widget",
];
const builtNames: string[] = [];

function wrapEntryPlugin(
  virtualId: string,
  entryFile: string,
  cssPaths: string[]
): Plugin {
  return {
    name: `virtual-entry-wrapper:${entryFile}`,
    resolveId(id) {
      if (id === virtualId) return id;
    },
    load(id) {
      if (id !== virtualId) {
        return null;
      }

      const cssImports = cssPaths
        .map((css) => `import ${JSON.stringify(css)};`)
        .join("\n");

      return `
    ${cssImports}
    export * from ${JSON.stringify(entryFile)};

    import * as __entry from ${JSON.stringify(entryFile)};
    export default (__entry.default ?? __entry.App);

    import ${JSON.stringify(entryFile)};
  `;
    },
  };
}

fs.rmSync(outDir, { recursive: true, force: true });

for (const file of entries) {
  const name = path.basename(path.dirname(file));
  if (targets.length && !targets.includes(name)) {
    continue;
  }

  const entryAbs = path.resolve(file);
  const entryDir = path.dirname(entryAbs);

  // Collect CSS for this entry
  const perEntryCss = fg.sync(PER_ENTRY_CSS_GLOB, {
    cwd: entryDir,
    absolute: true,
    dot: false,
    ignore: PER_ENTRY_CSS_IGNORE,
  });

  // Global CSS (Tailwind, etc.)
  const globalCss = GLOBAL_CSS_LIST.filter((p) => fs.existsSync(p));

  // Final CSS list
  const cssToInclude = [...globalCss, ...perEntryCss].filter((p) =>
    fs.existsSync(p)
  );

  const virtualId = `\0virtual-entry:${entryAbs}`;

  const createConfig = (): InlineConfig => ({
    plugins: [
      wrapEntryPlugin(virtualId, entryAbs, cssToInclude),
      tailwindcss(),
      react(),
      {
        name: "remove-manual-chunks",
        outputOptions(options) {
          if ("manualChunks" in options) {
            delete (options as any).manualChunks;
          }
          return options;
        },
      },
    ],
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
      target: "es2022",
    },
    build: {
      target: "es2022",
      outDir,
      emptyOutDir: false,
      chunkSizeWarningLimit: 2000,
      minify: "esbuild",
      cssCodeSplit: false,
      rollupOptions: {
        input: virtualId,
        output: {
          format: "es",
          entryFileNames: `${name}.js`,
          inlineDynamicImports: true,
          assetFileNames: (info) =>
            (info.name || "").endsWith(".css")
              ? `${name}.css`
              : `[name]-[hash][extname]`,
        },
        preserveEntrySignatures: "allow-extension",
        treeshake: true,
      },
    },
  });

  console.group(`Building ${name} (react)`);
  await build(createConfig());
  console.groupEnd();
  builtNames.push(name);
  console.log(`Built ${name}`);
}

const outputs = fs
  .readdirSync("assets")
  .filter((f) => f.endsWith(".js") || f.endsWith(".css"))
  .map((f) => path.join("assets", f))
  .filter((p) => fs.existsSync(p));

const h = crypto
  .createHash("sha256")
  .update(pkg.version, "utf8")
  .digest("hex")
  .slice(0, 4);

console.group("Hashing outputs");
for (const out of outputs) {
  const dir = path.dirname(out);
  const ext = path.extname(out);
  const base = path.basename(out, ext);
  const newName = path.join(dir, `${base}-${h}${ext}`);

  fs.renameSync(out, newName);
  console.log(`${out} -> ${newName}`);
}
console.groupEnd();

console.log("new hash: ", h);

const defaultBaseUrl = "http://localhost:4444";
const baseUrlCandidate = process.env.BASE_URL?.trim() ?? "";
const baseUrlRaw = baseUrlCandidate.length > 0 ? baseUrlCandidate : defaultBaseUrl;
const normalizedBaseUrl = baseUrlRaw.replace(/\/+$/, "") || defaultBaseUrl;
console.log(`Using BASE_URL ${normalizedBaseUrl} for generated HTML`);

for (const name of builtNames) {
  const dir = outDir;
  const hashedHtmlPath = path.join(dir, `${name}-${h}.html`);
  const liveHtmlPath = path.join(dir, `${name}.html`);
  const html = `<!doctype html>
<html>
<head>
  <script type="module" src="${normalizedBaseUrl}/${name}.js"></script>
  <link rel="stylesheet" href="${normalizedBaseUrl}/${name}.css">
</head>
<body>
  <div id="${name}-root"></div>
</body>
</html>
`;
  fs.writeFileSync(hashedHtmlPath, html, { encoding: "utf8" });
  fs.writeFileSync(liveHtmlPath, html, { encoding: "utf8" });
  console.log(`${hashedHtmlPath} (generated live HTML)`);
  console.log(`${liveHtmlPath} (generated live HTML)`);
}
```

### Step 4: MCP Server Development

#### 4.1 Create Server Package.json

```json
// your_server_node/package.json
{
  "name": "your-app-server",
  "version": "1.0.0",
  "description": "MCP server for your app",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx src/server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^4.1.5",
    "undici": "^6.19.0"
  },
  "devDependencies": {
    "@types/node": "^24.3.0",
    "tsx": "^4.20.4",
    "typescript": "^5.9.2"
  }
}
```

#### 4.2 Create Server TypeScript Config

```json
// your_server_node/tsconfig.json
{
  "extends": "../tsconfig.node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

#### 4.3 Create MCP Server

```typescript
// your_server_node/src/server.ts
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
    id: "your-widget",
    title: "Your App Title",
    templateUri: "ui://widget/your-widget.html",
    invoking: "Searching your data",
    invoked: "Showing search results",
    html: readWidgetHtml("your-widget"),
    responseText: "Rendered search results.",
  },
];

const widgetsById = new Map<string, WidgetDef>();
const widgetsByUri = new Map<string, WidgetDef>();
widgets.forEach((w) => {
  widgetsById.set(w.id, w);
  widgetsByUri.set(w.templateUri, w);
});

// Define your tool input schema
const searchInputSchema = {
  type: "object",
  properties: {
    query: { type: "string", description: "Search query" },
    limit: { type: "number", description: "Maximum number of results" },
  },
  additionalProperties: false,
} as const;

const searchInputParser = z.object({
  query: z.string().trim().optional(),
  limit: z.number().int().optional(),
});

const tools: Tool[] = [
  {
    name: "your-app.search",
    description: "Search your data and show results.",
    title: "Search data",
    inputSchema: searchInputSchema,
    _meta: widgetMeta(widgetsById.get("your-widget")!),
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

// Replace this with your actual data fetching logic
async function fetchYourData(args: z.infer<typeof searchInputParser>) {
  // This is where you'd fetch data from your API
  // For now, returning mock data
  return {
    results: [
      {
        id: "1",
        title: "Sample Item 1",
        description: "This is a sample item",
        url: "https://example.com/1",
      },
      {
        id: "2",
        title: "Sample Item 2",
        description: "Another sample item",
        url: "https://example.com/2",
      },
    ],
    count: 2,
    next: null,
    previous: null,
  };
}

function createYourServer(): Server {
  const server = new Server(
    {
      name: "your-app-server",
      version: "1.0.0",
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
      if (name !== "your-app.search") {
        throw new Error(`Unknown tool: ${name}`);
      }

      const args = searchInputParser.parse(request.params.arguments ?? {});
      const widget = widgetsById.get("your-widget")!;

      const data = await fetchYourData(args);
      const responseText = `Found ${data?.count ?? 0} results`;

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
        structuredContent: data,
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
  const server = createYourServer();
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
  console.log(`Your app MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
});
```

## Development Workflow

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build Widget Assets

```bash
pnpm run build
```

### 3. Start Development Server

```bash
# Terminal 1: Serve static assets
pnpm run serve

# Terminal 2: Start MCP server
cd your_server_node
pnpm start
```

### 4. Test in ChatGPT

1. Enable [developer mode](https://platform.openai.com/docs/guides/developer-mode)
2. Add server as Connector in Settings > Connectors
3. Use a tunneling tool like `ngrok` if you need a public URL

## Key Patterns and Concepts

### Widget Data Flow

1. **Tool Invocation**: ChatGPT calls your MCP tool
2. **Data Fetching**: Server fetches data from external API
3. **Response Format**: Server returns both text content and structured data with metadata
4. **Widget Rendering**: ChatGPT renders the widget with structured data as props

### OpenAI Metadata

The `_meta` object in tool responses is crucial:

```typescript
_meta: {
  "openai/outputTemplate": "ui://widget/your-widget.html",
  "openai/toolInvocation/invoking": "Searching your data",
  "openai/toolInvocation/invoked": "Showing search results",
  "openai/widgetAccessible": true,
  "openai/resultCanProduceWidget": true,
}
```

### Widget Props Access

Widgets receive data through the `useWidgetProps` hook:

```typescript
const data = useWidgetProps(() => ({ results: [], count: 0 }));
```

### Pagination Support

Widgets can trigger follow-up messages for pagination:

```typescript
const onNavigate = (which) => {
  if (window?.openai?.sendFollowUpMessage) {
    const prompt = `Fetch ${which} page with URL: ${target}`;
    window.openai.sendFollowUpMessage({ prompt });
  }
};
```

## Customization Guidelines

### Data Structure

Ensure your API response structure matches what your widget expects:

```typescript
// In server.ts
return {
  content: [{ type: "text", text: "Response summary" }],
  structuredContent: {
    results: [...], // Your data array
    count: number,
    next: string | null,
    previous: string | null,
  },
  _meta: widgetMeta(widget),
};
```

### Widget Styling

- Use Tailwind CSS classes for styling
- Follow the existing design patterns (rounded corners, hover states, etc.)
- Ensure responsive design with `sm:` prefixes

### Tool Schema Design

- Use Zod for input validation
- Provide clear descriptions for each parameter
- Use appropriate TypeScript types

## Common Issues and Solutions

### Build Issues

- **Error**: "Widget assets not found" → Run `pnpm run build` first
- **Error**: TypeScript compilation issues → Check tsconfig paths and includes
- **Error**: "default is not exported" or "App is not exported" → Add export statements to widget:
  ```jsx
  export default App;
  export { App };
  ```
- **Error**: Three.js GPUTexture type errors → Add `"skipLibCheck": true` to server tsconfig.json

### Runtime Issues

- **Error**: "Unknown resource" → Ensure widget HTML is generated and accessible
- **Error**: CORS issues → Ensure proper headers in server.ts

### Widget Not Rendering

- Check `_meta` object is correctly formatted
- Verify `structuredContent` matches widget expectations
- Ensure widget HTML is accessible at the specified URI

## Testing Your App

### Local Testing

1. Build assets: `pnpm run build`
2. Start asset server: `pnpm run serve`
3. Start MCP server: `cd your_server_node && pnpm start`
4. Test with MCP client or ChatGPT developer mode

### Integration Testing

Use the OpenAI platform's connector testing tools to verify:
- Tool discovery and invocation
- Widget rendering
- Data flow correctness
- Error handling

This comprehensive guide should enable an Agentic coding tool to create functional ChatGPT applications following established patterns and best practices.