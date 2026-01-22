import type { IncomingMessage, ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createGutendexServer } from "../mcp/server.js";
import { info } from "../utils/logger.js";

/**
 * Session record for active SSE connections
 */
export type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

/**
 * Active SSE sessions by session ID
 */
export const sessions = new Map<string, SessionRecord>();

/**
 * Handle SSE connection request
 */
export async function handleSseRequest(res: ServerResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const server = createGutendexServer();
  const transport = new SSEServerTransport("/mcp/messages", res);
  const sessionId = transport.sessionId;

  info("SSE connect", { sessionId });

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
    info("SSE close", { sessionId });
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

/**
 * Handle POST message request for SSE session
 */
export async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  const sessionId = url.searchParams.get("sessionId");
  info("POST /mcp/messages", { sessionId });

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}
