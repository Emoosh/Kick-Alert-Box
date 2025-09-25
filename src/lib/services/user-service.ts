// src/lib/services/user-service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateUserData {
  kickUserId: string;
  username: string;
  email?: string;
  profilePicture?: string;
  sessionId: string;
  accessToken: string;
  tokenInfo: any;
  scope: string[];
}

export class UserService {
  static async createOrUpdateUser(userData: CreateUserData) {
    try {
      // User'ı kickUserId'ye göre bul veya oluştur
      const user = await prisma.user.upsert({
        where: {
          kickUserId: userData.kickUserId,
        },
        update: {
          username: userData.username,
          email: userData.email,
          profilePicture: userData.profilePicture,
          sessionId: userData.sessionId,
          // Access token'ı encrypted olarak kaydet (opsiyonel)
          accessToken: userData.accessToken,
          tokenInfo: userData.tokenInfo,
          scope: userData.scope,
          lastLoginAt: new Date(),
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          kickUserId: userData.kickUserId,
          username: userData.username,
          email: userData.email,
          profilePicture: userData.profilePicture,
          sessionId: userData.sessionId,
          accessToken: userData.accessToken,
          tokenInfo: userData.tokenInfo,
          scope: userData.scope,
          lastLoginAt: new Date(),
          isActive: true,
        },
      });

      return user;
    } catch (error) {
      console.error("Error creating/updating user:", error);
      throw error;
    }
  }

  static async getUserByKickId(kickUserId: string) {
    return await prisma.user.findUnique({
      where: { kickUserId },
    });
  }

  static async getUserBySessionId(sessionId: string) {
    return await prisma.user.findFirst({
      where: { sessionId },
    });
  }

  static async updateLastActivity(kickUserId: string) {
    return await prisma.user.update({
      where: { kickUserId },
      data: {
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
