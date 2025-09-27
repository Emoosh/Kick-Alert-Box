// app/api/videos/upload/route.ts - Senin session mantığınla
import { NextRequest, NextResponse } from "next/server";
import { uploadAlertVideo } from "@/lib/services/video-service";
import { TokenManager } from "@/lib/auth/tokenManager";
import { getCurrentUser, tokenIntrospect } from "@/lib/kick-api";

export async function POST(request: NextRequest) {
  try {
    // ✅ Session token al - senin api/user'daki gibi
    const session_token = request.cookies.get("session_token")?.value;

    if (!session_token) {
      return NextResponse.json(
        { error: "No session_token found" },
        { status: 401 }
      );
    }

    // ✅ Session data al
    const sessionData = await TokenManager.getSessionData(session_token);
    const accessToken = sessionData?.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 401 }
      );
    }

    // ✅ Token verify et
    const tokenIntrospectResponse = await tokenIntrospect(accessToken);

    if (!tokenIntrospectResponse || !tokenIntrospectResponse.data.active) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // ✅ User bilgilerini al
    const user = await getCurrentUser(accessToken);

    if (!user?.data?.[0]?.user_id) {
      return NextResponse.json(
        { error: "User data not found" },
        { status: 401 }
      );
    }

    // ✅ User ID'yi al (Kick API'den gelen format)
    const kickUserId = user.data[0].user_id.toString();

    // Database'den user'ı bul veya userId'yi kullan
    // Eğer database'de userId field'ın kickUserId ise:
    const userId = kickUserId; // veya database'den query yap

    console.log(`📤 Video upload started: User ${kickUserId}`);

    const formData = await request.formData();
    const file = formData.get("video") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Video file is required" },
        { status: 400 }
      );
    }

    // File validation
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "File must be a video" },
        { status: 400 }
      );
    }

    if (file.size > 100 * 1024 * 1024) {
      // 100MB
      return NextResponse.json(
        { error: "Video size must be less than 100MB" },
        { status: 400 }
      );
    }

    console.log(
      `📤 Video upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(
        2
      )}MB)`
    );

    // ✅ Video upload et
    const result = await uploadAlertVideo(userId, "follow", file);

    console.log(`✅ Video upload completed: ${result.id}`);

    return NextResponse.json({
      success: true,
      video: result,
      message: "Video uploaded successfully!",
    });
  } catch (error: any) {
    console.error("❌ Upload API error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
