-- CreateTable
CREATE TABLE "NorthStar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerEmail" TEXT NOT NULL,
    "haiku" TEXT NOT NULL,
    "north" JSONB NOT NULL,
    "east" JSONB NOT NULL,
    "south" JSONB NOT NULL,
    "west" JSONB NOT NULL,
    "metaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "NorthStar_ownerEmail_key" ON "NorthStar"("ownerEmail");
