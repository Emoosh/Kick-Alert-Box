// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;
  const { pathname } = request.nextUrl;

  console.log("Middleware - Path:", pathname, "Has token:", !!sessionToken);

  const protectedRoutes = ["/dashboard", "/settings"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    if (!sessionToken) {
      console.log("No session token, redirecting to login");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // JWT verify
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const secretKey = new TextEncoder().encode(secret);
        await jwtVerify(sessionToken, secretKey);
        console.log("JWT verified successfully");
      }
    } catch (jwtError) {
      console.log("JWT verification failed:", jwtError);
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session_token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/login"],
};
