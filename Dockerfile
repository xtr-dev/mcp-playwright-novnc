FROM mcp/playwright:latest

USER root

# Install X11, VNC, and process management components
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    supervisor \
    fluxbox \
    dbus-x11 \
    && rm -rf /var/lib/apt/lists/*

# Create pwuser for running the application
RUN useradd -m -s /bin/bash pwuser

# Create directories for supervisor and logs with proper permissions
RUN mkdir -p /var/log/supervisor /var/run/supervisor \
    && chown -R pwuser:pwuser /var/log/supervisor /var/run/supervisor

# Install Playwright browsers with dependencies for headed mode
RUN npx playwright install chromium --with-deps || true

# Set display environment variable
ENV DISPLAY=:99
ENV SCREEN_WIDTH=1920
ENV SCREEN_HEIGHT=1080
ENV SCREEN_DEPTH=24
ENV MCP_PORT=3000
ENV MCP_BROWSER=chromium
ENV HOME=/home/pwuser

# Copy configuration files
COPY --chmod=755 supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY --chmod=755 entrypoint.sh /entrypoint.sh
COPY --chmod=755 start-mcp.sh /usr/local/bin/start-mcp.sh
COPY --chmod=644 playwright-config.json /etc/playwright-config.json

# Give pwuser access to the app directory and playwright cache
RUN chown -R pwuser:pwuser /app /home/pwuser

# Switch to non-root user
USER pwuser

# Expose ports:
# 3000 - MCP SSE server
# 5900 - VNC server (internal, used by noVNC)
# 6080 - noVNC web interface
EXPOSE 3000 5900 6080

ENTRYPOINT ["/entrypoint.sh"]
