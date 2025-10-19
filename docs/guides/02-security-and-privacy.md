---
name: Security and privacy
description: Overview of the MCP server setup process
author: OpenAI
retrieval_date: 2025-10-20
source_url: https://developers.openai.com/apps-sdk/guides/security-privacy
---

# Security & Privacy
Principles
----------

Apps SDK gives your code access to user data, third-party APIs, and write actions. Treat every connector as production software:

*   **Least privilege** – only request the scopes, storage access, and network permissions you need.
*   **Explicit user consent** – make sure users understand when they are linking accounts or granting write access. Lean on ChatGPT’s confirmation prompts for potentially destructive actions.
*   **Defense in depth** – assume prompt injection and malicious inputs will reach your server. Validate everything and keep audit logs.

Data handling
-------------

*   **Structured content** – include only the data required for the current prompt. Avoid embedding secrets or tokens in component props.
*   **Storage** – decide how long you keep user data and publish a retention policy. Respect deletion requests promptly.
*   **Logging** – redact PII before writing to logs. Store correlation IDs for debugging but avoid storing raw prompt text unless necessary.

Prompt injection and write actions
----------------------------------

Developer mode enables full MCP access, including write tools. Mitigate risk by:

*   Reviewing tool descriptions regularly to discourage misuse (“Do not use to delete records”).
*   Validating all inputs server-side even if the model provided them.
*   Requiring human confirmation for irreversible operations.

Share your best prompts for testing injections with your QA team so they can probe weak spots early.

Network access
--------------

Widgets run inside a sandboxed iframe with a strict Content Security Policy. They cannot access privileged browser APIs such as `window.alert`, `window.prompt`, `window.confirm`, or `navigator.clipboard`. Standard `fetch` requests are allowed only when they comply with the CSP. Work with your OpenAI partner if you need specific domains allow-listed.

Server-side code has no network restrictions beyond what your hosting environment enforces. Follow normal best practices for outbound calls (TLS verification, retries, timeouts).

*   Use OAuth 2.1 flows that include PKCE and dynamic client registration when integrating external accounts.
*   Verify and enforce scopes on every tool call. Reject expired or malformed tokens with `401` responses.
*   For built-in identity, avoid storing long-lived secrets; use the provided auth context instead.

Operational readiness
---------------------

*   Run security reviews before launch, especially if you handle regulated data.
*   Monitor for anomalous traffic patterns and set up alerts for repeated errors or failed auth attempts.
*   Keep third-party dependencies (React, SDKs, build tooling) patched to mitigate supply chain risks.

Security and privacy are foundational to user trust. Bake them into your planning, implementation, and deployment workflows rather than treating them as an afterthought.