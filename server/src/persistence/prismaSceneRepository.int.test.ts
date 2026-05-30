import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaSceneRepository } from "./prismaSceneRepository.js";

const hasDb = Boolean(process.env.DATABASE_URL);

// DATABASE_URL がある時（= マイグレーション適用済みの PostgreSQL がある時）のみ実行する。
// DB レス環境では skip し、`vitest run` を緑に保つ（AC-6 の実 DB 検証は docker 起動時に実施）。
describe.skipIf(!hasDb)("PrismaSceneRepository (AC-6 統合・要 DATABASE_URL)", () => {
  const prisma = new PrismaClient();
  const repo = new PrismaSceneRepository(prisma);

  beforeAll(async () => {
    await prisma.message.deleteMany();
    await prisma.scene.deleteMany();
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.scene.deleteMany();
    await prisma.$disconnect();
  });

  it("create で保存し list で発言順を保って取得できる", async () => {
    const created = await repo.create({
      scene: "統合テスト",
      messages: [
        { speaker: "e1", channel: "zatsudan", text: "one" },
        { speaker: "e2", channel: "shigoto", text: "two" },
      ],
    });
    expect(created.id).toBeTruthy();
    expect(created.scene).toBe("統合テスト");
    expect(created.messages).toHaveLength(2);

    const all = await repo.list();
    const found = all.find((s) => s.id === created.id);
    expect(found).toBeDefined();
    expect(found?.messages.map((m) => m.text)).toEqual(["one", "two"]);
  });
});
