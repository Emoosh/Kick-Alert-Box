// src/app/api/auth/callback/route.ts
import { handleCallback } from "@/lib/kick-oauth";
import { NextRequest, NextResponse } from "next/server";
import { extractRequestInfo } from "@/lib/utils/request-info";
import { UserCallbackService } from "@/lib/services/usercallback-service";
import { TokenManager } from "@/lib/auth/tokenManager";
import { getCurrentUser, tokenIntrospect } from "@/lib/kick-api";
import { UserService } from "@/lib/services/user-service";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = new URLSearchParams(url.search);

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

    if (!code_verifier || !state || !receivedState || !authCode) {
      console.error("Missing required parameters");
      return NextResponse.redirect(
        new URL("/login?error=missing_params", request.url)
      );
    }

    if (state !== receivedState) {
      console.error("State mismatch: CSRF attack detected");
      return NextResponse.redirect(
        new URL("/login?error=invalid_state", request.url)
      );
    }
    // OAuth token exchange
    const tokens = await handleCallback(url, code_verifier, state);
    console.log("✅ OAuth token exchange successful");
    // -------------------------------------------------
    // oAuth Token Exchange Succeeded
    // In order to get Device info and ip address from the request:

    // Request Info might be changed after in the middleware for security purposes.
    const requestInfo = extractRequestInfo(request);

    // After this part consecutive steps will be:
    // 1. Token introspection to validate and get token info.
    // 2. Get the current user infos.
    // 3. Save or update the user to database.
    // 4. Create a session token for the user.
    // 5. Redirect to dashboard with session token in cookie.

    const result = await UserCallbackService.handleOAuthCallback(tokens, {
      deviceInfo: requestInfo.deviceInfo,
      ipAddress: requestInfo.ipAddress,
    });

    const sessionToken = result.sessionToken;
    const redirectUrl = result.redirectUrl;

    // Redirect the user to dashboard with session token in cookie.
    const response = NextResponse.redirect(
      new URL(`${redirectUrl}`, request.url)
    );

    // Set the session Cookie.
    response.cookies.set("session_token", sessionToken ?? "", {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: 24 * 60 * 60,
      sameSite: "lax",
    });

    // Clear the OAuth cookies
    response.cookies.set("code_verifier", "", { maxAge: 0, path: "/" });
    response.cookies.set("state", "", { maxAge: 0, path: "/" });

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
