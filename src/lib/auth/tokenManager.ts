import { getRedisClient } from "../redis/redis";
import { SignJWT, jwtVerify } from "jose";
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/utils/crypto";

let prisma: PrismaClient;
let redis: any;

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

function getRedis() {
  if (!redis) {
    redis = getRedisClient();
  }
  return redis;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expires_in: number;
  scope: string[];
  tokentype: string;
}

export class TokenManager {
  private static getJWTSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET environment variable is required");
    return new TextEncoder().encode(secret);
  }

  private static async generateSessionToken(userId: string): Promise<string> {
    const secret = this.getJWTSecret();
    return await new SignJWT({ userId, type: "session" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);
  }

  private static async verifySessionToken(token: string) {
    try {
      const secret = this.getJWTSecret();
      const { payload } = await jwtVerify(token, secret);
      return payload;
    } catch {
      return null;
    }
  }

  static async isSessionValid(sessionToken: string): Promise<boolean> {
    const payload = await this.verifySessionToken(sessionToken);
    return !!payload;
  }

  static async getUserIdFromSession(
    sessionToken: string
  ): Promise<string | null> {
    const payload = await this.verifySessionToken(sessionToken);
    return (payload?.userId as string) || null;
  }

  static async setTokens(
    sessionId: string,
    tokenData: TokenData,
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
  ) {
    const redis = getRedis();
    const prisma = getPrismaClient();
    const sessionToken = await this.generateSessionToken(sessionId);

    // Encrpyt both tokens for security issues.

    const encryptedAccessToken = encrypt(tokenData.accessToken);
    const encryptedRefreshToken = encrypt(tokenData.refreshToken);

    await redis.setex(
      `access_token:${sessionId}`,
      tokenData.expires_in || 7200,
      encryptedAccessToken
    );

    console.log(sessionId + " tokens are cached in Redis");
    await prisma.accessToken.upsert({
      where: { token: encryptedAccessToken },
      update: {
        expiresAt: new Date(Date.now() + (tokenData.expires_in || 7200) * 1000),
        deviceInfo,
        ipAddress,
      },
      create: {
        token: encryptedAccessToken,
        userId: userId,
        expiresAt: new Date(Date.now() + (tokenData.expires_in || 7200) * 1000),
        deviceInfo,
        ipAddress,
      },
    });

    if (encryptedRefreshToken) {
      await prisma.refreshToken.upsert({
        where: { token: encryptedRefreshToken },
        update: {
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deviceInfo,
          ipAddress,
        },
        create: {
          token: encryptedRefreshToken,
          userId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deviceInfo,
          ipAddress,
        },
      });
    }

    return sessionToken;
  }
  static async getDecryptedAccessToken(sessionId: string): Promise<string> {
    const encryptedToken = await this.getAccessToken(sessionId);

    if (!encryptedToken) throw new Error("No access token found");

    return decrypt(encryptedToken);
  }

  // Session'dan access token al
  static async getSessionData(sessionToken: string) {
    try {
      const redis = getRedis();
      const payload = await this.verifySessionToken(sessionToken);
      if (!payload || !payload.userId) return null;
      const userId = payload.userId as string;

      const accessToken = await this.getAccessToken(userId);
      return { userId, accessToken };
    } catch (error) {
      console.error("Error getting session data:", error);
      return null;
    }
  }

  static async getAccessToken(sessionId: string): Promise<string | null> {
    const redis = getRedis();
    const prisma = getPrismaClient();

    const encryptedAccessToken = await redis.get(`access_token:${sessionId}`);
    if (encryptedAccessToken) return decrypt(encryptedAccessToken);

    // DB'den en güncel access token'ı bul
    const userId = sessionId;
    const accessTokenRecord = await prisma.accessToken.findFirst({
      where: { userId: userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (accessTokenRecord) {
      await redis.setex(
        `access_token:${userId}`,
        Math.floor((accessTokenRecord.expiresAt.getTime() - Date.now()) / 1000),
        accessTokenRecord.token
      );
      return accessTokenRecord.token;
    }

    // Refresh token ile yeni access token iste (opsiyonel)
    const refreshTokenRecord = await prisma.refreshToken.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (refreshTokenRecord) {
      const newTokens = await this.requestNewTokens(refreshTokenRecord.token);
      if (newTokens) {
        await this.setTokens(userId, newTokens);
        return newTokens.accessToken;
      }
    }

    return null;
  }

  private static async requestNewTokens(
    refreshToken: string
  ): Promise<TokenData | null> {
    try {
      const clientId = process.env.KICK_CLIENT_ID;
      const clientSecret = process.env.KICK_CLIENT_SECRET;
      if (!clientId || !clientSecret)
        throw new Error("KICK_CLIENT_ID and KICK_CLIENT_SECRET are required");

      const response = await fetch("https://id.kick.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expires_in: data.expires_in,
        scope: data.scope || [],
        tokentype: data.token_type,
      };
    } catch (error) {
      console.error("Error requesting new tokens:", error);
      return null;
    }
  }

  static async deleteSession(sessionToken: string) {
    try {
      const redis = getRedis();
      const prisma = getPrismaClient();
      const payload = await this.verifySessionToken(sessionToken);
      if (payload && payload.userId) {
        const userId = payload.userId as string;

        await redis.del(`access_token:${userId}`);
        // İlgili access/refresh token kayıtlarını DB'den silmek istersen:
        await prisma.accessToken.deleteMany({ where: { userId } });
        await prisma.refreshToken.deleteMany({ where: { userId } });
        console.log("✅ Session tokens cleared from DB and Redis");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }
}
