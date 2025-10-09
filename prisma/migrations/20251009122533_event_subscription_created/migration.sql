/*
  Warnings:

  - You are about to drop the `webhooks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."webhooks" DROP CONSTRAINT "webhooks_userId_fkey";

-- DropTable
DROP TABLE "public"."webhooks";

-- CreateTable
CREATE TABLE "public"."event_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kickSubscriptionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "broadcasterUserId" TEXT NOT NULL,
    "broadcasterUsername" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEventAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_subscriptions_kickSubscriptionId_key" ON "public"."event_subscriptions"("kickSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "event_subscriptions_userId_eventType_broadcasterUserId_key" ON "public"."event_subscriptions"("userId", "eventType", "broadcasterUserId");

-- AddForeignKey
ALTER TABLE "public"."event_subscriptions" ADD CONSTRAINT "event_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
