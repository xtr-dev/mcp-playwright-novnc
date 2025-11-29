# Playwright MCP Server with WebX11 Display

A Docker image that runs the Microsoft Playwright MCP server with a virtual X11 display accessible via noVNC in your web browser.

## Features

- **Playwright MCP Server**: Browser automation via Model Context Protocol (MCP)
- **Headed Browser Mode**: See the browser running in real-time
- **noVNC Web Interface**: View the browser display from any web browser
- **SSE Transport**: Connect MCP clients via HTTP

## Quick Start

```bash
docker run -d \
  --name playwright-mcp \
  -p 3000:3000 \
  -p 6080:6080 \
  --shm-size=2gb \
  ghcr.io/xtr-dev/mcp-playwright-webx11:latest
```

Then access:
- **noVNC Web UI**: http://localhost:6080
- **MCP Endpoint**: http://localhost:3000/sse

## Usage with Claude Code

```bash
# Register the MCP server
claude mcp add --transport sse playwright http://localhost:3000/sse
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SCREEN_WIDTH` | 1920 | Virtual screen width in pixels |
| `SCREEN_HEIGHT` | 1080 | Virtual screen height in pixels |
| `SCREEN_DEPTH` | 24 | Color depth |
| `MCP_PORT` | 3000 | MCP server port |
| `MCP_BROWSER` | chromium | Browser (chromium, firefox, webkit) |

## Docker Compose Example

```yaml
services:
  playwright-mcp:
    image: ghcr.io/xtr-dev/mcp-playwright-webx11:latest
    ports:
      - "3000:3000"   # MCP endpoint
      - "6080:6080"   # noVNC web interface
    environment:
      - SCREEN_WIDTH=1920
      - SCREEN_HEIGHT=1080
      - MCP_BROWSER=chromium
    shm_size: '2gb'
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:6080/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Building Locally

```bash
docker build -t mcp-playwright-webx11 .
docker run -d -p 3000:3000 -p 6080:6080 --shm-size=2gb mcp-playwright-webx11
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Container                        │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐  │
│  │  Xvfb   │──│ x11vnc  │──│ noVNC   │──│ Web Browser   │  │
│  │ :99     │  │ :5900   │  │ :6080   │  │ (localhost)   │  │
│  └────┬────┘  └─────────┘  └─────────┘  └───────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────┐                   │
│  │      Playwright MCP Server          │◄── MCP Client     │
│  │      (Chromium Browser)             │    (:3000)        │
│  └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Available MCP Tools

The Playwright MCP server provides browser automation tools including:

- `browser_navigate` - Navigate to a URL
- `browser_click` - Click on elements
- `browser_type` - Type text into inputs
- `browser_fill_form` - Fill form fields
- `browser_take_screenshot` - Capture screenshots
- `browser_tabs` - Manage browser tabs
- `browser_close` - Close the browser

## License

Apache License 2.0
