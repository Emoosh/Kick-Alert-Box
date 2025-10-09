// src/lib/services/subscription-service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class SubscriptionService {
  // ✅ Subscription kaydet
  static async recordSubscription(data: {
    userId: string;
    kickSubscriptionId: string;
    eventType: string;
    broadcasterUserId: string;
    broadcasterUsername?: string;
    webhookUrl?: string;
  }) {
    return await prisma.eventSubscription.create({
      data: {
        userId: data.userId,
        kickSubscriptionId: data.kickSubscriptionId,
        eventType: data.eventType,
        broadcasterUserId: data.broadcasterUserId,
        broadcasterUsername: data.broadcasterUsername,
        webhookUrl: data.webhookUrl,
      },
    });
  }

  // ✅ Kullanıcının tüm subscription'larını getir
  static async getUserSubscriptions(userId: string) {
    return await prisma.eventSubscription.findMany({
      where: {
        userId,
        status: "active",
      },
      select: {
        id: true,
        kickSubscriptionId: true,
        eventType: true,
        broadcasterUserId: true,
        broadcasterUsername: true,
        createdAt: true,
      },
    });
  }

  // ✅ Hızlı cleanup - DB'den ID'leri al
  static async cleanupUserSubscriptions(userId: string, accessToken: string) {
    try {
      // DB'den user'ın subscription ID'lerini al
      const subscriptions = await prisma.eventSubscription.findMany({
        where: { userId, status: "active" },
        select: { kickSubscriptionId: true, eventType: true },
      });

      console.log(
        `🧹 Found ${subscriptions.length} subscriptions to cleanup for user ${userId}`
      );

      // Her subscription'ı Kick API'den sil
      for (const sub of subscriptions) {
        try {
          await this.deleteKickSubscription(
            accessToken,
            sub.kickSubscriptionId
          );

          // DB'den de sil (veya inactive yap)
          await prisma.eventSubscription.updateMany({
            where: { kickSubscriptionId: sub.kickSubscriptionId },
            data: { status: "inactive", updatedAt: new Date() },
          });

          console.log(
            `✅ Deleted subscription: ${sub.kickSubscriptionId} (${sub.eventType})`
          );
        } catch (error) {
          console.error(
            `❌ Failed to delete ${sub.kickSubscriptionId}:`,
            error
          );
        }
      }

      return true;
    } catch (error) {
      console.error("Error in cleanup:", error);
      return false;
    }
  }

  // ✅ Tek subscription sil
  private static async deleteKickSubscription(
    accessToken: string,
    subscriptionId: string
  ) {
    const response = await fetch(
      `https://api.kick.com/public/v1/eventsub/subscriptions/${subscriptionId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete subscription: HTTP ${response.status}`);
    }
  }
}
