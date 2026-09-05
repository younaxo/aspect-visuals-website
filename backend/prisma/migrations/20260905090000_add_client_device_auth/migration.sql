-- CreateTable DeviceAuthorization
CREATE TABLE "DeviceAuthorization" (
    "id" TEXT NOT NULL,
    "deviceCodeHash" TEXT NOT NULL,
    "userCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "clientName" TEXT NOT NULL DEFAULT 'Aspect Visuals',
    "clientVersion" TEXT,
    "userId" TEXT,
    "requestedIp" TEXT,
    "approvedIp" TEXT,
    "lastPolledAt" TIMESTAMP(3),
    "pollCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceAuthorization_deviceCodeHash_key" ON "DeviceAuthorization"("deviceCodeHash");
CREATE UNIQUE INDEX "DeviceAuthorization_userCode_key" ON "DeviceAuthorization"("userCode");
CREATE INDEX "DeviceAuthorization_expiresAt_idx" ON "DeviceAuthorization"("expiresAt");
CREATE INDEX "DeviceAuthorization_status_idx" ON "DeviceAuthorization"("status");

ALTER TABLE "DeviceAuthorization" ADD CONSTRAINT "DeviceAuthorization_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable GameSession: сессия может приходить не только из лаунчера
ALTER TABLE "GameSession" ALTER COLUMN "launchTokenId" DROP NOT NULL;
ALTER TABLE "GameSession" ADD COLUMN "deviceAuthId" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'launcher';
ALTER TABLE "GameSession" ADD COLUMN "label" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "GameSession_deviceAuthId_key" ON "GameSession"("deviceAuthId");
CREATE INDEX "GameSession_kind_idx" ON "GameSession"("kind");

ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_deviceAuthId_fkey"
    FOREIGN KEY ("deviceAuthId") REFERENCES "DeviceAuthorization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
