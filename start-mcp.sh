#!/bin/bash
set -e

# Wait for X11 to be ready
sleep 2

# Calculate viewport size (slightly smaller than screen to account for window decorations)
VIEWPORT_WIDTH=$((${SCREEN_WIDTH:-1920} - 0))
VIEWPORT_HEIGHT=$((${SCREEN_HEIGHT:-1080} - 0))

echo "Starting Playwright MCP server..."
echo "  Port: ${MCP_PORT:-3000}"
echo "  Browser: ${MCP_BROWSER:-chromium}"
echo "  Display: ${DISPLAY:-:99}"
echo "  Viewport: ${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}"

# Run the MCP server using the cli.js from the base image
# Config file contains browser args like --no-sandbox, --disable-infobars
# --isolated allows multiple browser instances
exec node /app/cli.js \
    --port "${MCP_PORT:-3000}" \
    --host 0.0.0.0 \
    --browser "${MCP_BROWSER:-chromium}" \
    --config /etc/playwright-config.json \
    --allowed-hosts "*" \
    --viewport-size "${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}" \
    --isolated
