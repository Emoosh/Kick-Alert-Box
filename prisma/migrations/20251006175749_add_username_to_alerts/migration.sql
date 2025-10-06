/*
  Warnings:

  - You are about to drop the column `DisplayedMessage` on the `alerts` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `alerts` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `tokenInfo` on the `users` table. All the data in the column will be lost.
  - Added the required column `username` to the `alerts` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."alerts_userId_key";

-- AlterTable
ALTER TABLE "public"."alerts" DROP COLUMN "DisplayedMessage",
DROP COLUMN "updatedAt",
ADD COLUMN     "data" JSONB,
ADD COLUMN     "message" TEXT,
ADD COLUMN     "username" TEXT NOT NULL,
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "type" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."refresh_tokens" DROP COLUMN "scope";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "isActive",
DROP COLUMN "sessionId",
DROP COLUMN "tokenInfo",
ADD COLUMN     "isActiveSubscriber" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rate_limits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 1,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionId_key" ON "public"."sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_userId_endpoint_key" ON "public"."rate_limits"("userId", "endpoint");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_logs" ADD CONSTRAINT "system_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rate_limits" ADD CONSTRAINT "rate_limits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
