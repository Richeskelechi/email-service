/*
  Warnings:

  - Added the required column `from_email` to the `email_batches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipients` to the `email_batches` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('pending_fanout', 'expanding', 'ready');

-- AlterTable
ALTER TABLE "email_batches" ADD COLUMN     "fanned_out" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "from_email" TEXT NOT NULL,
ADD COLUMN     "html_body" TEXT,
ADD COLUMN     "recipients" JSONB NOT NULL,
ADD COLUMN     "status" "BatchStatus" NOT NULL DEFAULT 'pending_fanout',
ADD COLUMN     "text_body" TEXT;

-- CreateIndex
CREATE INDEX "email_batches_status_created_at_idx" ON "email_batches"("status", "created_at");
