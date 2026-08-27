-- CreateTable LaunchToken
CREATE TABLE "LaunchToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'game-client',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "issuedIp" TEXT,

    CONSTRAINT "LaunchToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LaunchToken_jti_key" ON "LaunchToken"("jti");
CREATE INDEX "LaunchToken_userId_idx" ON "LaunchToken"("userId");
CREATE INDEX "LaunchToken_expiresAt_idx" ON "LaunchToken"("expiresAt");

ALTER TABLE "LaunchToken" ADD CONSTRAINT "LaunchToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable GameSession
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "launchTokenId" TEXT NOT NULL,
    "roles" TEXT[],
    "ip" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endedReason" TEXT,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameSession_launchTokenId_key" ON "GameSession"("launchTokenId");
CREATE INDEX "GameSession_userId_endedAt_idx" ON "GameSession"("userId", "endedAt");

ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_launchTokenId_fkey"
    FOREIGN KEY ("launchTokenId") REFERENCES "LaunchToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ClientRelease
CREATE TABLE "ClientRelease" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'stable',
    "version" TEXT NOT NULL,
    "notes" TEXT,
    "signature" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientRelease_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientRelease_channel_version_key" ON "ClientRelease"("channel", "version");
CREATE INDEX "ClientRelease_channel_isActive_idx" ON "ClientRelease"("channel", "isActive");

-- CreateTable ClientFile
CREATE TABLE "ClientFile" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "executable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClientFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientFile_releaseId_path_key" ON "ClientFile"("releaseId", "path");

ALTER TABLE "ClientFile" ADD CONSTRAINT "ClientFile_releaseId_fkey"
    FOREIGN KEY ("releaseId") REFERENCES "ClientRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
