// import { redis } from "./redis/redis";
// import { PrismaClient } from "@prisma/client";
// import crypto from "crypto";

// const prisma = new PrismaClient();

// // Encryption helpers
// function encrypt(text: string): string {
//   const cipher = crypto.createCipher(
//     "aes-256-gcm",
//     process.env.TOKEN_ENCRYPTION_KEY!
//   );
//   let encrypted = cipher.update(text, "utf8", "hex");
//   encrypted += cipher.final("hex");
//   return encrypted;
// }

// function decrypt(encryptedText: string): string {
//   const decipher = crypto.createDecipher(
//     "aes-256-gcm",
//     process.env.TOKEN_ENCRYPTION_KEY!
//   );
//   let decrypted = decipher.update(encryptedText, "hex", "utf8");
//   decrypted += decipher.final("utf8");
//   return decrypted;
// }

// export class SessionManager {
//   // Session oluştur (Login'de)
//   static async createSession(
//     kickUserData: any,
//     accessToken: string,
//     refreshToken?: string
//   ) {
//     const sessionId = crypto.randomUUID();

//     // 1. User'ı Supabase'e kaydet/güncelle
//     const user = await prisma.user.upsert({
//       where: { kickUserId: kickUserData.id.toString() },
//       update: {
//         username: kickUserData.username,
//         email: kickUserData.email,
//         updatedAt: new Date(),
//       },
//       create: {
//         kickUserId: kickUserData.id.toString(),
//         username: kickUserData.username,
//         email: kickUserData.email,
//         accessToken: "", // Redis'te tutacağız
//       },
//     });

//     // 2. Session data'yı Redis'e kaydet
//     const sessionData = {
//       userId: user.id,
//       kickUserId: user.kickUserId,
//       username: user.username,
//       accessToken: encrypt(accessToken),
//       refreshToken: refreshToken ? encrypt(refreshToken) : null,
//       createdAt: Date.now(),
//       lastAccess: Date.now(),
//     };

//     await redis.setex(
//       `session:${sessionId}`,
//       30 * 24 * 3600, // 30 gün
//       JSON.stringify(sessionData)
//     );

//     return { sessionId, userId: user.id };
//   }

//   // Session data al
//   static async getSession(sessionId: string) {
//     const sessionData = await redis.get(`session:${sessionId}`);
//     if (!sessionData) return null;

//     const parsed = JSON.parse(sessionData);

//     // Last access güncelle
//     await redis.expire(`session:${sessionId}`, 30 * 24 * 3600);

//     return {
//       userId: parsed.userId,
//       kickUserId: parsed.kickUserId,
//       username: parsed.username,
//       accessToken: decrypt(parsed.accessToken),
//       refreshToken: parsed.refreshToken ? decrypt(parsed.refreshToken) : null,
//       createdAt: parsed.createdAt,
//       lastAccess: parsed.lastAccess,
//     };
//   }

//   // Session sil (Logout)
//   static async destroySession(sessionId: string) {
//     await redis.del(`session:${sessionId}`);
//   }
// }
