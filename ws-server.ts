import { WebSocketServer } from "ws";

let wss: WebSocketServer | null = null;
interface BroadcasterWebSocket extends WebSocket {
  broadcasterId?: string;
}
function getWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({ port: 4001 });
    wss.on("connection", (ws, req) => {
      const params = new URLSearchParams(req.url?.split("?")[1]);
      const broadcasterId = params.get("broadcasterId");
      if (broadcasterId) {
        (ws as any).broadcasterId = broadcasterId;
        console.log(`Frontend connected for broadcaster ${broadcasterId}`);
      }
    });
  }
  return wss;
}

const server = getWebSocketServer();

export function broadcastAlert(alert: any) {
  if (!server) return;

  server.clients.forEach((client) => {
    const c = client as unknown as BroadcasterWebSocket;
    if (
      c.readyState === c.OPEN &&
      String(c.broadcasterId) === alert.broadcasterId
    ) {
      client.send(JSON.stringify(alert));
    }
  });
}
