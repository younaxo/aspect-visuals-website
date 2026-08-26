-- AlterTable PromoCode
ALTER TABLE "PromoCode" ADD COLUMN "type" TEXT;
ALTER TABLE "PromoCode" ADD COLUMN "value" DECIMAL(65,30);
ALTER TABLE "PromoCode" ADD COLUMN "minOrderAmount" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "PromoCode" ADD COLUMN "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PromoCode" ADD COLUMN "validUntil" TIMESTAMP(3);
ALTER TABLE "PromoCode" ADD COLUMN "oncePerUser" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PromoCode" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "PromoCode" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "PromoCode"
SET
  "type" = CASE WHEN "discountPercent" IS NOT NULL THEN 'PERCENTAGE' ELSE 'FIXED' END,
  "value" = CASE
    WHEN "discountPercent" IS NOT NULL THEN "discountPercent"
    ELSE COALESCE("discountAmount", 0)
  END,
  "validUntil" = "expiresAt",
  "maxUses" = COALESCE("maxUses", 1);

ALTER TABLE "PromoCode" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "PromoCode" ALTER COLUMN "value" SET NOT NULL;
ALTER TABLE "PromoCode" ALTER COLUMN "maxUses" SET DEFAULT 1;
ALTER TABLE "PromoCode" ALTER COLUMN "maxUses" SET NOT NULL;

ALTER TABLE "PromoCode" DROP COLUMN "discountPercent";
ALTER TABLE "PromoCode" DROP COLUMN "discountAmount";
ALTER TABLE "PromoCode" DROP COLUMN "expiresAt";

-- CreateTable
CREATE TABLE "PromoCodeUsed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCodeUsed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivationBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT,
    "subscriptionId" TEXT,
    "count" INTEGER NOT NULL,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivationKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "productId" TEXT,
    "subscriptionId" TEXT,
    "generatedBy" TEXT,
    "activatedById" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivationKey_key_key" ON "ActivationKey"("key");
CREATE INDEX "ActivationKey_batchId_idx" ON "ActivationKey"("batchId");
CREATE INDEX "ActivationKey_isUsed_idx" ON "ActivationKey"("isUsed");
CREATE INDEX "PromoCodeUsed_userId_idx" ON "PromoCodeUsed"("userId");
CREATE INDEX "PromoCodeUsed_promoCodeId_idx" ON "PromoCodeUsed"("promoCodeId");

ALTER TABLE "PromoCodeUsed" ADD CONSTRAINT "PromoCodeUsed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoCodeUsed" ADD CONSTRAINT "PromoCodeUsed_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActivationBatch" ADD CONSTRAINT "ActivationBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivationBatch" ADD CONSTRAINT "ActivationBatch_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivationKey" ADD CONSTRAINT "ActivationKey_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivationKey" ADD CONSTRAINT "ActivationKey_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivationKey" ADD CONSTRAINT "ActivationKey_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivationKey" ADD CONSTRAINT "ActivationKey_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ActivationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
