// src/lib/utils/websocket.ts
import { hashSlug } from "../hash/hash";

// WebSocket bağlantısı için URL (ws-server için)
export function getWebSocketUrl(hashedUserId: string): string {
  const wsProtocol = process.env.NODE_ENV === 'production' ? 'wss:' : 'ws:';
  const wsHost = process.env.NODE_ENV === 'production' 
    ? `${process.env.NEXTAUTH_URL?.replace('https://', '').replace('http://', '')}:4001`
    : 'localhost:4001';
  
  return `${wsProtocol}//${wsHost}?broadcasterId=${hashedUserId}`;
}

// Alert sayfasını görüntülemek için URL (frontend page için)
export function generateAlertPageURL(userId: number): string {
  const hashedUserId = hashSlug(userId);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/alert/${hashedUserId}`;
}

// Hash'lenmiş User ID
export function generateHashedUserId(userId: number): string {
  return hashSlug(userId);
}
