import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { SSE_PATH, POST_PATH, getPort, DEBUG, GUTENDEX_CACHE_DIR } from "../config/constants.js";
import { info } from "../utils/logger.js";
import { handleSseRequest, handlePostMessage } from "./sse.js";

/**
 * Handle CORS preflight requests
 */
function handleCorsPreflight(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
  if (
    req.method === "OPTIONS" &&
    (pathname === SSE_PATH || pathname === POST_PATH)
  ) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    });
    res.end();
    return true;
  }
  return false;
}

/**
 * Create and start the HTTP server
 */
export function createHttpServer(): ReturnType<typeof createServer> {
  const port = getPort();

  const httpServer = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      console.log("request", req.method, req.url);
      const started = Date.now();
      const done = (status: number) => {
        const dt = Date.now() - started;
        info(`Returned ${status} in ${dt} ms`);
      };

      if (!req.url) {
        res.writeHead(400).end("Missing URL");
        done(400);
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      info("HTTP request", { method: req.method, path: url.pathname });

      // Handle CORS preflight
      if (handleCorsPreflight(req, res, url.pathname)) {
        return;
      }

      // Handle SSE connection
      if (req.method === "GET" && url.pathname === SSE_PATH) {
        await handleSseRequest(res);
        done(200);
        return;
      }

      // Handle POST messages
      if (req.method === "POST" && url.pathname === POST_PATH) {
        await handlePostMessage(req, res, url);
        return;
      }

      // 404 for everything else
      res.writeHead(404).end("Not Found");
      done(404);
    }
  );

  httpServer.on("clientError", (err: Error, socket) => {
    console.error("HTTP client error", err);
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  httpServer.listen(port, () => {
    console.log(`Gutendex MCP server listening on http://localhost:${port}`);
    console.log(`  SSE stream: GET http://localhost:${port}${SSE_PATH}`);
    console.log(`  Message post endpoint: POST http://localhost:${port}${POST_PATH}?sessionId=...`);
    if (DEBUG) {
      console.log(`Debug logging enabled (DEBUG=${process.env.DEBUG})`);
      console.log(`Cache dir: ${GUTENDEX_CACHE_DIR}`);
    }
  });

  return httpServer;
}
