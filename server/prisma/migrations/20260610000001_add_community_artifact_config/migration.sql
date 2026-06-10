-- AlterTable: Community に成果物設定カラムを追加（ADR-0023 / #332）
-- 既存行は NULL（設定なし）として後方互換を保つ
ALTER TABLE "Community" ADD COLUMN "artifactConfig" JSONB;
