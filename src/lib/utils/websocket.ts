// src/lib/utils/websocket.ts
import { hashSlug } from "../hash/hash";

// WebSocket bağlantısı için URL (ws-server için)
export function generateWebSocketURL(userId: number): string {
  const hashedUserId = hashSlug(userId);
  return `ws://localhost:4001?broadcasterId=${hashedUserId}`;
}

// Alert sayfasını görüntülemek için URL (frontend page için)
export function generateAlertPageURL(userId: number): string {
  const hashedUserId = hashSlug(userId);
  return `http://localhost:3000/alert/${hashedUserId}`;
}

// Hash'lenmiş User ID
export function generateHashedUserId(userId: number): string {
  return hashSlug(userId);
}
