import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  kickPublicKey,
  parsePublicKey,
} from "@/lib/verify-webhook";

export async function POST(request: NextRequest) {
  try {
    const requestClone = request.clone();

    // Header'lardan gerekli değerleri alın
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

    // Gerekli başlık değerlerinin varlığını kontrol edin

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

    //const kickPublicKey = await fetchKickWebhookPublicKey();

    // Taking it as a string is important because if it proceeds Json and then stringify it will change the body and the signature will not match.
    const body = await requestClone.text();

    // const signature = `${eventMessageId}.${eventMessageTimestamp}.${body}`;
    // const signatureBuffer = Buffer.from(signature, "utf8");

    // Kick public key'ini parse edin
    const publicKey = parsePublicKey(kickPublicKey);

    // İmzayı doğrulayın
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

    // İmza doğrulama başarılı, webhook'u işleyin
    // Body'yi parse edin (string -> JSON)
    const jsonBody = JSON.parse(body);
    console.log("Received valid webhook:", jsonBody);

    // TODO: Webhook event'ini handle edin (örneğin, yayın başladı, bitti, vb.)
    // jsonBody.type veya jsonBody.event gibi alanları kontrol edebilirsiniz

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
