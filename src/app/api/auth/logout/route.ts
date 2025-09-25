// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TokenManager } from "@/lib/auth/tokenManager";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;

    if (sessionToken) {
      // Session'ı temizle (Redis + DB)
      await TokenManager.deleteSession(sessionToken);
      console.log("✅ Session deleted from Redis/DB");
    }

    const response = NextResponse.json({ message: "Logged out successfully" });

    // Cookie'yi sil
    response.cookies.set("session_token", "", {
      maxAge: 0,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    console.log("✅ Session cookie cleared");
    return response;
  } catch (error) {
    console.error("Logout error:", error);

    // Hata olsa bile cookie'yi temizle
    const response = NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
    response.cookies.set("session_token", "", {
      maxAge: 0,
      path: "/",
    });

    return response;
  }
}
