import type {
  CallToolRequest,
  ListResourceTemplatesRequest,
  ListResourcesRequest,
  ListToolsRequest,
  ReadResourceRequest,
  Resource,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { searchInputParser } from "../types/gutendex.js";
import { info } from "../utils/logger.js";
import { widgets, widgetsById, widgetsByUri } from "../widgets/registry.js";
import { widgetMeta } from "../utils/widget.js";
import { gutendexFetch } from "../api/gutendex.js";

/**
 * Resource definitions for widgets
 */
export const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

/**
 * Resource template definitions for widgets
 */
export const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

/**
 * Create and configure the MCP server
 */
export function createGutendexServer(): Server {
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
      const { tools } = await import("../tools/index.js");
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

      const data = (await gutendexFetch(args)) as any;
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
