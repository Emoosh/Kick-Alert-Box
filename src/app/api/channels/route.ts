import { NextRequest, NextResponse } from "next/server";
import { getCurrentChannelInfo, updateChannelInfo } from "@/lib/kick-api";
import { get } from "http";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 401 }
      );
    }

    const channelInfo = await getCurrentChannelInfo(accessToken);

    return NextResponse.json(channelInfo);
  } catch (error) {
    console.error("Error fetching channel info:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel info" },
      { status: 500 }
    );
  }
}

// TODO: Custom Tags doesnt work proporly but the others approved.

export async function PATCH(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 401 }
      );
    }

    const { category_id, custom_tags, stream_title } = await request.json();

    const updatedChannel = await updateChannelInfo(
      accessToken,
      category_id,
      custom_tags,
      stream_title
    );
    return NextResponse.json(updatedChannel);
  } catch (error) {
    console.error("Error updating channel info:", error);
    return NextResponse.json(
      { error: "Failed to update channel info" },
      { status: 500 }
    );
  }
}
