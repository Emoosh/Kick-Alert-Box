// src/app/api/auth/callback/route.ts
import { handleCallback } from "@/lib/kick-oauth";
import { NextRequest, NextResponse } from "next/server";
import { TokenManager } from "@/lib/auth/tokenManager";
import { getCurrentUser, tokenIntrospect } from "@/lib/kick-api";
import { UserService } from "@/lib/services/user-service";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = new URLSearchParams(url.search);

    // OAuth error kontrolü
    if (params.get("error")) {
      console.error("OAuth error:", params.get("error"));
      return NextResponse.redirect(
        new URL("/login?error=" + params.get("error"), request.url)
      );
    }

    // PKCE values
    const code_verifier = request.cookies.get("code_verifier")?.value;
    const state = request.cookies.get("state")?.value;
    const receivedState = params.get("state");
    const authCode = params.get("code");

    // Güvenlik kontrolleri
    if (!code_verifier || !state || !receivedState || !authCode) {
      console.error("Missing required parameters");
      return NextResponse.redirect(
        new URL("/login?error=missing_params", request.url)
      );
    }

    // State parameter doğrulama
    if (state !== receivedState) {
      console.error("State mismatch: CSRF attack detected");
      return NextResponse.redirect(
        new URL("/login?error=invalid_state", request.url)
      );
    }

    console.log("✅ Security checks passed, processing OAuth callback...");

    // OAuth token exchange
    const tokens = await handleCallback(url, code_verifier, state);
    console.log("✅ OAuth tokens received");

    // 🎯 1. USER BİLGİLERİNİ AL VE DATABASE'E KAYDET
    const sessionId = crypto.randomUUID();
    console.log("Generated session ID:", sessionId);

    // Token introspect
    const tokenIntrospectResponse = await tokenIntrospect(tokens.access_token);
    if (!tokenIntrospectResponse) {
      throw new Error("Failed to introspect token");
    }

    const tokenInfo = {
      active: tokenIntrospectResponse.data.active,
      client_id: tokenIntrospectResponse.data.client_id,
      exp: tokenIntrospectResponse.data.exp,
      scope: tokenIntrospectResponse.data.scope,
      token_type: tokenIntrospectResponse.data.token_type,
    };

    // User bilgilerini al
    const userResponse = await getCurrentUser(tokens.access_token);
    const userData = userResponse.data[0];

    // 🎯 User'ı database'e kaydet (sessionId ile)
    const dbUser = await UserService.createOrUpdateUser({
      kickUserId: userData.user_id.toString(),
      username: userData.name,
      email: userData.email,
      profilePicture: userData.profile_picture,
      sessionId: sessionId, // ✅ Session ID'yi burada set et
      accessToken: tokens.access_token,
      tokenInfo: tokenInfo,
      scope: tokenInfo.scope.split(" "),
    });

    console.log("✅ User saved to database with sessionId:", sessionId);

    // 🎯 2. ŞİMDİ TOKEN MANAGER'DA SESSION OLUŞTUR
    const sessionToken = await TokenManager.setTokens(sessionId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expires_in: tokens.expires_in || 7200,
      scope: tokenInfo.scope.split(" "),
      tokentype: tokens.token_type || "Bearer",
    });

    console.log("✅ Session token created");

    // 🎯 Dashboard'a yönlendir
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    // Cookie'leri temizle
    response.cookies.set("code_verifier", "", { maxAge: 0, path: "/" });
    response.cookies.set("state", "", { maxAge: 0, path: "/" });

    // Session token'ı set et
    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 24 * 60 * 60,
      sameSite: "lax",
    });

    console.log("✅ Redirecting to dashboard with session token");
    return response;
  } catch (error) {
    console.error("Error handling callback:", error);

    const errorResponse = NextResponse.redirect(
      new URL("/login?error=callback_failed", request.url)
    );

    errorResponse.cookies.set("code_verifier", "", { maxAge: 0, path: "/" });
    errorResponse.cookies.set("state", "", { maxAge: 0, path: "/" });

    return errorResponse;
  }
}
