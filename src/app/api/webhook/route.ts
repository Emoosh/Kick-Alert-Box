import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  kickPublicKey,
  parsePublicKey,
} from "@/lib/webhook/verify-webhook";
import {
  handleChannelFollow,
  handleNewSubscription,
  handleSubscriptionRenewal,
} from "@/lib/webhook/webhook-handlers/webhookHandlers";

import { checkBroadcasterSubscription } from "@/lib/webhook/webhook-handlers/webhookHandlers";
import { TokenManager } from "@/lib/auth/tokenManager";
export async function POST(request: NextRequest) {
  try {
    const requestClone = request.clone();
    const eventMessageId = request.headers.get("Kick-Event-Message-Id");
    const eventSubscriptionId = request.headers.get(
      "Kick-Event-Subscription-Id"
    );
    const eventSignature = request.headers.get("Kick-Event-Signature");
    const eventMessageTimestamp = request.headers.get(
      "Kick-Event-Message-Timestamp"
    );
    const eventType = request.headers.get("Kick-Event-Type");
    const eventVersion = request.headers.get("Kick-Event-Version");

    if (
      !eventMessageId ||
      !eventSubscriptionId ||
      !eventSignature ||
      !eventMessageTimestamp ||
      !eventType ||
      !eventVersion
    ) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    const body = await requestClone.text();

    const publicKey = parsePublicKey(kickPublicKey);

    const isValid = verifyWebhookSignature(
      publicKey,
      body,
      eventMessageId,
      eventMessageTimestamp,
      eventSignature
    );

    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const jsonBody = JSON.parse(body);
    console.log("Received valid webhook:", jsonBody);

    // To check the event broadcaster's subscription status

    // 1- Check if the broadcaster still has an active subscription.

    const broadcasterUserId = jsonBody.broadcaster?.user_id;
    if (!broadcasterUserId) {
      console.error("No broadcaster user ID found in webhook payload");
      return NextResponse.json(
        { error: "No broadcaster user ID found" },
        { status: 400 }
      );
    }

    const isValidBroadcaster = await checkBroadcasterSubscription(
      broadcasterUserId
    );

    // 2- If not, ignore the event that came and delete all subscriptions for the broadcaster.

    if (!isValidBroadcaster) {
      return NextResponse.json(
        { error: "Broadcaster does not have an active subscription" },
        { status: 400 }
      );
    }

    console.log("event type: ", eventType);

    switch (eventType) {
      case "chat.message.sent":
        console.log("Chat message event received");
        //
        break;
      case "channel.followed":
        console.log("Channel followed event received");
        await handleChannelFollow(jsonBody);
        break;
      case "channel.subscription.renewal":
        //
        console.log("Channel subscription renewal event received");
        await handleSubscriptionRenewal(jsonBody);
        break;
      case "channel.subscription.gifts":
        //
        break;
      case "channel.subscription.new":
        console.log("New subscription event received");
        await handleNewSubscription(jsonBody);
        break;
      case "livestream.status.updated":
        // It has two types.
        break;
      case "livestream.metadata.updated":
        //
        break;
      case "moderation.banned":
        //
        break;
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
