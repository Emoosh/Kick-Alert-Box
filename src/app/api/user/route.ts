import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, tokenIntrospect } from "@/lib/kick-api";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

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

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
