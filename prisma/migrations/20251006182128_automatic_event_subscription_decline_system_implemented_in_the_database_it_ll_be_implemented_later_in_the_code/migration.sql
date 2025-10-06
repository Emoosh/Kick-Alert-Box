/*
  Warnings:

  - You are about to drop the column `isActiveSubscriber` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "isActiveSubscriber",
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3);
