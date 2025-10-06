/*
  Warnings:

  - You are about to drop the column `data` on the `alerts` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `alerts` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `alerts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."alerts" DROP COLUMN "data",
DROP COLUMN "message",
DROP COLUMN "username",
ADD COLUMN     "DisplayedMessage" TEXT;
