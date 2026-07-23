-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "batch_id" TEXT;

-- CreateTable
CREATE TABLE "email_batches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "api_key_id" TEXT,
    "mode" "ApiKeyMode" NOT NULL,
    "total" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_batches_organization_id_created_at_idx" ON "email_batches"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_batch_id_idx" ON "messages"("batch_id");

-- AddForeignKey
ALTER TABLE "email_batches" ADD CONSTRAINT "email_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_batches" ADD CONSTRAINT "email_batches_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "email_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
