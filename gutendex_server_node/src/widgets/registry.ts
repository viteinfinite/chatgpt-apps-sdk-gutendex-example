import { readWidgetHtml, resolveWidgetTemplateUri } from "../utils/widget.js";
import type { WidgetDef } from "../types/widget.js";

/**
 * Widget definitions for the Gutendex server
 */
export const widgets: WidgetDef[] = [
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

/**
 * Widget lookup by ID
 */
export const widgetsById = new Map<string, WidgetDef>();
widgets.forEach((w) => {
  widgetsById.set(w.id, w);
});

/**
 * Widget lookup by template URI
 */
export const widgetsByUri = new Map<string, WidgetDef>();
widgets.forEach((w) => {
  widgetsByUri.set(w.templateUri, w);
});
