import { WebSocketServer } from "ws";

let wss: WebSocketServer | null = null;

function getWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({ port: 4001 });
    wss.on("connection", () => {
      console.log("Frontend connected");
    });
  }
  return wss;
}

const server = getWebSocketServer();

export function broadcastAlert(alert: any) {
  if (!server) return;
  server.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(alert));
    }
  });
}
