// src/app/api/videos/manage/route.ts - Yeni dosya oluştur
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { TokenManager } from "@/lib/auth/tokenManager";
import { getCurrentUser } from "@/lib/kick-api";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

// ✅ Kullanıcının videolarını listele
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No session token" }, { status: 401 });
    }

    const user = await TokenManager.getSessionData(sessionToken);
    if (!user?.accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }
    const userResponse = await getCurrentUser(user.accessToken);

    const kickUserId = userResponse?.data?.[0].user_id.toString();
    if (!kickUserId) {
      return NextResponse.json(
        { error: "User data not found" },
        { status: 401 }
      );
    }

    // Database'de user'ı bul
    const dbUser = await prisma.user.findFirst({
      where: { kickUserId: kickUserId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // User'ın videolarını getir
    const videos = await prisma.alertVideo.findMany({
      where: {
        userId: dbUser.id,
        isActive: true,
      },
      orderBy: [
        { alertType: "asc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    console.log(`📊 Found ${videos.length} videos for user ${dbUser.id}`);

    return NextResponse.json({
      success: true,
      videos: videos.map((video) => ({
        id: video.id,
        alertType: video.alertType,
        videoName: video.videoName,
        videoUrl: video.videoUrl,
        fileSize: video.fileSize,
        duration: video.duration,
        mimeType: video.mimeType,
        createdAt: video.createdAt,
        sortOrder: video.sortOrder,
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching videos:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch videos",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ✅ Video sil
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No session token" }, { status: 401 });
    }

    const user = await TokenManager.getSessionData(sessionToken);
    if (!user?.accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }
    const userResponse = await getCurrentUser(user.accessToken);

    const kickUserId = userResponse?.data?.[0].user_id.toString();
    if (!kickUserId) {
      return NextResponse.json(
        { error: "User data not found" },
        { status: 401 }
      );
    }

    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: "Video ID required" }, { status: 400 });
    }
    // Database'de user'ı bul
    const dbUser = await prisma.user.findFirst({
      where: { kickUserId: kickUserId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Video'yu bul (sadece kendi videosu olduğundan emin ol)
    const video = await prisma.alertVideo.findFirst({
      where: {
        id: videoId,
        userId: dbUser.id,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    console.log(`🗑️ Deleting video: ${video.videoName}`);

    // 1. Dosyayı sil
    try {
      const filePath = path.join(process.cwd(), "public", video.videoUrl);
      await fs.unlink(filePath);
      console.log(`✅ File deleted: ${filePath}`);
    } catch (fileError) {
      console.error(`⚠️ Could not delete file: ${video.videoUrl}`, fileError);
      // Dosya silme hatası olsa bile database'den sil
    }

    // 2. Database'den sil
    await prisma.alertVideo.delete({
      where: { id: videoId },
    });

    console.log(`✅ Video deleted from database: ${videoId}`);

    return NextResponse.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting video:", error);
    return NextResponse.json(
      {
        error: "Failed to delete video",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
