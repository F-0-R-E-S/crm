-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "DocChunk" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "anchor" TEXT,
    "sourceHash" TEXT NOT NULL,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocSearchEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT,
    "query" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "topKJson" JSONB NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocSearchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocAskEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "hitsJson" JSONB NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "refused" BOOLEAN NOT NULL DEFAULT false,
    "promptVer" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocAskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocChunk_slug_idx" ON "DocChunk"("slug");

-- CreateIndex
CREATE INDEX "DocChunk_audience_idx" ON "DocChunk"("audience");

-- CreateIndex
CREATE INDEX "DocChunk_block_idx" ON "DocChunk"("block");

-- CreateIndex
CREATE INDEX "DocSearchEvent_userId_idx" ON "DocSearchEvent"("userId");

-- CreateIndex
CREATE INDEX "DocSearchEvent_createdAt_idx" ON "DocSearchEvent"("createdAt");

-- CreateIndex
CREATE INDEX "DocAskEvent_userId_idx" ON "DocAskEvent"("userId");

-- CreateIndex
CREATE INDEX "DocAskEvent_createdAt_idx" ON "DocAskEvent"("createdAt");

-- CreateIndex
CREATE INDEX "DocAskEvent_refused_idx" ON "DocAskEvent"("refused");

-- Add generated tsvector column for full-text search
ALTER TABLE "DocChunk"
  ADD COLUMN "tsv" tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) STORED;

-- GIN index for full-text search on tsv
CREATE INDEX "DocChunk_tsv_idx" ON "DocChunk" USING GIN ("tsv");

-- ivfflat index for vector similarity search
CREATE INDEX "DocChunk_embedding_idx" ON "DocChunk"
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
