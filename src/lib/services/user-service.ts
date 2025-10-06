import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateUserData {
  kickUserId: string;
  username: string;
  email: string;
  profilePicture?: string;
  deviceInfo?: string;
  ipAddress?: string;
  subscriptionEndsAt?: Date;
}

export class UserService {
  static async createOrUpdateUser(userData: CreateUserData) {
    try {
      // Default subscription end date is set to 2 days.
      const subscriptionEndDate =
        userData.subscriptionEndsAt ||
        new Date(Date.now() + 2 * 24 * 3600 * 1000);

      const user = await prisma.user.upsert({
        where: { kickUserId: userData.kickUserId },
        update: {
          username: userData.username,
          email: userData.email,
          profilePicture: userData.profilePicture,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
          subscriptionEndsAt: subscriptionEndDate,
        },
        create: {
          kickUserId: userData.kickUserId,
          username: userData.username,
          email: userData.email,
          profilePicture: userData.profilePicture,
          lastLoginAt: new Date(),
          subscriptionEndsAt: subscriptionEndDate,
        },
      });

      // if (userData.accessToken) {
      //   await this.saveAccessToken(
      //     userData.accessToken,
      //     user.id,
      //     new Date(Date.now() + 3600 * 1000),
      //     new Date(),
      //     userData.deviceInfo,
      //     userData.ipAddress
      //   );
      // }

      // if (userData.refreshToken) {
      //   await this.saveRefreshToken(
      //     userData.refreshToken,
      //     user.id,
      //     new Date(Date.now() + 30 * 24 * 3600 * 1000),
      //     new Date(),
      //     userData.deviceInfo,
      //     userData.ipAddress
      //   );
      // }

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
