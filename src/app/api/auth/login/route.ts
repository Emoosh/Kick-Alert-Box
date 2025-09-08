import { createAuthorizationUrl } from "@/lib/kick-oauth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  // Check if required environment variables are set
  if (!process.env.KICK_CLIENT_ID || !process.env.KICK_CLIENT_SECRET) {
    return NextResponse.json(
      {
        error: "OAuth configuration incomplete. Missing client ID or secret.",
        help: "Make sure you have created a .env.local file with KICK_CLIENT_ID and KICK_CLIENT_SECRET",
      },
      { status: 500 }
    );
  }

  try {
    // Create authorization URL with PKCE and state
    const { url, codeVerifier, state } = await createAuthorizationUrl();

    // Create response with redirect
    const response = NextResponse.redirect(url);

    // Add cookies to the response
    response.cookies.set("code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    response.cookies.set("state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    console.error("Error creating authorization URL:", error);

    let errorMessage = "Failed to create authorization URL";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
    return NextResponse.json(
      { error: "Failed to create authorization URL" },
      { status: 500 }
    );
  }
}
