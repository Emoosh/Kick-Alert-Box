import { NextRequest, NextResponse } from "next/server";

export const baseUrlForEvents =
  "https://api.kick.com/public/v1/events/subscriptions";

export async function getSubscription(access_token: string) {
  if (!access_token) {
    return NextResponse.json(
      { error: "No access token found" },
      { status: 401 }
    );
  }

  const response = await fetch(baseUrlForEvents, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
