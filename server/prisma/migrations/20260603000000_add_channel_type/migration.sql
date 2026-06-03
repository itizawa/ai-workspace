-- #54: チャンネルにタイプ（zatsudan / task）を追加する。
-- デフォルトは zatsudan（既存チャンネルへの影響を最小化）。

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('zatsudan', 'task');

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN "type" "ChannelType" NOT NULL DEFAULT 'zatsudan';
