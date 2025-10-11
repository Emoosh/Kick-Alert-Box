// src/app/api/websocket-url/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Railway WebSocket URL'ini environment variable'dan al
  const wsUrl = process.env.WEBSOCKET_URL || 
                process.env.RAILWAY_STATIC_URL?.replace('https://', 'wss://').replace('http://', 'ws://') ||
                'ws://localhost:4001';
  
  return NextResponse.json({ wsUrl });
}