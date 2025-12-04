#!/usr/bin/env node

/**
 * stdio-to-SSE proxy for Playwright MCP Server
 *
 * This proxy bridges stdio (used by MCP clients) to SSE (used by the Playwright server).
 * It handles MCP SSE session management and bidirectional message flow.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const readline = require('readline');
const { randomUUID } = require('crypto');

// Get SSE URL from command-line argument or environment variable
const SSE_URL = process.argv[2] || process.env.PLAYWRIGHT_SSE_URL || 'http://localhost:3080/sse';

let sessionId = null;
let sseConnection = null;
let sseRequest = null;

// Parse SSE URL
const sseUrl = new URL(SSE_URL);
const httpModule = sseUrl.protocol === 'https:' ? https : http;

// Send a message to the SSE endpoint
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    if (!sessionId) {
      reject(new Error('No active session'));
      return;
    }

    const postData = JSON.stringify(message);

    const options = {
      hostname: sseUrl.hostname,
      port: sseUrl.port || (sseUrl.protocol === 'https:' ? 443 : 80),
      path: `${sseUrl.pathname}?sessionId=${sessionId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = httpModule.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Message sent successfully
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Connect to SSE stream and establish session
function connectSSEStream() {
  return new Promise((resolve, reject) => {
    // Generate a client sessionId to initiate connection
    const clientSessionId = randomUUID();

    const options = {
      hostname: sseUrl.hostname,
      port: sseUrl.port || (sseUrl.protocol === 'https:' ? 443 : 80),
      path: `${sseUrl.pathname}?sessionId=${clientSessionId}`,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    };

    sseRequest = httpModule.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to connect to SSE: HTTP ${res.statusCode}`));
        return;
      }

      console.error('Connected to SSE endpoint', { stream: 'stderr' });
      sseConnection = res;

      let buffer = '';
      let currentEvent = null;

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);

            // Handle endpoint event to get the server-assigned sessionId
            if (currentEvent === 'endpoint') {
              const endpointUrl = new URL(data, `http://${options.hostname}:${options.port}`);
              sessionId = endpointUrl.searchParams.get('sessionId');
              console.error(`Session established: ${sessionId}`, { stream: 'stderr' });
              resolve();
              currentEvent = null;
              continue;
            }

            // Handle message events
            if (currentEvent === 'message' || !currentEvent) {
              if (data === '[DONE]') {
                currentEvent = null;
                continue;
              }
              try {
                const message = JSON.parse(data);
                // Write message to stdout for the MCP client
                process.stdout.write(JSON.stringify(message) + '\n');
              } catch (e) {
                console.error('Failed to parse SSE message:', data.substring(0, 50), { stream: 'stderr' });
              }
            }

            currentEvent = null;
          } else if (line === '') {
            // Empty line resets event type
            currentEvent = null;
          }
        }
      });

      res.on('end', () => {
        console.error('SSE connection closed', { stream: 'stderr' });
        sseConnection = null;
        sessionId = null;
      });
    });

    sseRequest.on('error', (error) => {
      console.error('SSE connection error:', error.message, { stream: 'stderr' });
      sseConnection = null;
      sessionId = null;
      reject(error);
    });

    sseRequest.end();
  });
}

// Initialize the proxy
async function initialize() {
  try {
    console.error('Playwright MCP stdio-to-SSE proxy started', { stream: 'stderr' });
    console.error(`Forwarding to: ${SSE_URL}`, { stream: 'stderr' });

    // Connect to SSE stream and establish session
    await connectSSEStream();

    // Start reading from stdin
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line) => {
      if (!line.trim()) return;

      try {
        const message = JSON.parse(line);

        // Send the message to the SSE endpoint
        await sendMessage(message);
      } catch (error) {
        console.error('Error processing message:', error.message, { stream: 'stderr' });

        // For initialization errors or critical failures, send error response
        try {
          const parsedMessage = JSON.parse(line);
          const errorResponse = {
            jsonrpc: '2.0',
            id: parsedMessage.id || null,
            error: {
              code: -32603,
              message: error.message,
            },
          };
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
        } catch (e) {
          // Could not parse message, can't send proper error
        }
      }
    });

    rl.on('close', () => {
      console.error('stdin closed, exiting', { stream: 'stderr' });
      if (sseRequest) {
        sseRequest.destroy();
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to initialize:', error.message, { stream: 'stderr' });
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.error('Received SIGINT, exiting', { stream: 'stderr' });
  if (sseRequest) {
    sseRequest.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, exiting', { stream: 'stderr' });
  if (sseRequest) {
    sseRequest.destroy();
  }
  process.exit(0);
});

// Start the proxy
initialize();
