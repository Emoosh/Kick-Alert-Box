import { NextRequest, NextResponse } from "next/server";
import { baseUrlForEvents } from "@/lib/webhook/webhook-starters/get-subscriptions";

export async function deleteSubscription(access_token: string, id: string[]) {
  if (!access_token) {
    return NextResponse.json(
      { error: "No access token found" },
      { status: 401 }
    );
  }

  const query = id.map((i) => `id=${encodeURIComponent(i)}`).join("&");
  const url = `${baseUrlForEvents}?${query}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to delete subscriptions" },
      { status: response.status }
    );
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = null;
  }
  return NextResponse.json(data);
}
