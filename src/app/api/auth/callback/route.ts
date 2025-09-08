import { handleCallback } from "@/lib/kick-oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    // console.log("Callback URL:", url.toString());

    // Log the query parameters
    const params = new URLSearchParams(url.search);
    // console.log("Callback params:", {
    //   code: params.get("code")
    //     ? `${params.get("code")?.substring(0, 5)}...`
    //     : "missing",
    //   state: params.get("state")
    //     ? `${params.get("state")?.substring(0, 5)}...`
    //     : "missing",
    //   error: params.get("error"),
    //   errorDescription: params.get("error_description"),
    // });

    // Check for OAuth error parameters
    if (params.get("error")) {
      return NextResponse.json(
        {
          error: params.get("error"),
          error_description: params.get("error_description"),
        },
        { status: 400 }
      );
    }

    // Get code_verifier and state from cookies
    const code_verifier = request.cookies.get("code_verifier")?.value;
    const state = request.cookies.get("state")?.value;

    // console.log("Cookie values:", {
    //   codeVerifierPresent: !!code_verifier,
    //   statePresent: !!state,
    //   codeVerifierLength: code_verifier?.length,
    // });

    if (!code_verifier || !state) {
      return NextResponse.json(
        { error: "Missing PKCE or state values. Please try logging in again." },
        { status: 400 }
      );
    }

    // Exchange code for token
    const tokens = await handleCallback(url, code_verifier, state);

    // Create response
    const response = NextResponse.redirect(new URL("/", request.url));

    // Clear auth cookies
    response.cookies.set("code_verifier", "", { maxAge: 0, path: "/" });
    response.cookies.set("state", "", { maxAge: 0, path: "/" });

    // Store the access token in a cookie (you might want to store in a more secure way)
    response.cookies.set("access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: tokens.expires_in || 3600, // Default to 1 hour if expires_in is not provided
    });

    if (tokens.refresh_token) {
      response.cookies.set("refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error("Error handling callback:", error);
    let errorMessage = "Failed to exchange code for token";
    let errorDetails = {};

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        stack: error.stack,
      };
    }

    // Log detailed information for debugging
    // console.log("URL params:", request.url);
    const cv = request.cookies.get("code_verifier")?.value;
    const st = request.cookies.get("state")?.value;
    // console.log("Code verifier length:", cv?.length);
    // console.log("State value present:", !!st);

    // Create a debug page with detailed error info instead of just JSON
    const htmlResponse = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>OAuth Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: system-ui, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; }
          pre { background: #f4f4f4; padding: 1rem; overflow: auto; }
          .error { color: #e53e3e; }
          .container { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          h1 { margin-top: 0; }
          .btn { display: inline-block; background: #3182ce; color: white; padding: 0.5rem 1rem; 
                text-decoration: none; border-radius: 4px; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">OAuth Error</h1>
          <p>An error occurred during the OAuth callback process:</p>
          <pre class="error">${errorMessage}</pre>
          
          <h2>Debug Information</h2>
          <p>This information can help diagnose the issue:</p>
          <pre>${JSON.stringify(
            {
              url: request.url,
              codeVerifierPresent: !!cv,
              codeVerifierLength: cv?.length,
              statePresent: !!st,
              error: errorDetails,
            },
            null,
            2
          )}</pre>
          
          <a href="/" class="btn">Return to Home</a>
        </div>
      </body>
    </html>
    `;

    return new Response(htmlResponse, {
      status: 500,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }
}
