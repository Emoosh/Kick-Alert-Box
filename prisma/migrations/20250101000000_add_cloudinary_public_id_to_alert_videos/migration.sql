-- CreateEnum
-- Migration: 20250101000000_add_cloudinary_public_id_to_alert_videos

-- Add cloudinaryPublicId column to alert_videos table
ALTER TABLE "alert_videos" ADD COLUMN "cloudinaryPublicId" TEXT;