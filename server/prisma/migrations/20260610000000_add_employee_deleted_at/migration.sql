-- AlterTable: Employee 論理削除フィールド追加（#218）
ALTER TABLE "Employee" ADD COLUMN "deletedAt" TIMESTAMP(3);
