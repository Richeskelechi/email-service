-- AlterTable
ALTER TABLE "email_templates" ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "email_templates" ADD COLUMN "key" TEXT,
ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_key_key" ON "email_templates"("key");

-- CreateIndex
CREATE INDEX "email_templates_is_system_idx" ON "email_templates"("is_system");
