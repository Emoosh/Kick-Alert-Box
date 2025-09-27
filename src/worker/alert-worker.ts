// src/worker/alert-worker.ts - broadcastAlert fonksiyonunu güncelle
import { createRedisConnection, getRedisClient } from "../lib/redis/redis.ts";
import { broadcastAlert } from "../../ws-server.ts";
import { getRandomAlertVideo } from "../lib/services/video-service.ts";
import { PrismaClient } from "@prisma/client"; // ✅ Prisma client ekle

const prisma = new PrismaClient(); // ✅ Prisma instance
const activeWorkers = new Map<string, boolean>();

// Alert'i işlerken video ekle
async function processAlertWithVideo(alert: any) {
  try {
    console.log(`🎬 Processing alert for broadcaster: ${alert.broadcasterId}`);

    // 1. Broadcaster ID'sinden database user'ını bul
    const dbUser = await prisma.user.findFirst({
      where: {
        kickUserId: alert.notHashedBroadcasterId.toString(), // ✅ broadcasterId aslında Kick user ID
      },
    });

    if (dbUser) {
      console.log(`👤 Found user in database: ${dbUser.id}`);

      // 2. Alert tipine göre video seç
      let alertType = "follow"; // Default
      if (alert.type === "channel.followed") alertType = "follow";
      else if (alert.type === "channel.subscribed") alertType = "subscribe";
      else if (alert.type === "channel.tipped") alertType = "tip";

      // 3. Random video seç
      const selectedVideo = await getRandomAlertVideo(dbUser.id, alertType);

      if (selectedVideo) {
        // Alert'e video bilgilerini ekle
        alert.videoUrl = selectedVideo.videoUrl;
        alert.videoDuration = selectedVideo.duration || 10000; // 10 saniye default

        console.log(
          `🎬 Selected video: ${selectedVideo.videoName} for ${alertType} alert`
        );
      } else {
        console.log(
          `📭 No videos found for user ${dbUser.id}, type: ${alertType}`
        );
      }
    } else {
      console.log(
        `❌ User not found in database for broadcaster ID: ${alert.broadcasterId}`
      );
    }

    // 4. Alert'i broadcast et (video varsa video ile, yoksa normal)
    broadcastAlert(alert);
  } catch (error) {
    console.error("❌ Error processing alert with video:", error);
    // Hata olursa bile alert'i gönder
    broadcastAlert(alert);
  }
}

async function startBroadcasterWorker(broadcasterId: string) {
  if (activeWorkers.get(broadcasterId)) {
    console.log(
      `⚠️ Worker already running for ${broadcasterId.substring(0, 8)}...`
    );
    return;
  }

  activeWorkers.set(broadcasterId, true);
  const redis = createRedisConnection();
  console.log(
    `🚀 Worker started for broadcaster ${broadcasterId.substring(0, 8)}...`
  );

  let idleCount = 0;
  const MAX_IDLE_CYCLES = 5;

  try {
    while (activeWorkers.get(broadcasterId)) {
      try {
        const result = await redis.brpop(`alert_queue:${broadcasterId}`, 5);

        if (!result) {
          idleCount++;
          console.log(
            `⏰ [${broadcasterId.substring(
              0,
              8
            )}...] Idle ${idleCount}/${MAX_IDLE_CYCLES}`
          );

          if (idleCount >= MAX_IDLE_CYCLES) {
            console.log(
              `💤 [${broadcasterId.substring(
                0,
                8
              )}...] Worker going idle after ${MAX_IDLE_CYCLES * 5} seconds`
            );
            break;
          }
          continue;
        }

        idleCount = 0;

        const alertId = result[1];
        console.log(
          `📨 [${broadcasterId.substring(
            0,
            8
          )}...] Processing alert: ${alertId}`
        );

        const alertJson = await redis.get(`alert:${alertId}`);

        if (!alertJson) {
          console.error(
            `❌ [${broadcasterId.substring(
              0,
              8
            )}...] Alert data not found: ${alertId}`
          );
          continue;
        }

        const alert = JSON.parse(alertJson);
        console.log(
          `🎯 [${broadcasterId.substring(0, 8)}...] Processing alert:`,
          alert
        );

        // ✅ YENİ: Video ile alert işle
        await processAlertWithVideo(alert);

        await redis.del(`alert:${alertId}`);

        console.log(
          `✅ [${broadcasterId.substring(
            0,
            8
          )}...] Alert processed successfully`
        );
      } catch (innerError) {
        console.error(
          `🚨 [${broadcasterId.substring(0, 8)}...] Inner error:`,
          innerError
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error(
      `💥 [${broadcasterId.substring(0, 8)}...] Worker crashed:`,
      error
    );
  } finally {
    activeWorkers.delete(broadcasterId);
    await redis.quit();
    console.log(
      `🛑 [${broadcasterId.substring(0, 8)}...] Worker stopped and removed`
    );

    // ✅ Prisma connection'ı temizle
    await prisma.$disconnect();
  }
}

// ... monitorQueues fonksiyonu aynı kalır ...
// Main thread construction
// src/worker/alert-worker.ts - Worker'ı durdurmayalım
async function monitorQueues() {
  const redis = getRedisClient();
  console.log("🔍 Queue monitor started");

  while (true) {
    try {
      // Hem mevcut queue'ları hem de aktif worker'ları kontrol et
      const keys = await redis.keys("alert_queue:*");
      console.log(
        `📊 Found ${keys.length} queues, ${activeWorkers.size} active workers`
      );

      // Mevcut queue'lar için worker kontrolü
      for (const key of keys) {
        const broadcasterId = key.split(":")[1];

        if (!activeWorkers.get(broadcasterId)) {
          console.log(
            `🆕 Starting worker for ${broadcasterId.substring(0, 8)}...`
          );
          startBroadcasterWorker(broadcasterId).catch((error) => {
            console.error(`🚨 Failed to start worker:`, error);
            activeWorkers.set(broadcasterId, false);
          });
        }
      }

      // ✅ YENİ: Aktif worker'ları da kontrol et - queue yoksa bile çalışmaya devam etsin
      for (const [broadcasterId, isActive] of activeWorkers.entries()) {
        if (isActive) {
          // Worker aktifse ama queue yoksa, queue length kontrol et
          const queueLength = await redis.llen(`alert_queue:${broadcasterId}`);
          console.log(
            `🔍 Worker ${broadcasterId.substring(
              0,
              8
            )}...: queue length = ${queueLength}`
          );

          // Worker canlı tutulacak, queue boş olsa bile
        }
      }

      await new Promise((res) => setTimeout(res, 3000));
    } catch (error) {
      console.error("🚨 Monitor error:", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

monitorQueues();
