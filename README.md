# Playwright MCP Server with noVNC Display

A Docker Compose setup that runs the Microsoft Playwright MCP server with a virtual X11 display accessible via noVNC in your web browser.

## Features

- **Playwright MCP Server**: Browser automation via Model Context Protocol (MCP)
- **Headed Browser Mode**: See the browser running in real-time
- **noVNC Web Interface**: View the browser display from any web browser
- **Reusable Architecture**: Persistent Playwright service that can be accessed via SSE or stdio
- **stdio-to-SSE Proxy**: Bridge between stdio-based MCP clients and the SSE endpoint

## Quick Start

### Using Docker Compose (Recommended)

1. Start the persistent Playwright + noVNC service:

```bash
docker compose up -d playwright-display
```

2. Access the services:
   - **noVNC Web UI**: http://localhost:6080
   - **MCP SSE Endpoint**: http://localhost:3080/sse

### MCP Client Configuration

**stdio transport** (recommended):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=playwright-network",
        "mcp-playwright-novnc:latest",
        "mcp-proxy",
        "http://playwright-display:3080/sse"
      ]
    }
  }
}
```

**SSE transport** (direct connection):

```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:3080/sse"
    }
  }
}
```

## Environment Variables

| Variable        | Default  | Description                         |
|-----------------|----------|-------------------------------------|
| `SCREEN_WIDTH`  | 1920     | Virtual screen width in pixels      |
| `SCREEN_HEIGHT` | 1080     | Virtual screen height in pixels     |
| `SCREEN_DEPTH`  | 24       | Color depth                         |
| `MCP_PORT`      | 3080     | MCP server port                     |
| `MCP_BROWSER`   | chromium | Browser (chromium, firefox, webkit) |

## Docker Compose Configuration

The project includes a `docker-compose.yml` file with the persistent Playwright + noVNC service.

The Docker image also includes a `mcp-proxy` script that bridges stdio to SSE, allowing MCP clients using stdio transport to connect to the running Playwright service.

**Proxy Usage**: The `mcp-proxy` command accepts the SSE URL as a command-line argument:

```bash
mcp-proxy <SSE_URL>
```

You can also use the `PLAYWRIGHT_SSE_URL` environment variable as a fallback.

You can customize the environment variables in the compose file or via a `.env` file:

```env
SCREEN_WIDTH=1920
SCREEN_HEIGHT=1080
SCREEN_DEPTH=24
MCP_BROWSER=chromium
```

## Building Locally

```bash
# Build the Docker image
docker compose build

# Start the service
docker compose up -d

# View logs
docker compose logs -f playwright-display
```

## Testing the Proxy

```bash
# Test the proxy connection
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  docker run --rm -i --network=playwright-network \
  mcp-playwright-novnc:latest mcp-proxy http://playwright-display:3080/sse
```

## Architecture

### Persistent Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Docker Container (playwright-display)          │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐  │
│  │  Xvfb   │──│ x11vnc  │──│ noVNC   │──│ Web Browser   │  │
│  │ :99     │  │ :5900   │  │ :6080   │  │ (localhost)   │  │
│  └────┬────┘  └─────────┘  └─────────┘  └───────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────┐                   │
│  │      Playwright MCP Server          │◄── SSE Client     │
│  │      (Chromium Browser)             │    (:3080/sse)    │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │      mcp-proxy Script               │◄── stdio Client   │
│  │   (stdio ↔ SSE bridge)              │    (on demand)    │
│  └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

The architecture consists of:

1. **Persistent Playwright Service**: Runs continuously with Xvfb, noVNC, and the MCP server
2. **SSE Endpoint**: Direct access at `http://localhost:3080/sse` for SSE-based MCP clients
3. **stdio Proxy**: On-demand `mcp-proxy` script that bridges stdio to the SSE endpoint for stdio-based MCP clients

## Available MCP Tools

The Playwright MCP server provides browser automation tools including:

- `browser_navigate` - Navigate to a URL
- `browser_click` - Click on elements
- `browser_type` - Type text into inputs
- `browser_fill_form` - Fill form fields
- `browser_take_screenshot` - Capture screenshots
- `browser_snapshot` - Capture accessibility snapshot
- `browser_tabs` - Manage browser tabs
- `browser_close` - Close the browser
- `browser_evaluate` - Evaluate JavaScript
- `browser_console_messages` - Get console messages
- And many more...

## Using Pre-built Images

Pre-built images are available from GitHub Container Registry:

```bash
# Pull the latest image
docker pull ghcr.io/xtr-dev/mcp-playwright-novnc:latest

# Use in docker-compose.yml
services:
  playwright-display:
    image: ghcr.io/xtr-dev/mcp-playwright-novnc:latest
    # ... rest of configuration
```

Or use in your MCP client configuration:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=playwright-network",
        "ghcr.io/xtr-dev/mcp-playwright-novnc:latest",
        "mcp-proxy",
        "http://playwright-display:3080/sse"
      ]
    }
  }
}
```

## License

Apache License 2.0
