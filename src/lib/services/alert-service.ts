// src/lib/services/alert-service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class AlertService {
  // User'ın tüm alert'lerini getir
  static async getUserAlerts(userId: string) {
    try {
      return await prisma.alert.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              username: true,
              kickUserId: true,
            },
          },
        },
      });
    } catch (error) {
      console.error("Error getting user alerts:", error);
      return null;
    }
  }

  // Yeni alert oluştur
  static async createAlert(alertData: {
    userId: string;
    type: string;
    username: string;
    message?: string;
    amount?: number;
    data?: any;
  }) {
    try {
      return await prisma.alert.create({
        data: alertData,
      });
    } catch (error) {
      console.error("Error creating alert:", error);
      return null;
    }
  }

  // Alert'i güncelle
  static async updateAlert(
    alertId: string,
    userId: string,
    updateData: {
      type?: string;
      message?: string;
      amount?: number;
      data?: any;
      isActive?: boolean;
    }
  ) {
    try {
      return await prisma.alert.updateMany({
        where: {
          id: alertId,
          userId: userId, // Sadece kendi alert'ini güncelleyebilsin
        },
        data: updateData,
      });
    } catch (error) {
      console.error("Error updating alert:", error);
      return null;
    }
  }

  // Alert'i sil
  static async deleteAlert(alertId: string, userId: string) {
    try {
      return await prisma.alert.deleteMany({
        where: {
          id: alertId,
          userId: userId, // Sadece kendi alert'lerini silebilsin
        },
      });
    } catch (error) {
      console.error("Error deleting alert:", error);
      return null;
    }
  }

  // Alert'i aktif/pasif yap
  static async toggleAlert(alertId: string, userId: string, isActive: boolean) {
    try {
      return await this.updateAlert(alertId, userId, { isActive });
    } catch (error) {
      console.error("Error toggling alert:", error);
      return null;
    }
  }

  // User'ın aktif alert sayısını getir
  static async getActiveAlertCount(userId: string) {
    try {
      return await prisma.alert.count({
        where: {
          userId,
        },
      });
    } catch (error) {
      console.error("Error getting active alert count:", error);
      return 0;
    }
  }
}
