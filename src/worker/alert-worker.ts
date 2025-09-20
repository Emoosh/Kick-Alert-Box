import { getRedisClient } from "../lib/redis/redis.ts";
import { broadcastAlert } from "../../ws-server.ts";

const activeWorkers = new Map<string, boolean>();

async function startBroadcasterWorker(broadcasterId: string) {
  if (activeWorkers.get(broadcasterId)) return;
  activeWorkers.set(broadcasterId, true);

  const redis = getRedisClient();
  console.log(`Worker started for broadcaster ${broadcasterId}`);

  while (true) {
    const result = await redis.brpop(`alert_queue:${broadcasterId}`, 0);
    if (!result) continue;
    const alertId = result[1];

    const alertJson = await redis.get(`alert:${alertId}`);
    if (!alertJson) continue;
    const alert = JSON.parse(alertJson);

    console.log(`Processing alert for broadcaster ${broadcasterId}:`, alert);
    broadcastAlert(alert);
    await redis.del(`alert:${alertId}`);
  }
}

async function monitorQueues() {
  const redis = getRedisClient();

  while (true) {
    const keys = await redis.keys("alert_queue:*");
    for (const key of keys) {
      const broadcasterId = key.split(":")[1];
      if (!activeWorkers.get(broadcasterId)) {
        startBroadcasterWorker(broadcasterId);
      }
    }
    await new Promise((res) => setTimeout(res, 5000));
  }
}

monitorQueues();
