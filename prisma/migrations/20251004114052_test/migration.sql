/*
  Warnings:

  - The `type` column on the `alerts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[userId]` on the table `alerts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."alerts" DROP COLUMN "type",
ADD COLUMN     "type" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "alerts_userId_key" ON "public"."alerts"("userId");
