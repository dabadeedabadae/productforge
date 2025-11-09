-- CreateTable
CREATE TABLE "kb_items" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "domain" TEXT,
    "solutionType" TEXT,
    "techStack" JSONB,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_item_tags" (
    "kbItemId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "kb_item_tags_pkey" PRIMARY KEY ("kbItemId","tagId")
);

-- CreateTable
CREATE TABLE "kb_item_categories" (
    "kbItemId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "kb_item_categories_pkey" PRIMARY KEY ("kbItemId","categoryId")
);

-- CreateTable
CREATE TABLE "analysis_snapshots" (
    "id" SERIAL NOT NULL,
    "concept" TEXT NOT NULL,
    "domain" TEXT,
    "packageId" INTEGER,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kb_items_slug_key" ON "kb_items"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- AddForeignKey
ALTER TABLE "kb_items" ADD CONSTRAINT "kb_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_item_tags" ADD CONSTRAINT "kb_item_tags_kbItemId_fkey" FOREIGN KEY ("kbItemId") REFERENCES "kb_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_item_tags" ADD CONSTRAINT "kb_item_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_item_categories" ADD CONSTRAINT "kb_item_categories_kbItemId_fkey" FOREIGN KEY ("kbItemId") REFERENCES "kb_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_item_categories" ADD CONSTRAINT "kb_item_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_snapshots" ADD CONSTRAINT "analysis_snapshots_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "GeneratedDocPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
