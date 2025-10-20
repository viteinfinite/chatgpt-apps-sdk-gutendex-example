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

function BookItem({ book, onSummary }) {
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
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-black truncate">{title}</div>
        <div className="text-xs text-black/70 mt-0.5 truncate">
          {authors || "Unknown author"}
        </div>
        <div className="text-xs text-black/50 mt-0.5">
          Languages: {langs || "n/a"} • Downloads: {downloads}
        </div>
      </div>
      <div className="shrink-0">
        <button
          type="button"
          className="cursor-pointer inline-flex items-center rounded-full bg-black text-white px-3 py-1 text-xs hover:opacity-90"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSummary?.(book, htmlUrl);
          }}
        >
          Read More
        </button>
      </div>
    </li>
  );
}

function App() {
  const initial = useWidgetProps(() => ({ results: [], count: 0 }));
  const [state, setState] = useState(() => ({
    results: initial?.results ?? [],
    count: initial?.count ?? 0,
    next: initial?.next ?? null,
    previous: initial?.previous ?? null,
    query: initial?.query ?? {},
    loading: false,
    loadingWhich: null,
    error: null,
  }));

  const inFlight = useRef(null);

  // Keep state in sync if the widget gets fresh props (e.g., first render)
  useEffect(() => {
    setState((s) => ({
      ...s,
      results: initial?.results ?? [],
      count: initial?.count ?? 0,
      next: initial?.next ?? null,
      previous: initial?.previous ?? null,
      query: initial?.query ?? {},
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

  const onSummary = useCallback((book, htmlUrl) => {
    const title = book?.title || "";
    const authorList = (book?.authors || []).map((a) => a.name).filter(Boolean);
    const authorStr = authorList.length ? ` by ${authorList.join(", ")}` : "";
    const urlPart = htmlUrl ? ` You can reference the text at: ${htmlUrl}` : "";
    const prompt = `Provide a short 3-4 sentence summary of the Project Gutenberg book "${title}"${authorStr}.${urlPart}. After the summary, provide a beautifully formatted link to the book on Project Gutenberg, prefixed with the emoji 🔗.`;
    if (window?.openai?.sendFollowUpMessage) {
      window.openai.sendFollowUpMessage({ prompt }).catch(() => {});
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
            <BookItem key={b.id} book={b} onSummary={onSummary} />
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
      </div>
    </div>
  );
}

createRoot(document.getElementById("gutendex-search-root")).render(<App />);
