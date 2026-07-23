-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "replaced_by_id" TEXT;

-- CreateIndex
CREATE INDEX "api_keys_organization_id_revoked_at_idx" ON "api_keys"("organization_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
