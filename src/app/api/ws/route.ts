// src/app/api/ws/route.ts - WebSocket proxy endpoint
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const broadcasterId = searchParams.get("broadcasterId");

  // This is for WebSocket upgrade handling
  // Railway will handle the upgrade automatically

  if (!broadcasterId) {
    return new Response("Missing broadcasterId parameter", { status: 400 });
  }

  return new Response("WebSocket endpoint - upgrade required", {
    status: 426,
    headers: {
      Upgrade: "websocket",
    },
  });
}
