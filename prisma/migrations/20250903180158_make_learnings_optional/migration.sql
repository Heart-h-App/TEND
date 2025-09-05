-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerEmail" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "intervention" TEXT NOT NULL,
    "measure" TEXT NOT NULL,
    "learnings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Experiment" ("challenge", "createdAt", "hypothesis", "id", "intervention", "learnings", "measure", "ownerEmail", "updatedAt") SELECT "challenge", "createdAt", "hypothesis", "id", "intervention", "learnings", "measure", "ownerEmail", "updatedAt" FROM "Experiment";
DROP TABLE "Experiment";
ALTER TABLE "new_Experiment" RENAME TO "Experiment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
