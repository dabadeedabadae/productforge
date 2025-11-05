-- CreateTable
CREATE TABLE "GeneratedDocPackage" (
    "id" SERIAL NOT NULL,
    "concept" TEXT NOT NULL,
    "domain" TEXT,
    "docs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocPackage_pkey" PRIMARY KEY ("id")
);
