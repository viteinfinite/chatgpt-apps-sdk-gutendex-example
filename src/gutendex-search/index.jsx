import React, { useMemo, useEffect, useState, useCallback } from "react";
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
      onClick={() => onSummary?.(book, htmlUrl)}
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
        {htmlUrl ? (
          <a
            className="inline-flex items-center rounded-full bg-black text-white px-3 py-1 text-xs hover:opacity-90"
            href={htmlUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => e.stopPropagation()}
          >
            Open
          </a>
        ) : (
          <span className="text-xs text-black/50">No preview</span>
        )}
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
    error: null,
  }));

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

  const fetchPage = useCallback(async (url) => {
    if (!url) return;
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const res = await fetch(url);
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
        error: null,
      }));
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: String(e) }));
    }
  }, []);

  const onNavigate = (which) => {
    const target = which === "next" ? state.next : state.previous;
    if (!target) return;
    fetchPage(target);
  };

  const onSummary = useCallback((book, htmlUrl) => {
    const title = book?.title || "";
    const authorList = (book?.authors || []).map((a) => a.name).filter(Boolean);
    const authorStr = authorList.length ? ` by ${authorList.join(", ")}` : "";
    const urlPart = htmlUrl ? ` You can reference the text at: ${htmlUrl}` : "";
    const prompt = `Provide a short 3-4 sentence summary of the Project Gutenberg book "${title}"${authorStr}.${urlPart}`;
    if (window?.openai?.sendFollowUpMessage) {
      window.openai.sendFollowUpMessage({ prompt }).catch(() => {});
    }
  }, []);

  return (
    <div className="bg-white antialiased w-full text-black px-4 pb-2 border border-black/10 rounded-2xl sm:rounded-3xl overflow-hidden">
      <div className="max-w-full">
        <div className="flex items-baseline justify-between border-b border-black/5 py-3">
          <div>
            <div className="text-base font-bold">Project Gutenberg Search</div>
            <div className="text-xs text-black/60 mt-0.5">
              {state.count} result{state.count === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full bg-black text-white text-xs px-3 py-1 disabled:opacity-40"
              disabled={!state.previous || state.loading}
              onClick={() => onNavigate("previous")}
            >
              Previous
            </button>
            <button
              className="rounded-full bg-black text-white text-xs px-3 py-1 disabled:opacity-40"
              disabled={!state.next || state.loading}
              onClick={() => onNavigate("next")}
            >
              Next
            </button>
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
