import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateUserData {
  kickUserId: string;
  username: string;
  email?: string;
  profilePicture?: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  tokenInfo: any;
  scope: string[];
  deviceInfo?: string;
  ipAddress?: string;
}

export class UserService {
  static async createOrUpdateUser(userData: CreateUserData) {
    try {
      const user = await prisma.user.upsert({
        where: { kickUserId: userData.kickUserId },
        update: {
          username: userData.username,
          email: userData.email,
          profilePicture: userData.profilePicture,
          sessionId: userData.sessionId,
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
          tokenInfo: userData.tokenInfo,
          scope: userData.scope,
          lastLoginAt: new Date(),
          isActive: true,
        },
      });

      if (userData.accessToken) {
        await this.saveAccessToken(
          userData.accessToken,
          user.id,
          new Date(Date.now() + 3600 * 1000),
          new Date(),
          userData.deviceInfo,
          userData.ipAddress
        );
      }

      if (userData.refreshToken) {
        await this.saveRefreshToken(
          userData.refreshToken,
          user.id,
          new Date(Date.now() + 30 * 24 * 3600 * 1000),
          new Date(),
          userData.deviceInfo,
          userData.ipAddress
        );
      }

      return user;
    } catch (error) {
      console.error("Error creating/updating user:", error);
      throw error;
    }
  }

  static async saveAccessToken(
    accessToken: string,
    userId: string,
    expiresAt: Date,
    createdAt: Date,
    deviceInfo?: string,
    ipAddress?: string
  ) {
    return await prisma.accessToken.upsert({
      where: { token: accessToken },
      update: {
        expiresAt,
        createdAt,
        deviceInfo,
        ipAddress,
      },
      create: {
        token: accessToken,
        userId,
        expiresAt,
        createdAt,
        deviceInfo,
        ipAddress,
      },
    });
  }

  static async saveRefreshToken(
    refreshToken: string,
    userId: string,
    expiresAt: Date,
    createdAt: Date,
    deviceInfo?: string,
    ipAddress?: string
  ) {
    return await prisma.refreshToken.upsert({
      where: { token: refreshToken }, // token unique ise
      update: {
        expiresAt,
        createdAt,
        deviceInfo,
        ipAddress,
      },
      create: {
        token: refreshToken,
        userId,
        expiresAt,
        createdAt,
        deviceInfo,
        ipAddress,
      },
    });
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
