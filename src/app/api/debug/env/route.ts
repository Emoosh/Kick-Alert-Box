// src/app/api/debug/env/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "not set",
    NODE_ENV: process.env.NODE_ENV,
  });
}
