/*
  Warnings:

  - The primary key for the `ChatSession` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ChatMessage" DROP CONSTRAINT "ChatMessage_sessionId_fkey";

-- AlterTable
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_pkey",
ADD COLUMN     "currentNodeId" TEXT,
ADD COLUMN     "rootNodeId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "title" DROP DEFAULT,
ADD CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ChatSession_id_seq";

-- AlterTable
ALTER TABLE "generated_doc_packages" RENAME CONSTRAINT "GeneratedDocPackage_pkey" TO "generated_doc_packages_pkey";

-- AlterTable
ALTER TABLE "generated_doc_sections" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "prompt_presets" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "public"."ChatMessage";

-- CreateTable
CREATE TABLE "ChatNode" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "siblingIndex" INTEGER NOT NULL,
    "label" TEXT,
    "promptText" TEXT NOT NULL,
    "model" TEXT,
    "preset" TEXT,
    "responseJson" JSONB,
    "responseMd" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergeOperation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "baseNodeId" TEXT NOT NULL,
    "leftNodeId" TEXT NOT NULL,
    "rightNodeId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "sectionsMap" JSONB NOT NULL,
    "conflicts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MergeOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatNode_sessionId_path_idx" ON "ChatNode"("sessionId", "path");

-- CreateIndex
CREATE INDEX "MergeOperation_sessionId_createdAt_idx" ON "MergeOperation"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatSession_createdAt_idx" ON "ChatSession"("createdAt");

-- RenameForeignKey
ALTER TABLE "analysis_snapshots" RENAME CONSTRAINT "PackageAnalyses_packageId_fkey" TO "analysis_snapshots_packageId_fkey";

-- AddForeignKey
ALTER TABLE "ChatNode" ADD CONSTRAINT "ChatNode_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatNode" ADD CONSTRAINT "ChatNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChatNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
