---
name: mcp-inspector
description: An MCP inspector for the MCP server
---

# MCP Inspector

> In-depth guide to using the MCP Inspector for testing and debugging Model Context Protocol servers

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is an interactive developer tool for testing and debugging MCP servers. While the [Debugging Guide](/legacy/tools/debugging) covers the Inspector as part of the overall debugging toolkit, this document provides a detailed exploration of the Inspector's features and capabilities.

## Getting started

### Installation and basic usage

The Inspector runs directly through `npx` without requiring installation:

```bash
npx @modelcontextprotocol/inspector <command>
```

```bash
npx @modelcontextprotocol/inspector <command> <arg1> <arg2>
```

#### Inspecting servers from NPM or PyPi

A common way to start server packages from [NPM](https://npmjs.com) or [PyPi](https://pypi.org).


```bash
npx -y @modelcontextprotocol/inspector npx <package-name> <args>
# For example
npx -y @modelcontextprotocol/inspector npx @modelcontextprotocol/server-filesystem /Users/username/Desktop
```

#### Inspecting locally developed servers

To inspect servers locally developed or downloaded as a repository, the most common
way is:

```bash
npx @modelcontextprotocol/inspector node path/to/server/index.js args...
```

## Testing an MCP Server  

1. Build your component bundle (See instructions on the Build a custom UX page page).
2. Start the MCP server.
3. Point MCP Inspector to http://localhost:<port>/mcp, list tools, and call them.
4. Inspector validates that your response includes both structured content and component metadata and renders the component inline.

Please carefully read any attached README for the most accurate instructions.

## Feature overview

The Inspector provides several features for interacting with your MCP server:

### Server connection pane

* Allows selecting the [transport](/legacy/concepts/transports) for connecting to the server
* For local servers, supports customizing the command-line arguments and environment

### Resources tab

* Lists all available resources
* Shows resource metadata (MIME types, descriptions)
* Allows resource content inspection
* Supports subscription testing

### Prompts tab

* Displays available prompt templates
* Shows prompt arguments and descriptions
* Enables prompt testing with custom arguments
* Previews generated messages

### Tools tab

* Lists available tools
* Shows tool schemas and descriptions
* Enables tool testing with custom inputs
* Displays tool execution results

### Notifications pane

* Presents all logs recorded from the server
* Shows notifications received from the server

## Best practices

### Development workflow

1. Start Development
   * Launch Inspector with your server
   * Verify basic connectivity
   * Check capability negotiation

2. Iterative testing
   * Make server changes
   * Rebuild the server
   * Reconnect the Inspector
   * Test affected features
   * Monitor messages

3. Test edge cases
   * Invalid inputs
   * Missing prompt arguments
   * Concurrent operations
   * Verify error handling and error responses
