// ws-server.ts - Mevcut sisteminize uygun
import { WebSocketServer } from "ws";

let wss: WebSocketServer | null = null;

interface BroadcasterWebSocket extends WebSocket {
  broadcasterId?: string;
  isAlive?: boolean;
}

function getWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({ port: 4001 });

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
    });

    console.log("🚀 WebSocket server started on port 4001");
  }
  return wss;
}

const server = getWebSocketServer();

// Mevcut broadcast fonksiyonun - değişiklik yok
// ws-server.ts - broadcastAlert fonksiyonunu debug'la
export function broadcastAlert(alert: any) {
  if (!server) {
    return;
  }
  let sentCount = 0;
  let matchedClients = 0;

  server.clients.forEach((client, index) => {
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
  if (!server) return null;

  const connections = Array.from(server.clients).map((client) => {
    const c = client as any;
    return {
      broadcasterId: c.broadcasterId?.substring(0, 8) + "...",
      readyState: c.readyState,
      isAlive: c.isAlive,
    };
  });

  return {
    totalConnections: server.clients.size,
    activeConnections: connections.filter((c) => c.readyState === 1).length,
    connections,
  };
}

export { server as webSocketServer };
