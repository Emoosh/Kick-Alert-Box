// ws-server.ts - Mevcut sisteminize uygun
import { WebSocketServer } from "ws";
import { createServer } from "http";

let wss: WebSocketServer | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;

interface BroadcasterWebSocket extends WebSocket {
  broadcasterId?: string;
  isAlive?: boolean;
}

function getWebSocketServer() {
  if (!wss) {
    const port = parseInt(process.env.PORT || "4001");

    // Create HTTP server for Railway compatibility
    httpServer = createServer((req, res) => {
      console.log(`📥 HTTP Request: ${req.method} ${req.url}`);

      // Health check endpoint
      if (req.url === "/health" || req.url === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ok",
            service: "websocket",
            connections: wss?.clients.size || 0,
          })
        );
      } else if (req.url?.startsWith("/?broadcasterId=")) {
        // WebSocket upgrade request - let WebSocket server handle it
        res.writeHead(200);
        res.end("WebSocket endpoint");
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    // Attach WebSocket server to HTTP server
    wss = new WebSocketServer({ server: httpServer });

    // Start HTTP server
    httpServer.listen(port, () => {
      console.log(`🚀 WebSocket server started on port ${port}`);
    });

    wss.on("connection", (ws, req) => {
      const params = new URLSearchParams(req.url?.split("?")[1]);
      const broadcasterId = params.get("broadcasterId");

      if (broadcasterId) {
        (ws as any).broadcasterId = broadcasterId;
        (ws as any).isAlive = true;

        console.log(`🔗 Frontend connected for broadcaster ${broadcasterId}`);

        // Connection success message
        ws.send(
          JSON.stringify({
            type: "connection",
            status: "connected",
            message: "Successfully connected to alert stream",
            timestamp: new Date().toISOString(),
          })
        );
      } else {
        console.log("❌ Invalid WebSocket connection - no broadcasterId found");
        ws.close(1008, "Invalid connection parameters");
        return;
      }

      // Heartbeat
      ws.on("pong", () => {
        (ws as any).isAlive = true;
      });

      ws.on("close", (code, reason) => {
        console.log(
          `🔌 WebSocket disconnected for ${broadcasterId}: ${code} - ${reason}`
        );
      });

      ws.on("error", (error) => {
        console.error(`🚨 WebSocket error for ${broadcasterId}:`, error);
      });
    });

    // Heartbeat interval
    const heartbeatInterval = setInterval(() => {
      wss?.clients.forEach((client) => {
        const c = client as any;

        if (!c.isAlive) {
          console.log(`💔 Terminating dead connection: ${c.broadcasterId}`);
          return c.terminate();
        }

        c.isAlive = false;
        c.ping();
      });
    }, 30000);

    wss.on("close", () => {
      clearInterval(heartbeatInterval);
      httpServer?.close();
    });
  }
  return wss;
}

// Only start server if this file is run directly
let server: WebSocketServer | null = null;

// Initialize server only when needed
function initializeServer() {
  if (!server) {
    server = getWebSocketServer();
  }
  return server;
}

// Start server if this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  server = getWebSocketServer();
  console.log("🚀 WebSocket server running as standalone process");
}

// Mevcut broadcast fonksiyonun - değişiklik yok
// ws-server.ts - broadcastAlert fonksiyonunu debug'la
export function broadcastAlert(alert: any) {
  // Ensure server is initialized
  const wsServer = server || wss || getWebSocketServer();
  if (!wsServer) {
    console.log("⚠️ WebSocket server not initialized, skipping broadcast");
    return;
  }
  let sentCount = 0;
  let matchedClients = 0;

  wsServer.clients.forEach((client, index) => {
    const c = client as unknown as BroadcasterWebSocket;

    if (String(c.broadcasterId) === alert.broadcasterId) {
      matchedClients++;
      if (c.readyState === c.OPEN) {
        try {
          client.send(JSON.stringify(alert));
          sentCount++;
        } catch (error) {
          console.error(`🚨 Error sending to client ${index}:`, error);
        }
      } else {
        console.log(
          `❌ Client ${index} connection not open (state: ${c.readyState})`
        );
      }
    }
  });
}

// Server stats
export function getServerStats() {
  const wsServer = server || initializeServer();
  if (!wsServer) return null;

  const connections = Array.from(wsServer.clients).map((client) => {
    const c = client as any;
    return {
      broadcasterId: c.broadcasterId?.substring(0, 8) + "...",
      readyState: c.readyState,
      isAlive: c.isAlive,
    };
  });

  return {
    totalConnections: wsServer.clients.size,
    activeConnections: connections.filter((c) => c.readyState === 1).length,
    connections,
  };
}

export { initializeServer as getWebSocketServer };
