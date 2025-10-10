import { getRedisClient } from "../../redis/redis";
import { v4 as uuidv4 } from "uuid";

import { hashSlug } from "../../hash/hash";
import { TokenManager } from "@/lib/auth/tokenManager";

interface FollowAlert {
  broadcaster: {
    is_anonymous: boolean;
    user_id: number;
    username: string;
    is_verified: boolean;
    profile_picture: string;
    channel_slug: string;
    identity: string | null;
  };
  follower: {
    is_anonymous: boolean;
    user_id: number;
    username: string;
    is_verified: boolean;
    profile_picture: string;
    channel_slug: string;
    identity: string | null;
  };
}
interface SubscriptionAlert {
  broadcaster: {
    is_anonymous: boolean;
    user_id: number;
    username: string;
    is_verified: boolean;
    profile_picture: string;
    channel_slug: string;
    identity: string | null;
  };
  subscriber: {
    is_anonymous: boolean;
    user_id: number;
    username: string;
    is_verified: boolean;
    profile_picture: string;
    channel_slug: string;
    identity: string | null;
  };
  duration: number; // Subscription duration in months
  created_at: string; // ISO 8601 date string
  expires_at: string; // ISO 8601 date string
}

// QUEUE SYSTEM

interface BaseQueueItem {
  id: string;
  timestamp: number;
  processed?: boolean;
  broadcasterId: string;
}

export interface AlertQueueItem {
  id: string;
  type: "follow" | "subscribe" | "subscriptionRenewal";
  broadcasterId: string; // hashed broadcaster ID
  timestamp: number;
  processed?: boolean;

  // Follow alerts için
  username?: string;
  userId?: number;
  notHashedBroadcasterId?: number;

  // Subscription alerts için
  data?: SubscriptionAlert;
  subscriberName?: string;
  duration?: number;

  // Video processing için (worker tarafından eklenir)
  videoUrl?: string;
  videoDuration?: number;
}

export async function checkBroadcasterSubscription(
  kickUserId: number
): Promise<boolean> {
  console.log(`🔍 Checking subscription status for user: ${kickUserId}`);

  // ✅ TokenManager'dan subscription durumunu al (boolean)
  const hasActiveSubscription = await TokenManager.getSubscriptionStatus(
    kickUserId.toString()
  );

  console.log(
    `📊 User ${kickUserId} subscription active: ${hasActiveSubscription}`
  );

  // ✅ Subscription aktif - devam et
  if (hasActiveSubscription) {
    console.log(`✅ User ${kickUserId}: Active subscription, processing event`);
    return true;
  }

  // ✅ Subscription bitmiş - bütün abonelikleri iptal et
  console.log(
    `🧹 User ${kickUserId}: Subscription expired, canceling all subscriptions`
  );

  // Async olarak cleanup yap (webhook'u bloke etmemek için)
  setImmediate(async () => {
    try {
      await TokenManager.cancelAllEventSubscriptions(kickUserId.toString());
    } catch (error) {
      console.error(
        `❌ Failed to cancel subscriptions for user ${kickUserId}:`,
        error
      );
    }
  });

  return false;
}

// Handling the event types.
export async function handleChannelFollow(input_data: FollowAlert) {
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

  const queueItem: AlertQueueItem = {
    id: alertId,
    type: "follow",
    username: followerName,
    userId: followerId,
    broadcasterId: hashedBroadcasterId,
    notHashedBroadcasterId: broadcasterId,
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

export async function handleNewSubscription(input_data: SubscriptionAlert) {
  const broadcasterId = input_data.broadcaster.user_id;
  const subscriberName = input_data.subscriber.username;

  console.log(
    `🎯 [WEBHOOK] Processing subscription: ${subscriberName} → ${broadcasterId}`
  );

  // ✅ Subscription kontrolü ekle
  const subStatus = await checkBroadcasterSubscription(broadcasterId);

  // if (!subStatus) {
  //   console.log(
  //     `🚫 [WEBHOOK] Skipping subscription alert, inactive subscription for broadcaster: ${broadcasterId}`
  //   );
  //   return;
  // }

  const hashedBroadcasterId = hashSlug(broadcasterId);
  const redis = getRedisClient();
  const alertId = `alert_${uuidv4()}`;

  const queueItem: AlertQueueItem = {
    id: alertId,
    type: "subscribe",
    data: input_data,
    subscriberName: subscriberName,
    timestamp: Date.now(),
    processed: false,
    broadcasterId: hashedBroadcasterId,
  };

  try {
    await redis.set(`alert:${alertId}`, JSON.stringify(queueItem));
    await redis.lpush(`alert_queue:${hashedBroadcasterId}`, alertId); // ✅ Correct queue
    console.log(`✅ [WEBHOOK] Subscription alert queued: ${alertId}`);
  } catch (error) {
    console.error(`🚨 [WEBHOOK] Redis error:`, error);
  }
}

// ✅ handleSubscriptionRenewal - Tamamla
export async function handleSubscriptionRenewal(input_data: SubscriptionAlert) {
  const broadcasterId = input_data.broadcaster.user_id;
  const subscriberName = input_data.subscriber.username;
  const duration = input_data.duration;

  console.log(
    `🎯 [WEBHOOK] Processing renewal: ${subscriberName} → ${broadcasterId} (${duration} months)`
  );

  // ✅ Subscription kontrolü ekle
  const subStatus = await checkBroadcasterSubscription(broadcasterId);

  // if (!subStatus) {
  //   console.log(
  //     `🚫 [WEBHOOK] Skipping renewal alert, inactive subscription for broadcaster: ${broadcasterId}`
  //   );
  //   return;
  // }

  const hashedBroadcasterId = hashSlug(broadcasterId);
  const redis = getRedisClient();
  const alertId = `alert_${uuidv4()}`;

  const queueItem: AlertQueueItem = {
    id: alertId,
    type: "subscriptionRenewal",
    data: input_data,
    subscriberName: subscriberName,
    timestamp: Date.now(),
    processed: false,
    broadcasterId: hashedBroadcasterId, // ✅ Eksikti
  };

  try {
    await redis.set(`alert:${alertId}`, JSON.stringify(queueItem));
    await redis.lpush(`alert_queue:${hashedBroadcasterId}`, alertId); // ✅ Correct queue
    console.log(`✅ [WEBHOOK] Renewal alert queued: ${alertId}`);
  } catch (error) {
    console.error(`🚨 [WEBHOOK] Redis error:`, error);
  }
}
