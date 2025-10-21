import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useWidgetProps } from "../use-widget-props";

function bestFormatUrl(book) {
  const fmts = book?.formats || {};
  const candidates = [
    "text/html; charset=utf-8",
    "text/html",
    "text/plain; charset=us-ascii",
    "text/plain; charset=utf-8",
    "text/plain",
  ];
  for (const k of candidates) {
    if (fmts[k]) return fmts[k];
  }
  const first = Object.values(fmts)[0];
  return typeof first === "string" ? first : null;
}

function coverUrl(book) {
  const fmts = book?.formats || {};
  return typeof fmts["image/jpeg"] === "string" ? fmts["image/jpeg"] : book?.cover_url || null;
}

function Chips({ items, max = 3 }) {
  const list = Array.isArray(items) ? items.slice(0, max) : [];
  if (list.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {list.map((s, i) => (
        <span
          key={i}
          className="inline-block rounded-full bg-black/5 text-black/70 px-2 py-0.5 text-[11px]"
          title={s}
        >
          {s}
        </span>
      ))}
      {items.length > list.length && (
        <span className="inline-block rounded-full bg-black/5 text-black/50 px-2 py-0.5 text-[11px]">
          +{items.length - list.length} more
        </span>
      )}
    </div>
  );
}

function BookItem({ book, onSummary, onCopyLink }) {
  const htmlUrl = useMemo(() => {
    return bestFormatUrl(book);
  }, [book]);

  const title = book?.title || "Untitled";
  const authors = (book?.authors || []).map((a) => a.name).join(", ");
  const langs = (book?.languages || []).join(", ");
  const downloads = book?.download_count ?? 0;

  return (
    <li
      className="py-3 px-3 -mx-2 rounded-xl hover:bg-black/5 flex items-start gap-3 cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        onSummary?.(book, htmlUrl);
      }}
      onMouseDown={(e) => e.preventDefault()}
      title="Click for a short summary"
    >
      {coverUrl(book) && (
        <img
          src={coverUrl(book)}
          alt=""
          className="h-12 w-9 object-cover rounded md:h-14 md:w-10 ring ring-black/5"
          onClick={(e) => e.preventDefault()}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-black truncate">{title}</div>
        <div className="text-xs text-black/70 mt-0.5 truncate">
          {authors || "Unknown author"}
        </div>
        <div className="text-xs text-black/50 mt-0.5">
          Languages: {langs || "n/a"} • Downloads: {downloads}
        </div>
        <Chips items={book?.subjects || []} />
        <Chips items={book?.bookshelves || []} />
      </div>
      <div className="shrink-0">
        <div className="flex gap-2">
          <button
            type="button"
            className="cursor-pointer inline-flex items-center rounded-full bg-black text-white px-3 py-1 text-xs hover:opacity-90"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSummary?.(book, htmlUrl);
            }}
          >
            More Info
          </button>
          {htmlUrl && (
            <button
              type="button"
              className="cursor-pointer inline-flex items-center rounded-full bg-black/80 text-white px-3 py-1 text-xs hover:opacity-90"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCopyLink?.(htmlUrl);
              }}
            >
              Copy link
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function App() {
  const initial = useWidgetProps();
  const [state, setState] = useState(() => ({
    results: initial?.results ?? [],
    count: initial?.count ?? 0,
    next: initial?.next ?? null,
    previous: initial?.previous ?? null,
    query: initial?.query ?? {},
    loading: !initial || typeof initial.results === "undefined",
    loadingWhich: null,
    error: null,
  }));

  const inFlight = useRef(null);

  // Keep state in sync if the widget gets fresh props (e.g., first render)
  useEffect(() => {
    if (!initial || typeof initial.results === "undefined") return;
    setState((s) => ({
      ...s,
      results: initial?.results ?? [],
      count: initial?.count ?? 0,
      next: initial?.next ?? null,
      previous: initial?.previous ?? null,
      query: initial?.query ?? {},
      loading: false,
      loadingWhich: null,
      error: null,
    }));
  }, [initial?.results, initial?.count, initial?.next, initial?.previous, initial?.query]);

  const fetchPage = useCallback(async (url, which) => {
    if (!url) return;
    try {
      // Abort any in-flight request before starting a new one
      if (inFlight.current) {
        inFlight.current.abort();
        inFlight.current = null;
      }

      const controller = new AbortController();
      inFlight.current = controller;

      setState((s) => ({ ...s, loading: true, loadingWhich: which ?? null, error: null }));
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const mapped = Array.isArray(data?.results)
        ? data.results.map((b) => ({
            id: b.id,
            title: b.title,
            authors: Array.isArray(b.authors)
              ? b.authors.map((a) => ({
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
            cover_url: typeof (b.formats || {})["image/jpeg"] === "string" ? (b.formats || {})["image/jpeg"] : null,
            formats: b.formats ?? {},
          }))
        : [];
      setState((s) => ({
        ...s,
        results: mapped,
        count: data?.count ?? mapped.length,
        next: data?.next ?? null,
        previous: data?.previous ?? null,
        loading: false,
        loadingWhich: null,
        error: null,
      }));
    } catch (e) {
      if (e?.name === "AbortError") return; // ignore aborts
      setState((s) => ({ ...s, loading: false, loadingWhich: null, error: String(e) }));
    }
  }, []);

  const onNavigate = (which) => {
    if (state.loading) return;
    const target = which === "next" ? state.next : state.previous;
    if (!target) return;
    fetchPage(target, which);
  };

  const [copied, setCopied] = useState(false);

  const onSummary = useCallback((book, htmlUrl) => {
    const title = book?.title || "";
    const authors = (book?.authors || []).map((a) => a.name).filter(Boolean);
    const langs = (book?.languages || []).join(", ");
    const subjects = (book?.subjects || []).slice(0, 6);
    const shelves = (book?.bookshelves || []).slice(0, 6);
    const providedSummary = Array.isArray(book?.summaries) && book.summaries.length > 0 ? book.summaries[0] : null;

    let prompt;
    if (providedSummary) {
      prompt = `Format a concise, user-friendly summary for this Project Gutenberg book using the provided summary text. Do not invent details. Include a final line with a clickable link.

Title: ${title}
Authors: ${authors.join(", ") || "Unknown"}
Languages: ${langs || "n/a"}
Subjects: ${subjects.join("; ") || "n/a"}
Bookshelves: ${shelves.join("; ") || "n/a"}
Link: ${htmlUrl || "n/a"}

Provided summary text:\n${providedSummary}`;
    } else {
      prompt = `Provide a short (3–4 sentences) summary of this Project Gutenberg book. Include a final line with a clickable link.

Title: ${title}
Authors: ${authors.join(", ") || "Unknown"}
Languages: ${langs || "n/a"}
Subjects: ${subjects.join("; ") || "n/a"}
Bookshelves: ${shelves.join("; ") || "n/a"}
Link: ${htmlUrl || "n/a"}`;
    }

    if (window?.openai?.sendFollowUpMessage) {
      window.openai.sendFollowUpMessage({ prompt }).catch(() => {});
    }
  }, []);

  const onCopyLink = useCallback((url) => {
    const doSet = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    };
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(doSet, doSet);
    } else {
      if (window?.openai?.sendFollowUpMessage) {
        window.openai.sendFollowUpMessage({ prompt: `Share this Project Gutenberg link with the user: ${url}` }).finally(doSet);
      } else {
        doSet();
      }
    }
  }, []);

  return (
    <div
      className="bg-white antialiased w-full text-black px-4 pb-2 border border-black/10 rounded-2xl sm:rounded-3xl overflow-hidden"
      aria-busy={state.loading ? "true" : "false"}
    >
      <div className="max-w-full">
        <div className="flex items-baseline justify-between border-b border-black/5 py-3">
          <div>
            <div className="text-base font-bold">Project Gutenberg Search</div>
            <div className="text-xs text-black/60 mt-0.5">
              {state.count} result{state.count === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              className="rounded-full bg-black text-white text-xs px-3 py-1 disabled:opacity-40"
              disabled={!state.previous || state.loading}
              onClick={() => onNavigate("previous")}
            >
              {state.loading && state.loadingWhich === "previous" ? "Loading…" : "Previous"}
            </button>
            <button
              className="rounded-full bg-black text-white text-xs px-3 py-1 disabled:opacity-40"
              disabled={!state.next || state.loading}
              onClick={() => onNavigate("next")}
            >
              {state.loading && state.loadingWhich === "next" ? "Loading…" : "Next"}
            </button>
            {state.loading && (
              <span className="text-[11px] text-black/60" aria-live="polite">
                Fetching {state.loadingWhich || "page"}…
              </span>
            )}
          </div>
        </div>

        <ul className="mt-1">
          {state.results.map((b) => (
            <BookItem key={b.id} book={b} onSummary={onSummary} onCopyLink={onCopyLink} />
          ))}
          {state.loading && (
            <li className="py-4 text-center text-black/60">Loading…</li>
          )}
          {!state.loading && state.results.length === 0 && (
            <li className="py-6 text-center text-black/60">No books found.</li>
          )}
        </ul>
        {state.error && (
          <div className="py-2 text-xs text-red-600">{state.error}</div>
        )}
        {copied && (
          <div className="py-1 text-[11px] text-black/60" aria-live="polite">Link copied</div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("gutendex-search-root")).render(<App />);
