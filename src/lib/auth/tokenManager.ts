// src/lib/auth/tokenManager.ts
import { getRedisClient } from "../redis/redis";
import { SignJWT, jwtVerify } from "jose";
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/utils/crypto";

import { getSubscription } from "@/lib/webhook/webhook-starters/get-subscriptions";
import { deleteSubscription } from "@/lib/webhook/webhook-starters/delete-subscription";
import type { Redis } from "ioredis";
let prisma: PrismaClient;
let redis: Redis;

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

interface KickSubscription {
  id: string;
  app_id: string;
  event: string;
  version: number;
  broadcaster_user_id: number;
  method: string;
  created_at: string;
  updated_at: string;
}

interface SubscriptionsApiResponse {
  data: KickSubscription[];
  message: string;
}

export class TokenManager {
  private static getJWTSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET environment variable is required");
    return new TextEncoder().encode(secret);
  }

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

    return await new SignJWT({ ...sessionPayload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2d")
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

    // I get the kick User ID because i need it when i create the session token.
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

    // 1- Fastest option get the access token from REDIS.
    const encryptedToken = await redis.get(`access_token:${userId}`);
    if (encryptedToken) {
      return decrypt(encryptedToken);
    }

    // 2- Second option get the access token from DATABASE.
    // If somehow access token is not found in the redis but it is still valid in the database,
    // We again store it back to redis for faster access next time.
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

    // If there is no other place to get the access token, we try to refresh it.
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

  static async getSubscriptionStatus(userId: string): Promise<boolean> {
    const prisma = getPrismaClient();

    const userSubscription = await prisma.user.findUnique({
      where: { kickUserId: userId },
      select: { subscriptionEndsAt: true },
    });

    const hasValidSubscription =
      !!userSubscription?.subscriptionEndsAt &&
      userSubscription.subscriptionEndsAt > new Date();

    return hasValidSubscription;
  }

  static async cancelAllEventSubscriptions(kickUserId: string): Promise<void> {
    try {
      console.log(`🧹 Cleaning up subscriptions for user: ${kickUserId}`);

      // 1. User'ın access token'ını al
      const accessToken = await this.getValidAccessTokenForUser(kickUserId);

      if (!accessToken) {
        console.log(`❌ No valid access token for user ${kickUserId}`);
        return;
      }

      // 2. Mevcut subscription'ları al (get-subscriptions.ts kullanarak)
      console.log(`🔍 Fetching subscriptions for user ${kickUserId}...`);
      const subscriptionsResponse = await getSubscription(accessToken);

      // Response'u parse et
      const subscriptionsData: SubscriptionsApiResponse =
        await subscriptionsResponse.json();

      if (!subscriptionsData.data || subscriptionsData.data.length === 0) {
        console.log(`ℹ️ No subscriptions found for user ${kickUserId}`);
        return;
      }

      console.log("🔍 Subscriptions data:", subscriptionsData);
      const subscriptions: KickSubscription[] = subscriptionsData.data;
      const subscriptionIds: string[] = subscriptions.map((sub) => sub.id);

      console.log(
        `📋 Found ${subscriptions.length} subscriptions to delete for user ${kickUserId}`
      );
      console.log(`🗂️ Subscription IDs:`, subscriptionIds);

      // 3. Bütün subscription'ları sil (delete-subscription.ts kullanarak)
      console.log(`🗑️ Deleting ${subscriptionIds.length} subscriptions...`);
      const deleteResponse = await deleteSubscription(
        accessToken,
        subscriptionIds
      );

      // Response kontrolü
      if (deleteResponse.status === 200) {
        console.log(
          `✅ Successfully deleted all subscriptions for user ${kickUserId}`
        );
      } else {
        const errorData = await deleteResponse.json();
        console.error(
          `❌ Failed to delete subscriptions for user ${kickUserId}:`,
          errorData
        );
      }

      console.log(`🏁 Cleanup completed for user ${kickUserId}`);
    } catch (error) {
      console.error(
        `❌ Error cleaning up subscriptions for user ${kickUserId}:`,
        error
      );
    }
  }

  // ✅ User için valid access token al
  private static async getValidAccessTokenForUser(
    kickUserId: string
  ): Promise<string | null> {
    try {
      const prisma = getPrismaClient();

      // 1. KickUserId'den User ID'yi bul
      const user = await prisma.user.findUnique({
        where: { kickUserId },
        select: { id: true, username: true },
      });

      if (!user) {
        console.log(`❓ User not found for kickUserId: ${kickUserId}`);
        return null;
      }

      console.log(`👤 Found user: ${user.username} (${user.id})`);

      // 2. Access token'ı al (mevcut method'u kullan)
      return await this.getValidAccessTokenfromUserId(user.id);
    } catch (error) {
      console.error(
        `Error getting access token for user ${kickUserId}:`,
        error
      );
      return null;
    }
  }

  // ✅ getValidAccessToken method'unu düzenle (cleanup için de çalışsın)
  static async getValidAccessTokenfromUserId(
    userId: string
  ): Promise<string | null> {
    const redis = getRedis();
    const prisma = getPrismaClient();

    try {
      // 1. Redis'den kontrol et
      const encryptedToken = await redis.get(`access_token:${userId}`);
      if (encryptedToken) {
        console.log(`🎯 Found access token in Redis for user: ${userId}`);
        return decrypt(encryptedToken);
      }

      // 2. DB'den kontrol et
      const accessTokenRecord = await prisma.accessToken.findUnique({
        where: { userId, expiresAt: { gt: new Date() } },
      });

      if (accessTokenRecord) {
        console.log(`🎯 Found valid access token in DB for user: ${userId}`);
        const decryptedToken = decrypt(accessTokenRecord.token);

        // Redis'e cache'le
        await redis.setex(
          `access_token:${userId}`,
          3600,
          accessTokenRecord.token
        ); // 1 saat

        return decryptedToken;
      }

      // 3. Refresh token ile yenile (cleanup için - subscription kontrolü YOK)
      console.log(`🔄 Attempting to refresh token for user: ${userId}`);
      return await this.refreshAccessTokenForCleanup(userId);
    } catch (error) {
      console.error(`Error getting valid access token for ${userId}:`, error);
      return null;
    }
  }

  // ✅ Cleanup için özel refresh (subscription kontrolü olmadan)
  private static async refreshAccessTokenForCleanup(
    userId: string
  ): Promise<string | null> {
    const prisma = getPrismaClient();

    try {
      const refreshTokenRecord = await prisma.refreshToken.findUnique({
        where: { userId, expiresAt: { gt: new Date() } },
      });

      if (!refreshTokenRecord) {
        console.log(`❌ No valid refresh token for cleanup: ${userId}`);
        return null;
      }

      const decryptedRefreshToken = decrypt(refreshTokenRecord.token);
      const newTokens = await this.requestNewTokens(decryptedRefreshToken);

      if (newTokens) {
        console.log(`✅ Refreshed access token for cleanup: ${userId}`);
        // Cleanup için sadece access token döndür, store etme
        return newTokens.accessToken;
      }

      return null;
    } catch (error) {
      console.error(`Error refreshing token for cleanup ${userId}:`, error);
      return null;
    }
  }
}
