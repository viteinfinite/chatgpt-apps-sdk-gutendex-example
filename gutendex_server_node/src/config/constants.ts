import path from "node:path";
import { URL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");

export const ROOT = ROOT_DIR;
export const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");
export const GUTENDEX_CACHE_DIR = path.resolve(ROOT_DIR, ".cache", "gutendex");

export const SSE_PATH = "/mcp";
export const POST_PATH = "/mcp/messages";

export const DEFAULT_PORT = 8000;
export const CACHE_CAPACITY = 10;

/**
 * Debug mode is enabled when DEBUG environment variable is "1" or "true"
 */
export const DEBUG =
  String(process.env.DEBUG ?? "").toLowerCase() === "1" ||
  String(process.env.DEBUG ?? "").toLowerCase() === "true";

/**
 * Server port from environment or default
 */
export function getPort(): number {
  const portEnv = Number(process.env.PORT ?? DEFAULT_PORT);
  return Number.isFinite(portEnv) ? portEnv : DEFAULT_PORT;
}
