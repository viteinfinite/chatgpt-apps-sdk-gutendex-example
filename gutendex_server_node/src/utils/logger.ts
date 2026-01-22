import { DEBUG } from "../config/constants.js";

/**
 * Debug logging - only outputs when DEBUG mode is enabled
 */
export function debug(...args: unknown[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[debug]", ...args);
  }
}

/**
 * Info logging - always outputs
 */
export function info(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log("[info]", ...args);
}

/**
 * Truncate a string to a maximum length, adding a truncation message
 */
export function truncate(str: string, max = 4000): string {
  if (typeof str !== "string") return str as unknown as string;
  if (str.length <= max) return str;
  return str.slice(0, max) + `... [truncated ${str.length - max} chars]`;
}
