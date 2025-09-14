// ws-server.ts
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 4000 });

wss.on("connection", (ws) => {
  console.log("Frontend connected");
});

export function sendFollowerAlert(data: { username: string; message: string }) {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}
