/*
  Warnings:

  - Added the required column `mode` to the `api_keys` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApiKeyMode" AS ENUM ('test', 'live');

-- AlterEnum
ALTER TYPE "MessageStatus" ADD VALUE 'simulated';

-- DropIndex
DROP INDEX "api_keys_organization_id_revoked_at_idx";

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "mode" "ApiKeyMode" NOT NULL;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "mode" "ApiKeyMode" NOT NULL DEFAULT 'live';

-- CreateIndex
CREATE INDEX "api_keys_organization_id_mode_revoked_at_idx" ON "api_keys"("organization_id", "mode", "revoked_at");

-- CreateIndex
CREATE INDEX "messages_mode_status_idx" ON "messages"("mode", "status");
