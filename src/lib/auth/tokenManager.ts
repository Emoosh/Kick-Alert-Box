// import { NextRequest } from "next/server";
// import { SessionManager } from "../session";
// import { redis } from "../redis/redis";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// export async function authenticate(req: NextRequest) {
//   const sessionId = req.cookies.get("session_id")?.value;

//   if (!sessionId) return null;

//   try {
//     const session = await SessionManager.getSession(sessionId);
//     if (!session) return null;

//     // User settings cache'den al
//     const userSettings = await getUserSettings(session.userId);

//     return {
//       ...session,
//       settings: userSettings,
//     };
//   } catch (error) {
//     console.error("Auth error:", error);
//     return null;
//   }
// }

// // User settings cache
// async function getUserSettings(userId: string) {
//   const cacheKey = `user_settings:${userId}`;

//   // Önce cache'den bak
//   let settings = await redis.get(cacheKey);

//   if (!settings) {
//     // Cache miss - database'den al
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: { settings: true },
//     });

//     settings = JSON.stringify(user?.settings || {});

//     // Cache'le (5 dakika)
//     await redis.setex(cacheKey, 300, settings);
//   }

//   return JSON.parse(settings);
// }
