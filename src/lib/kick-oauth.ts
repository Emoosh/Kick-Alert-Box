import * as crypto from "crypto";

// Kick API configuration
const KICK_CLIENT_ID = process.env.KICK_CLIENT_ID || "";
const KICK_CLIENT_SECRET = process.env.KICK_CLIENT_SECRET || "";
const KICK_REDIRECT_URI =
  process.env.KICK_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

const KICK_BASE_URL = "https://id.kick.com";
const KICK_AUTH_URL = `${KICK_BASE_URL}/oauth/authorize`;
const KICK_TOKEN_URL = `${KICK_BASE_URL}/oauth/token`;

// Debug configuration
// console.log("OAuth Configuration:", {
//   clientIdLength: KICK_CLIENT_ID?.length,
//   clientSecretLength: KICK_CLIENT_SECRET?.length,
//   redirectUri: KICK_REDIRECT_URI,
//   authUrl: KICK_AUTH_URL,
//   tokenUrl: KICK_TOKEN_URL,
// });

/**
 * Generate random PKCE code verifier
 */
function randomPKCECodeVerifier(): string {
  return base64URLEncode(crypto.randomBytes(32));
}

/**
 * Calculate PKCE code challenge
 */
async function calculatePKCECodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return base64URLEncode(new Uint8Array(digest));
}

/**
 * Generate random state
 * No matter what the State is, we generate a new one each time
 * to ensure maximum security against CSRF attacks.
 */
function randomState(): string {
  return base64URLEncode(crypto.randomBytes(16));
}

/**
 * Base64URL encoding
 * This is a common utility function for OAuth PKCE
 */
function base64URLEncode(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Create authorization URL for Kick OAuth
 */
export async function createAuthorizationUrl(): Promise<{
  url: URL;
  codeVerifier: string;
  state: string;
}> {
  // Generate PKCE values
  const code_verifier = randomPKCECodeVerifier();
  const code_challenge = await calculatePKCECodeChallenge(code_verifier);
  const state = randomState();

  // Build authorization URL manually
  const authUrl = new URL(KICK_AUTH_URL);
  authUrl.searchParams.append("client_id", KICK_CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", KICK_REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append(
    "scope",
    "user:read channel:read channel:write chat:write streamkey:read moderation:ban"
  );
  authUrl.searchParams.append("code_challenge", code_challenge);
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("state", state);

  // console.log("Generated authorization URL:", authUrl.toString());

  return {
    url: authUrl,
    codeVerifier: code_verifier,
    state,
  };
}

/**
 * Exchange authorization code for access token
 */
export async function handleCallback(
  url: URL,
  code_verifier: string,
  state: string
) {
  if (!code_verifier || !state) {
    throw new Error("Missing PKCE or state values");
  }

  const params = new URLSearchParams(url.search);
  const code = params.get("code");
  const returnedState = params.get("state");

  if (!code) {
    throw new Error("No authorization code received from Kick");
  }

  if (returnedState !== state) {
    throw new Error("State mismatch. Possible CSRF attack");
  }

  // Exchange code for token manually
  try {
    // Log info for debugging
    // console.log("Exchanging code for token with:");
    // console.log("- Code:", code ? `${code.substring(0, 5)}...` : "missing");
    // console.log("- Code verifier length:", code_verifier.length);
    // console.log("- State match:", returnedState === state);
    // console.log("- Redirect URI:", KICK_REDIRECT_URI);

    const tokenRequestBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KICK_CLIENT_ID,
      client_secret: KICK_CLIENT_SECRET,
      code: code,
      redirect_uri: KICK_REDIRECT_URI,
      code_verifier: code_verifier,
    }).toString();

    // console.log("Sending token request to:", KICK_TOKEN_URL);

    // Try with application/x-www-form-urlencoded content type (most common)
    let tokenResponse = await fetch(KICK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "KickAlertBoxApp/1.0",
        Origin: "http://localhost:3000",
        Referer: "http://localhost:3000/",
      },
      body: tokenRequestBody,
    });

    // // If first attempt fails with 415 (Unsupported Media Type), try with application/json
    // if (tokenResponse.status === 415) {
    //   console.log("Retrying with application/json content type");
    //   tokenResponse = await fetch(KICK_TOKEN_URL, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Accept: "application/json",
    //     },
    //     body: JSON.stringify({
    //       grant_type: "authorization_code",
    //       client_id: KICK_CLIENT_ID,
    //       client_secret: KICK_CLIENT_SECRET,
    //       code: code,
    //       redirect_uri: KICK_REDIRECT_URI,
    //       code_verifier: code_verifier,
    //     }),
    //   });
    // }

    const responseData = await tokenResponse.text();
    console.log("Oauth response status:", tokenResponse.status);

    // Log first 100 chars of response for debugging
    // if (responseData) {
    //   console.log(
    //     "Response preview:",
    //     responseData.substring(0, 100) +
    //       (responseData.length > 100 ? "..." : "")
    //   );
    // }

    // if (responseData) {
    //   console.log("Response Data: ", responseData);
    // }

    if (!tokenResponse.ok) {
      console.error("Token endpoint error:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        response: responseData.substring(0, 500),
      });
      throw new Error(
        `Token endpoint returned ${tokenResponse.status}: ${responseData}`
      );
    }

    // Check if responseData is empty
    if (!responseData.trim()) {
      console.error("Empty response from token endpoint");
      throw new Error("Empty response from token endpoint");
    }

    try {
      // First, check if the response already looks like JSON
      if (
        responseData.trim().startsWith("{") &&
        responseData.trim().endsWith("}")
      ) {
        // Try a more robust JSON parsing approach
        try {
          // Pre-process the response to handle any potential issues
          const cleanedResponse = responseData
            .trim()
            .replace(/[\u0000-\u001F]+/g, "") // Remove control characters
            .replace(/\\"/g, '"') // Fix escaped quotes if needed
            .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3'); // Ensure property names are quoted

          const parsedResponse = JSON.parse(cleanedResponse);
          console.log(parsedResponse);
          console.log("Successfully parsed token response");
          return parsedResponse;
        } catch (robustJsonError) {
          console.error("Failed robust JSON parsing attempt:", robustJsonError);
          // If our robust parsing fails, try to manually extract the values
          const accessTokenMatch = responseData.match(
            /"access_token"\s*:\s*"([^"]+)"/
          );
          const refreshTokenMatch = responseData.match(
            /"refresh_token"\s*:\s*"([^"]+)"/
          );
          const expiresInMatch = responseData.match(/"expires_in"\s*:\s*(\d+)/);
          const tokenTypeMatch = responseData.match(
            /"token_type"\s*:\s*"([^"]+)"/
          );
          const scopeMatch = responseData.match(/"scope"\s*:\s*"([^"]+)"/);

          if (accessTokenMatch) {
            console.log("Manually extracted token values from response");
            return {
              access_token: accessTokenMatch[1],
              refresh_token: refreshTokenMatch
                ? refreshTokenMatch[1]
                : undefined,
              expires_in: expiresInMatch
                ? parseInt(expiresInMatch[1], 10)
                : undefined,
              token_type: tokenTypeMatch ? tokenTypeMatch[1] : "Bearer",
              scope: scopeMatch ? scopeMatch[1] : undefined,
            };
          }
        }
      }

      // If we've reached here, try standard JSON parsing
      const parsedResponse = JSON.parse(responseData);
      console.log("Successfully parsed token response");
      return parsedResponse;
    } catch (jsonError) {
      console.error("Failed to parse token response as JSON:", responseData);

      // Sometimes OAuth providers might return URL-encoded params directly
      try {
        const params = new URLSearchParams(responseData);
        const result: Record<string, string> = {};
        params.forEach((value, key) => {
          result[key] = value;
        });

        if (result.access_token) {
          console.log("Parsed response from URL-encoded format");
          return result;
        } else {
          throw new Error("No access_token in parsed URL-encoded response");
        }
      } catch (urlError) {
        throw new Error(`Invalid response format: ${responseData}`);
      }
    }
  } catch (error) {
    console.error("Token exchange error:", error);
    throw error;
  }
}
