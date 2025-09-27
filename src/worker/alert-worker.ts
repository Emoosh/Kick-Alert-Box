// src/worker/alert-worker.ts
import { createRedisConnection, getRedisClient } from "../lib/redis/redis.ts"; // createRedisConnection import et
import { broadcastAlert } from "../../ws-server.ts";

const activeWorkers = new Map<string, boolean>();

// Worker'da timeout'u artır ve canlı tut
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
  const MAX_IDLE_CYCLES = 5; // 20 * 5 saniye = 100 saniye idle'dan sonra dursun

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

          // Çok uzun süre idle kalırsa worker'ı durdur
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

        // Alert aldı, idle counter'ı reset et
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

          // Debug: Redis'te hangi alert'ler var?
          const availableAlerts = await redis.keys(`alert:*`);
          console.log(
            `🔍 Available alerts in Redis: ${availableAlerts.length}`
          );
          continue;
        }

        const alert = JSON.parse(alertJson);
        console.log(
          `🎯 [${broadcasterId.substring(0, 8)}...] Processing alert:`,
          alert
        );

        broadcastAlert(alert);
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
  }
}
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
