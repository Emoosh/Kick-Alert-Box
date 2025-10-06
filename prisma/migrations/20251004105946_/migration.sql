/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `access_tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "access_tokens_userId_key" ON "public"."access_tokens"("userId");
