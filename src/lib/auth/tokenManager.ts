import { getRedisClient } from "../redis/redis";
import { SignJWT, jwtVerify } from "jose";

let prisma: any;
let redis: any;

function getPrismaClient() {
  if (!prisma) {
    const { PrismaClient } = require("@prisma/client");
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
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    return new TextEncoder().encode(secret);
  }

  private static async generateSessionToken(userId: string): Promise<string> {
    const secret = this.getJWTSecret();

    return await new SignJWT({
      userId,
      type: "session",
    })
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

  static async setTokens(userId: string, tokenData: TokenData) {
    const redis = getRedis();
    const sessionToken = await this.generateSessionToken(userId);

    await redis.setex(
      `access_token:${userId}`,
      tokenData.expires_in || 7200,
      tokenData.accessToken
    );

    // await redis.setex(
    //   `session:${sessionToken}`,
    //   86400,
    //   JSON.stringify({
    //     userId,
    //     scope: tokenData.scope,
    //     tokenType: tokenData.tokentype,
    //   })
    // );

    if (tokenData.refreshToken) {
      try {
        const prisma = getPrismaClient();
        // Dont know the actual expiration from Kick, so I set it to 30 days.
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const user = await prisma.user.findFirst({
          where: { sessionId: userId },
        });

        if (!user) {
          console.warn("⚠️ User not found for sessionId:", userId);
          console.warn("RefreshToken will not be saved to database");
          return sessionToken;
        }

        await prisma.refreshToken.deleteMany({
          where: { userId: user.id },
        });

        await prisma.refreshToken.create({
          data: {
            token: tokenData.refreshToken,
            userId: user.id,
            expiresAt,
            sessionToken,
          },
        });

        console.log("✅ RefreshToken saved successfully");
      } catch (dbError) {
        console.error("❌ Failed to save refresh token:", dbError);
      }
    }

    return sessionToken;
  }

  static async getSessionData(sessionToken: string) {
    try {
      const redis = getRedis();

      const payload = await this.verifySessionToken(sessionToken);
      if (!payload || !payload.userId) {
        return null;
      }

      const userId = payload.userId as string;

      // const sessionData = await redis.get(`session:${sessionToken}`);
      // if (!sessionData) {
      //   return null;
      // }

      // const parsed = JSON.parse(sessionData);
      const accessToken = await this.getAccessToken(userId);

      return {
        userId,
        accessToken,
        // scope: parsed.scope,
        // tokenType: parsed.tokenType,
      };
    } catch (error) {
      console.error("Error getting session data:", error);
      return null;
    }
  }

  static async getAccessToken(userId: string): Promise<string | null> {
    try {
      const prisma = getPrismaClient(); // Lazy load
      const redis = getRedis(); // Lazy load

      const accessToken = await redis.get(`access_token:${userId}`);
      if (accessToken) {
        return accessToken;
      }

      const refreshTokenRecord = await prisma.refreshToken.findFirst({
        where: { userId, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      });

      if (!refreshTokenRecord) {
        return null;
      }

      const newTokens = await this.requestNewTokens(refreshTokenRecord.token);
      if (newTokens) {
        await redis.setex(
          `access_token:${userId}`,
          newTokens.expires_in || 7200,
          newTokens.accessToken
        );

        await prisma.refreshToken.update({
          where: { id: refreshTokenRecord.id },
          data: { token: newTokens.refreshToken },
        });

        return newTokens.accessToken;
      }

      return null;
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
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

  // src/lib/auth/tokenManager.ts içinde deleteSession methodunu ekle/kontrol et
  static async deleteSession(sessionToken: string) {
    try {
      const redis = getRedis();

      const payload = await this.verifySessionToken(sessionToken);
      if (payload && payload.userId) {
        const userId = payload.userId as string;

        // Redis'ten temizle
        await redis.del(`session:${sessionToken}`);
        await redis.del(`access_token:${userId}`);

        console.log("✅ Session data cleared from Redis");

        // DB'den temizle (opsiyonel)
        try {
          const prisma = getPrismaClient();
          await prisma.refreshToken.deleteMany({
            where: { sessionToken },
          });
          console.log("✅ Refresh tokens cleared from DB");
        } catch (dbError) {
          console.warn("Failed to clear refresh tokens from DB:", dbError);
        }
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }
}
