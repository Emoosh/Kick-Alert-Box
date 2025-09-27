import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, tokenIntrospect } from "@/lib/kick-api";
import { TokenManager } from "@/lib/auth/tokenManager";

export async function GET(request: NextRequest) {
  try {
    const session_token = request.cookies.get("session_token")?.value;
    console.log("session_token", session_token);
    if (!session_token) {
      return NextResponse.json(
        { error: "No session_token  found" },
        { status: 401 }
      );
    }

    const sessionData = await TokenManager.getSessionData(session_token);
    const accessToken = sessionData?.accessToken;
    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 401 }
      );
    }

    const tokenIntrospectResponse = await tokenIntrospect(accessToken);

    if (!tokenIntrospectResponse) {
      return NextResponse.json(
        { error: "Failed to introspect token" },
        { status: 401 }
      );
    }
    const tokenInformation = {
      active: tokenIntrospectResponse.data.active,
      client_id: tokenIntrospectResponse.data.client_id,
      exp: tokenIntrospectResponse.data.exp,
      scope: tokenIntrospectResponse.data.scope,
      token_type: tokenIntrospectResponse.data.token_type,
    };

    const user = await getCurrentUser(accessToken);
    user.tokenInfo = tokenInformation;

    console.log("Fetched user profile:", user);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
