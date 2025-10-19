---
name: Connect from ChatGPT
description: Overview of the MCP server setup process
author: OpenAI
retrieval_date: 2025-10-20
source_url: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
---

# Connect from ChatGPT
Before you begin
----------------

You can test your app in ChatGPT with your account using [developer mode](https://platform.openai.com/docs/guides/developer-mode).

Please note that publishing your app for public access is not available at the moment, but we will accept submissions later this year. You can learn more in our [app developer guidelines](https://developers.openai.com/apps-sdk/app-developer-guidelines).

To turn on developer mode, navigate to **Settings → Apps & Connectors → Advanced settings (bottom of the page)**.

From there, you can toggle developer mode if you organization allows it.

Once developer mode is active you will see a **Create** button under **Settings → Apps & Connectors**.

Note that ChatGPT Apps is only supported on Plus, Pro, Go and Free plans. Business, Enterprise, or Education plans do not support ChatGPT Apps today, though availability for those plans is on our roadmap. You will still be able to use developer mode on those plans, but you will not be able to integrate Apps into ChatGPT.

Create a connector
------------------

Once you have developer mode enabled, you can create a connector for your app in ChatGPT.

1.  Ensure your MCP server is reachable over HTTPS (for local development, you can expose a local server to the public internet via a tool such as [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)).
2.  In ChatGPT, navigate to **Settings → Connectors → Create**.
3.  Provide the metadata for your connector:
    *   **Connector name** – a user-facing title such as _Kanban board_.
    *   **Description** – explain what the connector does and when to use it. The model uses this text during discovery.
    *   **Connector URL** – the public `/mcp` endpoint of your server (for example `https://abc123.ngrok.app/mcp`).
4.  Click **Create**. If the connection succeeds you will see a list of the tools your server advertises. If it fails, refer to the [Testing](https://developers.openai.com/apps-sdk/deploy/testing) guide to debug your app with MCP Inspector or the API Playground.

Try the app
-----------

Once your connector is created, you can try it out in a new ChatGPT conversation.

1.  Open a new chat in ChatGPT.
2.  Click the **+** button near the message composer, and click **More**.
3.  Choose the connector for your app in the list of available tools. This will add your app to the conversation context for the model to use.
4.  Prompt the model to invoke tools by saying related to your app. For example, “What are my available tasks?” for a Kanban board app.

ChatGPT will display tool-call payloads in the UI so you can confirm inputs and outputs. Write tools will require manual confirmation unless you choose to remember approvals for the conversation.

Whenever you change your tools list or descriptions, you can refresh your MCP server’s metadata in ChatGPT.

1.  Update your MCP server and redeploy it (unless you are using a local server).
2.  In **Settings → Connectors**, click into your connector and choose **Refresh**.
3.  Verify the tool list updates and try a few prompts to test the updated flows.

Using other clients
-------------------

You can connect to your MCP server on other clients.

*   **API Playground** – visit the [platform playground](%60https://platform.openai.com/chat%60), and add your MCP server to the conversation: open **Tools → Add → MCP Server**, and paste the same HTTPS endpoint. This is useful when you want raw request/response logs.
*   **Mobile clients** – once the connector is linked on ChatGPT web, it will be available on ChatGPT mobile apps as well. Test mobile layouts early if your component has custom controls.

With the connector linked you can move on to validation, experiments, and eventual rollout.