---
name: Reference
description: Overview of the MCP server setup process
author: OpenAI
retrieval_date: 2025-10-20
source_url: https://developers.openai.com/apps-sdk/reference
---

# Reference
`window.openai` component bridge
--------------------------------

See [build a custom UX](https://developers.openai.com/apps-sdk/build/custom-ux)

By default, a tool description should include the fields listed [here](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#tool).

### `_meta` fields on tool descriptor

We have also require the following `_meta` fields on the tool descriptor:



* Key: _meta["securitySchemes"]
  * Placement: Tool descriptor
  * Type: array
  * Limits: —
  * Purpose: Back-compat mirror for clients that only read _meta.
* Key: _meta["openai/outputTemplate"]
  * Placement: Tool descriptor
  * Type: string (URI)
  * Limits: —
  * Purpose: Resource URI for component HTML template (text/html+skybridge).
* Key: _meta["openai/widgetAccessible"]
  * Placement: Tool descriptor
  * Type: boolean
  * Limits: default false
  * Purpose: Allow component→tool calls through the client bridge.
* Key: _meta["openai/toolInvocation/invoking"]
  * Placement: Tool descriptor
  * Type: string
  * Limits: ≤ 64 chars
  * Purpose: Short status text while the tool runs.
* Key: _meta["openai/toolInvocation/invoked"]
  * Placement: Tool descriptor
  * Type: string
  * Limits: ≤ 64 chars
  * Purpose: Short status text after the tool completes.


Example:

```
server.registerTool(
  "search",
  {
    title: "Public Search",
    description: "Search public documents.",
    inputSchema: {
      type: "object",
      properties: { q: { type: "string" } },
      required: ["q"]
    },
    securitySchemes: [
      { type: "noauth" },
      { type: "oauth2", scopes: ["search.read"] }
    ],
    _meta: {
      securitySchemes: [
        { type: "noauth" },
        { type: "oauth2", scopes: ["search.read"] }
      ],
      "openai/outputTemplate": "ui://widget/story.html",
      "openai/toolInvocation/invoking": "Searching…",
      "openai/toolInvocation/invoked": "Results ready"
    }
  },
  async ({ q }) => performSearch(q)
);
```


### Annotations

To label a tool as “read-only”, please use the following [annotation](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#annotations) on the tool descriptor:


|Key         |Type   |Required|Notes                                                    |
|------------|-------|--------|---------------------------------------------------------|
|readOnlyHint|boolean|Optional|Signal that the tool is read-only (helps model planning).|


Example:

```
server.registerTool(
  "list_saved_recipes",
  {
    title: "List saved recipes",
    description: "Returns the user’s saved recipes without modifying them.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true }
  },
  async () => fetchSavedRecipes()
);
```


Set these keys on the resource template that serves your component (`registerResource`). They help ChatGPT describe and frame the rendered iframe without leaking metadata to other clients.



* Key: _meta["openai/widgetDescription"]
  * Placement: Resource contents
  * Type: string
  * Purpose: Human-readable summary surfaced to the model when the component loads, reducing redundant assistant narration.
* Key: _meta["openai/widgetPrefersBorder"]
  * Placement: Resource contents
  * Type: boolean
  * Purpose: Hint that the component should render inside a bordered card when supported.
* Key: _meta["openai/widgetCSP"]
  * Placement: Resource contents
  * Type: object
  * Purpose: Define connect_domains and resource_domains arrays for the component’s CSP snapshot.
* Key: _meta["openai/widgetDomain"]
  * Placement: Resource contents
  * Type: string (origin)
  * Purpose: Optional dedicated subdomain for hosted components (defaults to https://web-sandbox.oaiusercontent.com).


Example:

```
server.registerResource("html", "ui://widget/widget.html", {}, async () => ({
  contents: [
    {
      uri: "ui://widget/widget.html",
      mimeType: "text/html",
      text: componentHtml,
      _meta: {
        "openai/widgetDescription": "Renders an interactive UI showcasing the zoo animals returned by get_zoo_animals.",
        "openai/widgetPrefersBorder": true,
        "openai/widgetCSP": {
          connect_domains: [],
          resource_domains: ["https://persistent.oaistatic.com"],
        },
        "openai/widgetDomain": "https://chatgpt.com",
      },
    },
  ],
}));
```


Tool results can contain the following [fields](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#tool-result). Notably:



* Key: structuredContent
  * Type: object
  * Required: Optional
  * Notes: Surfaced to the model and the component. Must match the declared outputSchema, when provided.
* Key: content
  * Type: string or Content[]
  * Required: Optional
  * Notes: Surfaced to the model and the component.
* Key: _meta
  * Type: object
  * Required: Optional
  * Notes: Delivered only to the component. Hidden from the model.


Only `structuredContent` and `content` appear in the conversation transcript. `_meta` is forwarded to the component so you can hydrate UI without exposing the data to the model.

Example:

```
server.registerTool(
  "get_zoo_animals",
  {
    title: "get_zoo_animals",
    inputSchema: { count: z.number().int().min(1).max(20).optional() },
    _meta: { "openai/outputTemplate": "ui://widget/widget.html" }
  },
  async ({ count = 10 }) => {
    const animals = generateZooAnimals(count);

    return {
      structuredContent: { animals },
      content: [{ type: "text", text: `Here are ${animals.length} animals.` }],
      _meta: {
        allAnimalsById: Object.fromEntries(animals.map((animal) => [animal.id, animal]))
      }
    };
  }
);
```


### Error tool result

To return an error on the tool result, use the following `_meta` key:



* Key: _meta["mcp/www_authenticate"]
  * Purpose: Error result
  * Type: string or string[]
  * Notes: RFC 7235 WWW-Authenticate challenges to trigger OAuth.




* Key: _meta["openai/locale"]
  * When provided: Initialize + tool calls
  * Type: string (BCP 47)
  * Purpose: Requested locale (older clients may send _meta["webplus/i18n"]).
* Key: _meta["openai/userAgent"]
  * When provided: Tool calls
  * Type: string
  * Purpose: User agent hint for analytics or formatting.
* Key: _meta["openai/userLocation"]
  * When provided: Tool calls
  * Type: object
  * Purpose: Coarse location hint (city, region, country, timezone, longitude, latitude).


Operation-phase `_meta["openai/userAgent"]` and `_meta["openai/userLocation"]` are hints only; servers should never rely on them for authorization decisions and must tolerate their absence.

Example:

```
server.registerTool(
  "recommend_cafe",
  {
    title: "Recommend a cafe",
    inputSchema: { type: "object" }
  },
  async (_args, { _meta }) => {
    const locale = _meta?.["openai/locale"] ?? "en";
    const location = _meta?.["openai/userLocation"]?.city;

    return {
      content: [{ type: "text", text: formatIntro(locale, location) }],
      structuredContent: await findNearbyCafes(location)
    };
  }
);
```
