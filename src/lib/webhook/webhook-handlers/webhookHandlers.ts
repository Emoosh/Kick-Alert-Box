import { broadcastAlert } from "../../../../ws-server";

import { getRedisClient } from "../../redis/redis";
import { v4 as uuidv4 } from "uuid";

import { hashSlug } from "../../hash/hash";

// webhook-handlers.ts'te alert creation'ı debug et
export async function handleChannelFollow(input_data: any) {
  const followerId = input_data.follower.user_id;
  const followerName = input_data.follower.username;
  const broadcasterId = input_data.broadcaster.user_id;
  const hashedBroadcasterId = hashSlug(broadcasterId);

  console.log(
    `🎯 [WEBHOOK] Processing follow: ${followerName} → ${hashedBroadcasterId.substring(
      0,
      8
    )}...`
  );

  const redis = getRedisClient();
  const alertId = `alert_${uuidv4()}`;

  const queueItem = {
    id: alertId,
    type: "follow",
    username: followerName,
    userId: followerId,
    broadcasterId: hashedBroadcasterId,
    timestamp: Date.now(),
  };

  try {
    // Alert data kaydet
    await redis.set(`alert:${alertId}`, JSON.stringify(queueItem));
    console.log(`✅ [WEBHOOK] Alert data saved: ${alertId}`);

    // Queue'ya ekle
    await redis.lpush(`alert_queue:${hashedBroadcasterId}`, alertId);
    console.log(
      `✅ [WEBHOOK] Alert queued for: ${hashedBroadcasterId.substring(0, 8)}...`
    );

    // Doğrulama
    const queueLength = await redis.llen(`alert_queue:${hashedBroadcasterId}`);
    const alertExists = await redis.exists(`alert:${alertId}`);

    console.log(
      `📊 [WEBHOOK] Verification: queue=${queueLength}, alert_exists=${alertExists}`
    );
  } catch (error) {
    console.error(`🚨 [WEBHOOK] Redis error:`, error);
  }

  console.log(`🏁 [WEBHOOK] Follow handler completed`);
}

export async function handleNewSubscription(input_data: any) {
  const subscriberName = input_data.subscriber.username;
  const broadcasterId = input_data.broadcaster.user_id;
  const hashedBroadcasterId = hashSlug(broadcasterId);

  const redis = getRedisClient();
  const alertId = `alert_${uuidv4()}`;
  const queueItem = {
    id: alertId,
    type: "subscribe",
    data: input_data,
    subscriberName: subscriberName,
    timestamp: Date.now(),
    processed: false,
    broadcasterId: hashedBroadcasterId,
  };
  await redis.lpush(`alert_queue:${hashedBroadcasterId}`, alertId);
  await redis.set(`alert:${alertId}`, JSON.stringify(queueItem));
  await redis.lpush("alert_queue", alertId);
}

//NOT COMPLETED
export async function handleSubscriptionRenewal(input_data: any) {
  const subscriberName = input_data.subscriber.username;
  const duration = input_data.duration;

  const redis = getRedisClient();
  const alertId = `alert_${uuidv4()}`;
  const queueItem = {
    id: alertId,
    type: "subscriptionRenewal",
    data: input_data,
    timestamp: Date.now(),
    processed: false,
  };
  await redis.set(`alert:${alertId}`, JSON.stringify(queueItem));
  await redis.lpush("alert_queue", alertId);
}
