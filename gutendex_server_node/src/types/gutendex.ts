import { z } from "zod";

/**
 * Schema for search tool input parameters
 */
export const searchInputSchema = {
  type: "object" as const,
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

/**
 * Zod parser for search tool arguments
 */
export const searchInputParser = z.object({
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

export type SearchInput = z.infer<typeof searchInputParser>;

/**
 * Gutendex API response types
 */
export interface GutendexAuthor {
  name: string;
  birth_year: number | null;
  death_year: number | null;
}

export interface GutendexBook {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  languages: string[];
  download_count: number;
  media_type: string | null;
  summaries: string[];
  subjects: string[];
  bookshelves: string[];
  formats: Record<string, string>;
}

export interface GutendexResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}
