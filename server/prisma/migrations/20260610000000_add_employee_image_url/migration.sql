-- AddColumn: Employee.imageUrl（#204）
-- admin がワーカーのアバター画像をアップロードする GCS 保存基盤（ADR-0022）。
-- imageUrl は GCS の公開 URL を格納する任意フィールド（最大 500 文字）。

ALTER TABLE "Employee" ADD COLUMN "imageUrl" TEXT;
