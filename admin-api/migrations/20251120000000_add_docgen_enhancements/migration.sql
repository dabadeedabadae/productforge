-- CreateEnum (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentType') THEN
        CREATE TYPE "DocumentType" AS ENUM ('SRS', 'API', 'DB', 'USERFLOWS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DetailLevel') THEN
        CREATE TYPE "DetailLevel" AS ENUM ('BRIEF', 'STANDARD', 'DETAILED');
    END IF;
END $$;

-- AlterTable: Add new columns to templates
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "documentType" "DocumentType" NOT NULL DEFAULT 'SRS';
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "promptPresetId" INTEGER;

-- CreateTable: prompt_presets
CREATE TABLE IF NOT EXISTS "prompt_presets" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "documentType" "DocumentType" NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: generated_doc_sections
CREATE TABLE IF NOT EXISTS "generated_doc_sections" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "sectionId" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "markdown" TEXT,
    "promptPresetId" INTEGER,
    "regeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_doc_sections_pkey" PRIMARY KEY ("id")
);

-- Rename table if it exists with old name
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'GeneratedDocPackage') THEN
        ALTER TABLE "GeneratedDocPackage" RENAME TO "generated_doc_packages";
    END IF;
END $$;

-- AlterTable: Add new columns to generated_doc_packages (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_doc_packages') THEN
        ALTER TABLE "generated_doc_packages" ADD COLUMN IF NOT EXISTS "detailLevel" "DetailLevel" NOT NULL DEFAULT 'STANDARD';
        ALTER TABLE "generated_doc_packages" ADD COLUMN IF NOT EXISTS "promptPresetId" INTEGER;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "templates_documentType_idx" ON "templates"("documentType");
CREATE INDEX IF NOT EXISTS "templates_promptPresetId_idx" ON "templates"("promptPresetId");
CREATE INDEX IF NOT EXISTS "prompt_presets_documentType_idx" ON "prompt_presets"("documentType");
CREATE INDEX IF NOT EXISTS "prompt_presets_isDefault_idx" ON "prompt_presets"("isDefault");

-- Create indexes for generated_doc_packages only if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_doc_packages') THEN
        CREATE INDEX IF NOT EXISTS "generated_doc_packages_promptPresetId_idx" ON "generated_doc_packages"("promptPresetId");
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "generated_doc_sections_packageId_idx" ON "generated_doc_sections"("packageId");
CREATE INDEX IF NOT EXISTS "generated_doc_sections_documentType_idx" ON "generated_doc_sections"("documentType");
CREATE INDEX IF NOT EXISTS "generated_doc_sections_sectionId_idx" ON "generated_doc_sections"("sectionId");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'templates_promptPresetId_fkey'
    ) THEN
        ALTER TABLE "templates" ADD CONSTRAINT "templates_promptPresetId_fkey" 
        FOREIGN KEY ("promptPresetId") REFERENCES "prompt_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey for generated_doc_packages
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_doc_packages') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'generated_doc_packages_promptPresetId_fkey'
        ) THEN
            ALTER TABLE "generated_doc_packages" ADD CONSTRAINT "generated_doc_packages_promptPresetId_fkey" 
            FOREIGN KEY ("promptPresetId") REFERENCES "prompt_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey for generated_doc_sections
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_doc_packages') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'generated_doc_sections_packageId_fkey'
        ) THEN
            ALTER TABLE "generated_doc_sections" ADD CONSTRAINT "generated_doc_sections_packageId_fkey" 
            FOREIGN KEY ("packageId") REFERENCES "generated_doc_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'generated_doc_sections_promptPresetId_fkey'
    ) THEN
        ALTER TABLE "generated_doc_sections" ADD CONSTRAINT "generated_doc_sections_promptPresetId_fkey" 
        FOREIGN KEY ("promptPresetId") REFERENCES "prompt_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Update analysis_snapshots foreign key if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_snapshots') THEN
        -- Drop existing constraint if it exists
        ALTER TABLE "analysis_snapshots" DROP CONSTRAINT IF EXISTS "analysis_snapshots_packageId_fkey";
        ALTER TABLE "analysis_snapshots" DROP CONSTRAINT IF EXISTS "PackageAnalyses_packageId_fkey";
        
        -- Add new constraint only if generated_doc_packages exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_doc_packages') THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'PackageAnalyses_packageId_fkey'
            ) THEN
                ALTER TABLE "analysis_snapshots" ADD CONSTRAINT "PackageAnalyses_packageId_fkey" 
                FOREIGN KEY ("packageId") REFERENCES "generated_doc_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;
