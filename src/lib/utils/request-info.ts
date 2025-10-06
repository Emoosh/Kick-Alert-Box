// src/lib/utils/request-info.ts
import { NextRequest } from "next/server";

export interface RequestInfo {
  deviceInfo: string;
  ipAddress: string;
  userAgent: string;
  platform?: string;
  browser?: string;
}

export function extractRequestInfo(request: NextRequest): RequestInfo {
  // User Agent parse et
  const userAgent = request.headers.get("user-agent") || "Unknown";

  // IP adresini güvenli bir şekilde al
  const getClientIP = (): string => {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0].trim();

    const realIP = request.headers.get("x-real-ip");
    if (realIP) return realIP;

    const vercelIP = request.headers.get("x-vercel-forwarded-for");
    if (vercelIP) return vercelIP;

    return "127.0.0.1";
  };

  // Basit user agent parsing
  const parseUserAgent = (ua: string) => {
    let platform = "Unknown";
    let browser = "Unknown";

    // Platform detection
    if (ua.includes("Windows")) platform = "Windows";
    else if (ua.includes("Mac OS")) platform = "macOS";
    else if (ua.includes("Linux")) platform = "Linux";
    else if (ua.includes("Android")) platform = "Android";
    else if (ua.includes("iOS")) platform = "iOS";

    // Browser detection
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    return { platform, browser };
  };

  const { platform, browser } = parseUserAgent(userAgent);
  const deviceInfo = `${platform} - ${browser}`;

  return {
    deviceInfo,
    ipAddress: getClientIP(),
    userAgent,
    platform,
    browser,
  };
}
