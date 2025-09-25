// src/app/api/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from "@/lib/auth/getAccessTokenFromRequest";
import { startAlertSystem } from "@/lib/webhook/webhook-starters/subscribe-events";
import { getSubscription } from "@/lib/webhook/webhook-starters/get-subscriptions";
import { deleteSubscription } from "@/lib/webhook/webhook-starters/delete-subscription";

// GET - Subscriptionları getir
export async function GET(request: NextRequest) {
  try {
    // Önce yeni auth sistemini dene
    let accessToken = await getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 401 }
      );
    }

    const response = await getSubscription(accessToken);
    return response;
  } catch (error) {
    console.error("Error in GET /api/subscribe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let events;
    if (body.event) {
      events = [body.event];
    } else if (body.events) {
      events = body.events;
    } else {
      return NextResponse.json(
        { error: "No events provided" },
        { status: 400 }
      );
    }

    // Access token al
    let accessToken = await getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 401 }
      );
    }

    console.log("Creating subscriptions for events:", events);
    const result = await startAlertSystem(accessToken, events);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/subscribe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("id");

    let events;

    if (subscriptionId) {
      // Yeni frontend formatı: ?id=subscription_id
      events = [{ id: subscriptionId }];
    } else {
      // Eski format: body'de events array'i
      const body = await request.json();
      events = body.events;

      if (!events || !Array.isArray(events)) {
        return NextResponse.json(
          { error: "No events provided" },
          { status: 400 }
        );
      }
    }

    // Access token al
    let accessToken = await getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 401 }
      );
    }

    const ids = events.map((event: { id: string }) => event.id);
    console.log("Deleting subscription IDs:", ids);

    const response = await deleteSubscription(accessToken, ids);

    console.log("Deleted subscriptions:", response);
    return response;
  } catch (error) {
    console.error("Error in DELETE /api/subscribe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
