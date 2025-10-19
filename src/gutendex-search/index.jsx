import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { useWidgetProps } from "../use-widget-props";

function BookItem({ book }) {
  const htmlUrl = useMemo(() => {
    const fmts = book?.formats || {};
    // Prefer HTML over plain text
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
    // Fallback to any available
    const first = Object.values(fmts)[0];
    return typeof first === "string" ? first : null;
  }, [book]);

  const title = book?.title || "Untitled";
  const authors = (book?.authors || []).map((a) => a.name).join(", ");
  const langs = (book?.languages || []).join(", ");
  const downloads = book?.download_count ?? 0;

  return (
    <li className="py-3 px-3 -mx-2 rounded-xl hover:bg-black/5 flex items-start gap-3">
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
  const data = useWidgetProps(() => ({ results: [], count: 0 }));
  const { results = [], count = 0, next = null, previous = null, query = {} } =
    data || {};

  const onNavigate = (which) => {
    const target = which === "next" ? next : previous;
    if (!target) return;
    if (window?.openai?.sendFollowUpMessage) {
      const q = JSON.stringify(query || {});
      const prompt = `Fetch ${which} page for last Gutendex search with args ${q}. Page URL: ${target}`;
      window.openai.sendFollowUpMessage({ prompt }).catch(() => {});
    }
  };

  return (
    <div className="antialiased w-full text-black px-4 pb-2 border border-black/10 rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
      <div className="max-w-full">
        <div className="flex items-baseline justify-between border-b border-black/5 py-3">
          <div>
            <div className="text-base font-medium">Project Gutenberg Search</div>
            <div className="text-xs text-black/60 mt-0.5">
              {count} result{count === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full bg-black text-white text-xs px-3 py-1 disabled:opacity-40"
              disabled={!previous}
              onClick={() => onNavigate("previous")}
            >
              Previous
            </button>
            <button
              className="rounded-full bg-black text-white text-xs px-3 py-1 disabled:opacity-40"
              disabled={!next}
              onClick={() => onNavigate("next")}
            >
              Next
            </button>
          </div>
        </div>

        <ul className="mt-1">
          {results.map((b) => (
            <BookItem key={b.id} book={b} />
          ))}
          {results.length === 0 && (
            <li className="py-6 text-center text-black/60">No books found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

createRoot(document.getElementById("gutendex-search-root")).render(<App />);

