-- AlterTable: Message に postedAt カラムを追加する（#183）
-- まず nullable として追加し、既存行をバックフィルしてから NOT NULL に変更する
ALTER TABLE "Message" ADD COLUMN "postedAt" TIMESTAMP(3);

-- 既存行は createdAt と同値にする（作成時点で表示されていた＝即時表示の扱い）
UPDATE "Message" SET "postedAt" = "createdAt";

-- NOT NULL 制約を付与
ALTER TABLE "Message" ALTER COLUMN "postedAt" SET NOT NULL;

-- デフォルト値を設定（新規レコードは now()）
ALTER TABLE "Message" ALTER COLUMN "postedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex: channel + postedAt の複合インデックス（listByChannel の絞り込みに利用）
CREATE INDEX "Message_channel_postedAt_idx" ON "Message"("channel", "postedAt");
