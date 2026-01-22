import { fetch } from "undici";
import { FileFifoCache } from "../cache.js";
import { GUTENDEX_CACHE_DIR, CACHE_CAPACITY } from "../config/constants.js";
import { debug, info, truncate } from "../utils/logger.js";
import type { SearchInput } from "../types/gutendex.js";

const gutendexCache = new FileFifoCache(GUTENDEX_CACHE_DIR, CACHE_CAPACITY);

/**
 * Build Gutendex API URL from search parameters
 */
function buildUrl(args: SearchInput): string {
  if (args.pageUrl) {
    return args.pageUrl;
  }

  const url = new URL("https://gutendex.com/books");
  const set = (k: string, v?: string | number) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, String(v));
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

  return url.toString();
}

/**
 * Log Gutendex response summary
 */
function logResponseSummary(data: unknown): void {
  try {
    const summary = {
      count: (data as any)?.count ?? (Array.isArray((data as any)?.results) ? (data as any).results.length : undefined),
      results: Array.isArray((data as any)?.results) ? (data as any).results.length : undefined,
      next: Boolean((data as any)?.next),
      previous: Boolean((data as any)?.previous),
    };
    info("Gutendex response summary", summary);
    if (process.env.DEBUG) {
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
}

/**
 * Fetch from Gutendex API with caching
 */
export async function gutendexFetch(args: SearchInput): Promise<unknown> {
  const url = buildUrl(args);
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

  const data = (await resp.json()) as unknown;
  logResponseSummary(data);

  await gutendexCache.write(url, data);
  return data;
}
