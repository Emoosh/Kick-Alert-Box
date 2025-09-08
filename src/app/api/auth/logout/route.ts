import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(new URL("http://localhost:3000"));

  // Clear all auth cookies
  response.cookies.set("access_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("refresh_token", "", { maxAge: 0, path: "/" });

  return response;
}
