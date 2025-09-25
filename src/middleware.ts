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

  // 🎯 Eğer kullanıcı login sayfasındaysa ve JWT token'ı varsa dashboard'a yönlendir
  if (pathname === "/login" && sessionToken) {
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const secretKey = new TextEncoder().encode(secret);
        await jwtVerify(sessionToken, secretKey);
        console.log("JWT verified, redirecting to dashboard from login");
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (jwtError) {
      console.log("JWT verification failed on login page:", jwtError);
      // Invalid token, clear it and stay on login
      const response = NextResponse.next();
      response.cookies.delete("session_token");
      return response;
    }
  }

  // 🎯 Protected route kontrolü
  if (isProtectedRoute) {
    if (!sessionToken) {
      console.log("No session token, redirecting to login");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // JWT verify - başarılıysa devam et, başarısızsa login'e yönlendir
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const secretKey = new TextEncoder().encode(secret);
        await jwtVerify(sessionToken, secretKey);
        console.log("JWT verified successfully - allowing access");
        // ✅ DOĞRU - NextResponse.next() ile devam et
        return NextResponse.next();
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
