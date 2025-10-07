// src/lib/auth/tokenManager.ts
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

// ✅ JWT Payload interface
export interface SessionPayload {
  userId: string;
  kickUserId: string;
  clientId: string;
  ipAddress?: string;
  deviceInfo?: string;
  scope: string[];
  type: "session";
}

export class TokenManager {
  private static getJWTSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET environment variable is required");
    return new TextEncoder().encode(secret);
  }

  // ✅ Meaningful bilgilerle JWT session token oluştur
  private static async generateSessionToken(payload: {
    userId: string;
    kickUserId: string;
    deviceInfo?: string;
    ipAddress?: string;
    scope: string[];
  }): Promise<string> {
    const secret = this.getJWTSecret();
    const clientId = process.env.KICK_CLIENT_ID;

    if (!clientId) throw new Error("KICK_CLIENT_ID is required");

    const sessionPayload: SessionPayload = {
      userId: payload.userId,
      kickUserId: payload.kickUserId,
      clientId,
      deviceInfo: payload.deviceInfo,
      ipAddress: payload.ipAddress,
      scope: payload.scope,
      type: "session",
    };

    console.log("Generating session token with payload:", sessionPayload);
    return await new SignJWT({ ...sessionPayload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2d") // 2 day validity
      .sign(secret);
  }

  private static async verifySessionToken(
    token: string
  ): Promise<SessionPayload | null> {
    try {
      const secret = this.getJWTSecret();
      const { payload } = await jwtVerify(token, secret);
      return payload as unknown as SessionPayload;
    } catch (error) {
      console.error("JWT verification failed:", error);
      return null;
    }
  }

  static async getSessionData(sessionToken: string): Promise<{
    sessionPayload: SessionPayload;
    accessToken: string;
  } | null> {
    try {
      // 1- Verify the session token
      const payload = await this.verifySessionToken(sessionToken);
      if (!payload) return null;

      // 2- Get the access token
      const accessToken = await this.getValidAccessToken(sessionToken);
      return {
        sessionPayload: {
          userId: payload.userId,
          kickUserId: payload.kickUserId,
          clientId: payload.clientId,
          ipAddress: payload.ipAddress,
          deviceInfo: payload.deviceInfo,
          scope: payload.scope,
          type: payload.type,
        },
        accessToken: accessToken ?? "",
      };
    } catch (error) {
      console.error("Error getting session data:", error);
      return null;
    }
  }

  static async isSessionValid(sessionToken: string): Promise<boolean> {
    const payload = await this.verifySessionToken(sessionToken);
    return !!payload && payload.type === "session";
  }

  static async getUserIdFromSession(
    sessionToken: string
  ): Promise<string | null> {
    const payload = await this.verifySessionToken(sessionToken);
    return payload?.userId || null;
  }

  // ✅ Session payload'ından tüm bilgileri al
  static async getSessionPayload(
    sessionToken: string
  ): Promise<SessionPayload | null> {
    return await this.verifySessionToken(sessionToken);
  }

  static async storeTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expires_in: number,
    scope: string[],
    kickUserId?: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<string> {
    const redis = getRedis();
    const prisma = getPrismaClient();

    if (!kickUserId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { kickUserId: true },
      });
      kickUserId = user?.kickUserId;
    }

    if (!kickUserId) {
      throw new Error("KickUserId not found");
    }

    const sessionToken = await this.generateSessionToken({
      userId,
      kickUserId,
      deviceInfo,
      ipAddress,
      scope,
    });

    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = encrypt(refreshToken);

    // Redis cache
    await redis.setex(
      `access_token:${userId}`,
      expires_in || 7200,
      encryptedAccessToken
    );

    console.log(`✅ Tokens cached for user ${userId}`);

    console.log("Device Info:", deviceInfo);
    console.log("IP Address:", ipAddress);
    // Database storage
    await prisma.accessToken.upsert({
      where: { userId },
      update: {
        token: encryptedAccessToken,
        expiresAt: new Date(Date.now() + (expires_in || 7200) * 1000),
        scope: scope, // scope is a string[]
        deviceInfo,
        ipAddress,
        lastUsedAt: new Date(),
      },
      create: {
        token: encryptedAccessToken,
        userId,
        scope, // scope is a string[]
        expiresAt: new Date(Date.now() + (expires_in || 7200) * 1000),
        deviceInfo,
        ipAddress,
      },
    });

    if (encryptedRefreshToken) {
      await prisma.refreshToken.upsert({
        where: { userId },
        update: {
          token: encryptedRefreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deviceInfo,
          ipAddress,
          lastUsedAt: new Date(),
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

  // ✅ Session token'dan access token al
  static async getValidAccessToken(
    sessionToken: string
  ): Promise<string | null> {
    const payload = await this.verifySessionToken(sessionToken);
    if (!payload) return null;

    const userId = payload.userId;
    const redis = getRedis();
    const prisma = getPrismaClient();

    // Redis'den çek
    const encryptedToken = await redis.get(`access_token:${userId}`);
    if (encryptedToken) {
      return decrypt(encryptedToken);
    }

    // DB'den çek
    const accessTokenRecord = await prisma.accessToken.findUnique({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    if (accessTokenRecord) {
      // Redis'e geri koy
      const ttl = Math.floor(
        (accessTokenRecord.expiresAt.getTime() - Date.now()) / 1000
      );
      await redis.setex(`access_token:${userId}`, ttl, accessTokenRecord.token);
      return decrypt(accessTokenRecord.token);
    }

    // Refresh token ile yenile
    return await this.refreshAccessToken(userId);
  }

  private static async refreshAccessToken(
    userId: string
  ): Promise<string | null> {
    const prisma = getPrismaClient();

    const refreshTokenRecord = await prisma.refreshToken.findUnique({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    if (!refreshTokenRecord) return null;

    const decryptedRefreshToken = decrypt(refreshTokenRecord.token);
    const newTokens = await this.requestNewTokens(decryptedRefreshToken);

    if (newTokens) {
      // Yeni token'ları sakla (eski session bilgileriyle)
      await this.storeTokens(
        userId,
        newTokens.accessToken,
        newTokens.refreshToken,
        newTokens.expires_in,
        newTokens.scope
      );
      return newTokens.accessToken;
    }

    return null;
  }

  private static async requestNewTokens(
    refreshToken: string
  ): Promise<TokenData | null> {
    try {
      const clientId = process.env.KICK_CLIENT_ID;
      const clientSecret = process.env.KICK_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("KICK_CLIENT_ID and KICK_CLIENT_SECRET are required");
      }

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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

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

  static async deleteSession(sessionToken: string): Promise<void> {
    try {
      const payload = await this.verifySessionToken(sessionToken);
      if (!payload) return;

      const redis = getRedis();
      const prisma = getPrismaClient();
      const userId = payload.userId;

      // Redis'den sil
      await redis.del(`access_token:${userId}`);

      // DB'den sil
      await prisma.accessToken.deleteMany({ where: { userId } });
      await prisma.refreshToken.deleteMany({ where: { userId } });

      console.log(`✅ Session cleared for user ${userId}`);
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }
}
