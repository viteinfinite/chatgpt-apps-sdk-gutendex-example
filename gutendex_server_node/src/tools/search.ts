import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { searchInputSchema } from "../types/gutendex.js";
import { widgetsById } from "../widgets/registry.js";
import { widgetMeta } from "../utils/widget.js";

/**
 * Tool definitions for the Gutendex server
 */
export const tools: Tool[] = [
  {
    name: "gutendex.books.search",
    description: "Search Project Gutenberg via Gutendex API and show results.",
    title: "Search books",
    inputSchema: searchInputSchema,
    _meta: widgetMeta(widgetsById.get("gutendex-search")!),
  },
];
