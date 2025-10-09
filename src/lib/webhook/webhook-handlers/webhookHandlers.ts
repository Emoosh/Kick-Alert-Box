import { broadcastAlert } from "../../../../ws-server";

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
  // if (!subStatus) {
  //   console.log(
  //     `🚫 [WEBHOOK] Skipping follow alert, inactive subscription for broadcaster: ${input_data.broadcaster.user_id}`
  //   );
  //   return;
  // }
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
