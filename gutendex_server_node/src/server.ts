/**
 * Gutendex MCP Server
 *
 * A Model Context Protocol server that provides search functionality
 * for Project Gutenberg books via the Gutendex API.
 *
 * Architecture:
 * - config/: Environment and path constants
 * - types/: TypeScript interfaces and schemas
 * - utils/: Logging and widget utilities
 * - widgets/: Widget definitions and registry
 * - tools/: MCP tool definitions
 * - api/: Gutendex API client with caching
 * - mcp/: MCP server setup and request handlers
 * - http/: HTTP server with SSE transport
 */

import { createHttpServer } from "./http/server.js";

// Start the HTTP server (which includes SSE and MCP)
createHttpServer();
