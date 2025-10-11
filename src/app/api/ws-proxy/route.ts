// src/app/api/ws-proxy/route.ts - WebSocket proxy for Railway
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const upgradeHeader = request.headers.get('upgrade');
  
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }
  
  // This endpoint will be used for WebSocket upgrade
  // Railway will handle the actual WebSocket upgrade
  return new Response('WebSocket upgrade endpoint', { status: 101 });
}