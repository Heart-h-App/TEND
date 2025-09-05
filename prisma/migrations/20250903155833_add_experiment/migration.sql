-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerEmail" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "intervention" TEXT NOT NULL,
    "measure" TEXT NOT NULL,
    "learnings" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
