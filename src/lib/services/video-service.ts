// lib/video/video-service.ts
import { PrismaClient } from "@prisma/client";
import { writeFile, mkdir, unlink, stat } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

export interface AlertVideoResponse {
  id: string;
  videoUrl: string;
  videoName: string | null;
  fileSize: number | null;
  duration: number | null;
  mimeType: string | null;
  sortOrder: number;
}

export async function uploadAlertVideo(
  kickUserId: string,
  alertType: "follow" | "subscribe" | "tip",
  file: File
): Promise<AlertVideoResponse> {
  try {
    console.log(
      `📤 Starting upload for user: ${kickUserId}, type: ${alertType}`
    );

    let dbUser = await prisma.user.findFirst({
      where: {
        kickUserId: kickUserId, // Düz Kick user ID ile ara
      },
    });

    if (!dbUser) {
      console.log(`❌ User not found in database with Kick ID: ${kickUserId}`);
      // Debug: Database'deki user'ları listele
      const allUsers = await prisma.user.findMany({
        select: { id: true, kickUserId: true },
      });
      console.log("📊 Users in database:", allUsers);

      throw new Error(`User not found in database. Kick ID: ${kickUserId}`);
    }

    console.log(
      `✅ Found database user: ${dbUser.id} for Kick ID: ${kickUserId}`
    );

    const userId = dbUser.id;
    // 1. Validations
    const existingCount = await prisma.alertVideo.count({
      where: { userId, alertType, isActive: true },
    });

    if (existingCount >= 5) {
      throw new Error(
        `Maximum 5 videos allowed per alert type. Current: ${existingCount}`
      );
    }

    if (!file.type.startsWith("video/")) {
      throw new Error("File must be a video format");
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new Error(
        `Video size must be less than ${maxSize / 1024 / 1024}MB. Current: ${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB`
      );
    }

    // 2. Prepare file paths
    const videoId = uuidv4();
    const fileExtension = file.name.split(".").pop() || "mp4";
    const fileName = `${videoId}_${alertType}.${fileExtension}`;
    const userDir = join(
      process.cwd(),
      "public",
      "uploads",
      "videos",
      userId,
      alertType
    );
    const filePath = join(userDir, fileName);
    const publicUrl = `/uploads/videos/${userId}/${alertType}/${fileName}`;

    console.log(`📁 Preparing upload: ${publicUrl}`);

    // 3. Create directory and save file
    await mkdir(userDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`✅ File saved: ${filePath}`);

    // 4. Verify file exists and get actual size
    const fileStats = await stat(filePath);
    const actualSize = fileStats.size;

    // 5. Save to database
    const alertVideo = await prisma.alertVideo.create({
      data: {
        userId,
        alertType,
        videoUrl: publicUrl,
        videoName: file.name,
        fileSize: actualSize,
        mimeType: file.type,
        sortOrder: existingCount,
      },
    });

    console.log(`📊 Video saved to database: ${alertVideo.id}`);

    return {
      id: alertVideo.id,
      videoUrl: alertVideo.videoUrl,
      videoName: alertVideo.videoName,
      fileSize: alertVideo.fileSize,
      duration: alertVideo.duration,
      mimeType: alertVideo.mimeType,
      sortOrder: alertVideo.sortOrder,
    };
  } catch (error) {
    console.error("❌ Video upload error:", error);
    throw error;
  }
}

export async function getUserAlertVideos(
  userId: string,
  alertType?: string
): Promise<AlertVideoResponse[]> {
  try {
    const videos = await prisma.alertVideo.findMany({
      where: {
        userId,
        alertType: alertType || undefined,
        isActive: true,
      },
      orderBy: [{ alertType: "asc" }, { sortOrder: "asc" }],
    });

    return videos.map((video) => ({
      id: video.id,
      videoUrl: video.videoUrl,
      videoName: video.videoName,
      fileSize: video.fileSize,
      duration: video.duration,
      mimeType: video.mimeType,
      sortOrder: video.sortOrder,
    }));
  } catch (error) {
    console.error("❌ Error fetching user videos:", error);
    return [];
  }
}

export async function getRandomAlertVideo(
  userId: string,
  alertType: string
): Promise<AlertVideoResponse | null> {
  try {
    const videos = await prisma.alertVideo.findMany({
      where: {
        userId,
        alertType,
        isActive: true,
      },
    });

    if (videos.length === 0) {
      console.log(`📭 No videos found for user ${userId}, type: ${alertType}`);
      return null;
    }

    const randomIndex = Math.floor(Math.random() * videos.length);
    const selectedVideo = videos[randomIndex];

    console.log(
      `🎲 Selected random video: ${selectedVideo.videoName} (${
        randomIndex + 1
      }/${videos.length})`
    );

    return {
      id: selectedVideo.id,
      videoUrl: selectedVideo.videoUrl,
      videoName: selectedVideo.videoName,
      fileSize: selectedVideo.fileSize,
      duration: selectedVideo.duration,
      mimeType: selectedVideo.mimeType,
      sortOrder: selectedVideo.sortOrder,
    };
  } catch (error) {
    console.error("❌ Error selecting random video:", error);
    return null;
  }
}

export async function deleteAlertVideo(
  videoId: string,
  userId: string
): Promise<boolean> {
  try {
    // Get video info before deletion
    const video = await prisma.alertVideo.findFirst({
      where: { id: videoId, userId },
    });

    if (!video) {
      throw new Error("Video not found or access denied");
    }

    // Soft delete in database
    await prisma.alertVideo.update({
      where: { id: videoId },
      data: { isActive: false },
    });

    // Try to delete physical file (optional, for cleanup)
    try {
      const filePath = join(process.cwd(), "public", video.videoUrl);
      await unlink(filePath);
      console.log(`🗑️ Physical file deleted: ${filePath}`);
    } catch (fileError) {
      console.warn("⚠️ Could not delete physical file:", fileError);
      // Continue anyway, database record is marked as deleted
    }

    console.log(`✅ Video deleted: ${videoId}`);
    return true;
  } catch (error) {
    console.error("❌ Error deleting video:", error);
    return false;
  }
}
