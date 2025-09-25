// src/lib/auth/getAccessTokenFromRequest.ts
import { NextRequest } from "next/server";
import { TokenManager } from "./tokenManager";

export async function getAccessTokenFromRequest(
  request: NextRequest
): Promise<string | null> {
  try {
    const session_token = request.cookies.get("session_token")?.value;
    console.log("session_token", session_token);

    if (!session_token) {
      console.log("No session_token found");
      return null;
    }

    const sessionData = await TokenManager.getSessionData(session_token);
    const accessToken = sessionData?.accessToken;
    if (!accessToken) {
      console.log("No access token found in session data");
      return null;
    }

    return accessToken;
  } catch (error) {
    console.error("Error getting access token from request:", error);
    return null;
  }
}
