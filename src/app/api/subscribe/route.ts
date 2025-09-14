import { NextRequest, NextResponse } from "next/server";
import { startAlertSystem } from "@/lib/webhook/webhook-starters/subscribe-events";
import { getSubscription } from "@/lib/webhook/webhook-starters/get-subscriptions";
import { deleteSubscription } from "@/lib/webhook/webhook-starters/delete-subscription";

export async function POST(request: NextRequest) {
  const { events } = await request.json();
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token found" },
      { status: 401 }
    );
  }
  const result = await startAlertSystem(accessToken, events);

  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token found" },
      { status: 401 }
    );
  }

  const response = await getSubscription(accessToken);

  return response;
}

/**
 * @param request
 * @events: Array of event objects containing IDs to be deleted
 * @returns response from deleteSubscription function
 */
export async function DELETE(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const { events } = await request.json();

  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token found" },
      { status: 401 }
    );
  }
  const ids = events.map((event: { id: string }) => event.id);
  console.log("Event IDs:", ids);
  const response = await deleteSubscription(accessToken, ids);

  console.log("Deleted subscriptions:", response);
  return response;
}
