---
name: Troubleshooting
description: Overview of the MCP server setup process
author: OpenAI
retrieval_date: 2025-10-20
source_url: https://developers.openai.com/apps-sdk/deploy/troubleshooting
---

# Troubleshooting
How to triage issues
--------------------

When something goes wrong—components failing to render, discovery missing prompts, auth loops—start by isolating which layer is responsible: server, component, or ChatGPT client. The checklist below covers the most common problems and how to resolve them.

Server-side issues
------------------

*   **No tools listed** – confirm your server is running and that you are connecting to the `/mcp` endpoint. If you changed ports, update the connector URL and restart MCP Inspector.
*   **Structured content only, no component** – confirm the tool response sets `_meta["openai/outputTemplate"]` to a registered HTML resource with `mimeType: "text/html+skybridge"`, and that the resource loads without CSP errors.
*   **Schema mismatch errors** – ensure your Pydantic or TypeScript models match the schema advertised in `outputSchema`. Regenerate types after making changes.
*   **Slow responses** – components feel sluggish when tool calls take longer than a few hundred milliseconds. Profile backend calls and cache results when possible.

*   **Widget fails to load** – open the browser console (or MCP Inspector logs) for CSP violations or missing bundles. Make sure the HTML inlines your compiled JS and that all dependencies are bundled.
*   **Drag-and-drop or editing doesn’t persist** – verify you call `window.openai.setWidgetState` after each update and that you rehydrate from `window.openai.widgetState` on mount.
*   **Layout problems on mobile** – inspect `window.openai.displayMode` and `window.openai.maxHeight` to adjust layout. Avoid fixed heights or hover-only actions.

Discovery and entry-point issues
--------------------------------

*   **Tool never triggers** – revisit your metadata. Rewrite descriptions with “Use this when…” phrasing, update starter prompts, and retest using your golden prompt set.
*   **Wrong tool selected** – add clarifying details to similar tools or specify disallowed scenarios in the description. Consider splitting large tools into smaller, purpose-built ones.
*   **Launcher ranking feels off** – refresh your directory metadata and ensure the app icon and descriptions match what users expect.

Authentication problems
-----------------------

*   **401 errors** – include a `WWW-Authenticate` header in the error response so ChatGPT knows to start the OAuth flow again. Double-check issuer URLs and audience claims.
*   **Dynamic client registration fails** – confirm your authorization server exposes `registration_endpoint` and that newly created clients have at least one login connection enabled.

Deployment problems
-------------------

*   **Ngrok tunnel times out** – restart the tunnel and verify your local server is running before sharing the URL. For production, use a stable hosting provider with health checks.
*   **Streaming breaks behind proxies** – ensure your load balancer or CDN allows server-sent events or streaming HTTP responses without buffering.

When to escalate
----------------

If you have validated the points above and the issue persists:

1.  Collect logs (server, component console, ChatGPT tool call transcript) and screenshots.
2.  Note the prompt you issued and any confirmation dialogs.
3.  Share the details with your OpenAI partner contact so they can reproduce the issue internally.

A crisp troubleshooting log shortens turnaround time and keeps your connector reliable for users.