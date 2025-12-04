#!/bin/bash
set -e

# If a command is provided, execute it instead of the default behavior
if [ $# -gt 0 ]; then
    exec "$@"
fi

# Set default values for environment variables
export SCREEN_WIDTH=${SCREEN_WIDTH:-1920}
export SCREEN_HEIGHT=${SCREEN_HEIGHT:-1080}
export SCREEN_DEPTH=${SCREEN_DEPTH:-24}
export MCP_PORT=${MCP_PORT:-3080}
export MCP_BROWSER=${MCP_BROWSER:-chromium}
export DISPLAY=:99

echo "Starting Playwright MCP with noVNC display..."
echo "  Screen: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH}"
echo "  MCP Port: ${MCP_PORT}"
echo "  Browser: ${MCP_BROWSER}"
echo "  noVNC: http://localhost:6080"
echo "  MCP SSE: http://localhost:${MCP_PORT}/sse"

# Start supervisor which manages all processes
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
