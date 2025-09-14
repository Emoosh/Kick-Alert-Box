// ws-server.ts
import { WebSocketServer } from "ws";

// Global değişken ile sunucu örneğini tut
let wss: WebSocketServer | null = null;

// Sunucu zaten başlatılmışsa, yenisini oluşturma
function getWebSocketServer() {
  if (!wss) {
    try {
      wss = new WebSocketServer({ port: 4001 });
      wss.on("connection", (ws) => {
        console.log("Frontend connected");
      });
    } catch (error) {
      console.log("WebSocket server already running, reusing...");
    }
  }
  return wss;
}

// Sunucu örneğini al (veya oluştur)
const server = getWebSocketServer();

export function sendFollowerAlert(data: { username: string; message: string }) {
  if (!server) {
    console.log("WebSocket server not available!");
    return;
  }

  console.log("Sending to WebSocket clients:", data);
  console.log("Number of clients:", server.clients.size);

  server.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      console.log("Sending to client");
      client.send(JSON.stringify(data));
    } else {
      console.log("Client not ready:", client.readyState);
    }
  });
}
