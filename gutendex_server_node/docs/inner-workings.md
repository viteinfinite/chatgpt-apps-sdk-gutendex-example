# Widget Flow Overview

## 1. Build Time (Pre-built, not server-rendered)

```
src/gutendex-search/index.jsx (React component) 
↓
Vite build
↓
`assets/gutendex-search-2d2b.html`
(static HTML bundle with embedded JS/CSS)
```


The widget HTML is not templatified on the server. It's a pre-built React bundle produced by Vite during `pnpm run build`.


## 2. Server Startup (`src/widgets/registry.ts:14`)

```ts
html: readWidgetHtml("gutendex-search"),  // ← Reads from disk at startup
````

The static HTML is loaded into memory once when the server starts.

---

## 3. ChatGPT Requests Widget (`src/mcp/server.ts:71–90`)

When ChatGPT connects via MCP:

1. `listResources` → returns widget resource with URI like
   `ui://widget/gutendex-search-2d2b.html`
2. `readResource` → returns the pre-loaded HTML string

The HTML sent is static — it contains the shell with a root div and script tags that load the React bundle.

---

## 4. Tool Call Returns Data (`src/mcp/server.ts:161–176`)

When searching, the tool returns:

```json
{
  "content": [{ "type": "text", "text": "Found 42 books" }],
  "structuredContent": {
    "query": { ... },
    "count": 42,
    "results": [] // ← Actual book data
  },
  "_meta": {
    "openai/outputTemplate": "ui://widget/gutendex-search-2d2b.html"
  }
}
```

---

## 5. Hydration (`src/gutendex-search/index.jsx:130`)

```js
const initial = useWidgetProps();  // ← Reads from window.openai.toolOutput
const [state, setState] = useState(() => ({
  results: initial?.results ?? [],  // ← Hydrated with search results
  count: initial?.count ?? 0,
  // ...
}));
```

ChatGPT injects `structuredContent` into `window.openai.toolOutput`, and the React app uses this as its initial state.

---

## Summary

**Question:** When is HTML sent?
**Answer:** When ChatGPT requests the MCP resource (once per widget discovery)

---

**Question:** How?
**Answer:** As static MCP resource with MIME type `text/html+skybridge`

---

**Question:** Is it templatified?
**Answer:** No — it's a pre-built React bundle, not a server-side template

---

**Question:** When is it hydrated?
**Answer:** In the browser, when React loads and reads `window.openai.toolOutput`
(populated by ChatGPT from `structuredContent`)

The widget is client-side rendered with data injection, not server-side rendered with templates, sir.
