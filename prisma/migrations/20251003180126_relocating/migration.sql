/*
  Warnings:

  - You are about to drop the column `scope` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."access_tokens" ADD COLUMN     "scope" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "public"."refresh_tokens" ADD COLUMN     "scope" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "scope";
