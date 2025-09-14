import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/kick-api";
import { baseUrlForEvents } from "@/lib/webhook-handlers/get-subscriptions";

type event = {
  name: string;
  version: 1;
};

type subscriptions = {
  broadcaster_user_id: string;
  events: event[];
  method: "webhook";
};

export async function startAlertSystem(accessToken: string, events: event[]) {
  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token found" },
      { status: 401 }
    );
  }
  const user = await getCurrentUser(accessToken);
  const broadcaster_user_id = user.data[0].user_id;

  const body: subscriptions = {
    broadcaster_user_id,
    events,
    method: "webhook",
  };

  const response = await fetch(baseUrlForEvents, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  return response.json();
}
