/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `templates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"("slug");
