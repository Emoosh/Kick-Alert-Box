import {
  sendFollowerAlert,
  sendNewSubscriberAlert,
  sendSubscriptionRenewalAlert,
} from "../../../../ws-server";

export async function handleChannelFollow(data: any) {
  const followerName = data.follower.username;

  // WebSocket'e veri gönder
  sendFollowerAlert({
    alertType: "follow",
    username: followerName,
    message: "New follow!",
  });

  console.log(`New follower: ${followerName}`);
}

export async function handleNewSubscription(data: any) {
  const subscriberName = data.subscriber.username;

  sendNewSubscriberAlert({
    alertType: "subscribe",
    username: subscriberName,
  });
}

export async function handleSubscriptionRenewal(data: any) {
  const subscriberName = data.subscriber.username;
  const duration = data.duration;

  sendSubscriptionRenewalAlert({
    alertType: "subscriptionRenewal",
    username: subscriberName,
    duration: duration,
  });
}
