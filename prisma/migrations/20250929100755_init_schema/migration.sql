/*
  Warnings:

  - You are about to drop the column `sessionToken` on the `refresh_tokens` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."access_tokens" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."refresh_tokens" DROP COLUMN "sessionToken",
ADD COLUMN     "deviceInfo" TEXT,
ADD COLUMN     "ipAddress" TEXT;
