import fs from "node:fs";
import path from "node:path";
import { ASSETS_DIR } from "../config/constants.js";
import type { WidgetDef } from "../types/widget.js";

/**
 * Read widget HTML from the assets directory
 * Prefers versioned files (with hash) over unversioned files
 */
export function readWidgetHtml(componentName: string): string {
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

/**
 * Resolve the widget template URI, preferring versioned files
 */
export function resolveWidgetTemplateUri(componentName: string): string {
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

/**
 * Generate OpenAI widget metadata for a widget
 */
export function widgetMeta(widget: WidgetDef) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}
