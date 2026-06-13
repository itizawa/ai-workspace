import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createPrismaVoteRepository } from "./prismaVoteRepository.js";

const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)("createPrismaVoteRepository (integration)", () => {
  let prisma: PrismaClient;
  let userId: string;
  let userId2: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  async function setupFixtures() {
    const u1 = await prisma.user.create({
      data: { loginId: "vote-user-1", displayName: "Vote User 1" },
    });
    const u2 = await prisma.user.create({
      data: { loginId: "vote-user-2", displayName: "Vote User 2" },
    });
    userId = u1.id;
    userId2 = u2.id;
  }

  describe("findVote", () => {
    it("未投票のとき null を返す", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      const result = await repo.findVote(userId, "post", "post-abc");

      expect(result).toBeNull();
    });

    it("投票済みのとき VoteRecord を返す", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      await repo.vote(userId, "post", "post-abc", "up");
      const result = await repo.findVote(userId, "post", "post-abc");

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.targetType).toBe("post");
      expect(result?.targetId).toBe("post-abc");
      expect(result?.direction).toBe("up");
    });

    it("targetType が異なる場合は null を返す", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      await repo.vote(userId, "post", "target-1", "up");
      const result = await repo.findVote(userId, "comment", "target-1");

      expect(result).toBeNull();
    });
  });

  describe("vote — toggle/switch ロジック", () => {
    it("未投票 → up: scoreDelta = +1、レコード作成", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      const { scoreDelta } = await repo.vote(userId, "post", "post-1", "up");

      expect(scoreDelta).toBe(1);
      const found = await repo.findVote(userId, "post", "post-1");
      expect(found?.direction).toBe("up");
    });

    it("未投票 → down: scoreDelta = -1、レコード作成", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      const { scoreDelta } = await repo.vote(userId, "post", "post-1", "down");

      expect(scoreDelta).toBe(-1);
      const found = await repo.findVote(userId, "post", "post-1");
      expect(found?.direction).toBe("down");
    });

    it("up 済み → up (toggle off): scoreDelta = -1、レコード削除", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      await repo.vote(userId, "post", "post-1", "up");
      const { scoreDelta } = await repo.vote(userId, "post", "post-1", "up");

      expect(scoreDelta).toBe(-1);
      const found = await repo.findVote(userId, "post", "post-1");
      expect(found).toBeNull();
    });

    it("down 済み → down (toggle off): scoreDelta = +1、レコード削除", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      await repo.vote(userId, "post", "post-1", "down");
      const { scoreDelta } = await repo.vote(userId, "post", "post-1", "down");

      expect(scoreDelta).toBe(1);
      const found = await repo.findVote(userId, "post", "post-1");
      expect(found).toBeNull();
    });

    it("up 済み → down (switch): scoreDelta = -2", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      await repo.vote(userId, "post", "post-1", "up");
      const { scoreDelta } = await repo.vote(userId, "post", "post-1", "down");

      expect(scoreDelta).toBe(-2);
      const found = await repo.findVote(userId, "post", "post-1");
      expect(found?.direction).toBe("down");
    });

    it("down 済み → up (switch): scoreDelta = +2", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      await repo.vote(userId, "post", "post-1", "down");
      const { scoreDelta } = await repo.vote(userId, "post", "post-1", "up");

      expect(scoreDelta).toBe(2);
      const found = await repo.findVote(userId, "post", "post-1");
      expect(found?.direction).toBe("up");
    });

    it("post と comment の vote は独立して管理される", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      await repo.vote(userId, "post", "target-1", "up");
      await repo.vote(userId, "comment", "target-1", "down");

      expect((await repo.findVote(userId, "post", "target-1"))?.direction).toBe("up");
      expect((await repo.findVote(userId, "comment", "target-1"))?.direction).toBe("down");
    });

    it("異なるユーザーの vote は独立して管理される", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      await repo.vote(userId, "post", "post-1", "up");
      await repo.vote(userId2, "post", "post-1", "down");

      expect((await repo.findVote(userId, "post", "post-1"))?.direction).toBe("up");
      expect((await repo.findVote(userId2, "post", "post-1"))?.direction).toBe("down");
    });

    it("同一ユーザーが同一対象へ重複 vote しない（ユニーク制約）", async () => {
      await setupFixtures();
      const repo = createPrismaVoteRepository(prisma);

      await repo.vote(userId, "post", "post-1", "up");
      await repo.vote(userId, "post", "post-1", "up");

      const votes = await prisma.vote.findMany({ where: { userId } });
      expect(votes).toHaveLength(0);
    });
  });

  describe("netScoresByCommunitySince (#486)", () => {
    afterEach(async () => {
      await prisma.community.deleteMany();
    });

    async function setupCommunityFixtures(): Promise<{
      community1: string;
      community2: string;
      post1: string; // community1
      post2: string; // community2
      comment1: string; // community1
    }> {
      const c1 = await prisma.community.create({
        data: { slug: "vote-agg-1", name: "C1", description: "c1" },
      });
      const c2 = await prisma.community.create({
        data: { slug: "vote-agg-2", name: "C2", description: "c2" },
      });
      const p1 = await prisma.post.create({
        data: {
          communityId: c1.id,
          slotKey: "2026-06-10T09:00",
          seq: 0,
          author: "w1",
          title: "t1",
          text: "x1",
        },
      });
      const p2 = await prisma.post.create({
        data: {
          communityId: c2.id,
          slotKey: "2026-06-10T09:00",
          seq: 0,
          author: "w1",
          title: "t2",
          text: "x2",
        },
      });
      const cm1 = await prisma.comment.create({
        data: {
          communityId: c1.id,
          postId: p1.id,
          slotKey: "2026-06-10T09:00",
          seq: 0,
          author: "w2",
          text: "cx1",
        },
      });
      return { community1: c1.id, community2: c2.id, post1: p1.id, post2: p2.id, comment1: cm1.id };
    }

    it("community 別に post / comment の純スコア（up:+1 / down:-1）を集計する", async () => {
      await setupFixtures();
      const fx = await setupCommunityFixtures();
      const repo = createPrismaVoteRepository(prisma);

      // community1: post1 up(+1)、comment1 down(-1) = 0
      await repo.vote(userId, "post", fx.post1, "up");
      await repo.vote(userId, "comment", fx.comment1, "down");
      // community2: post2 down(-1)、別ユーザーも post2 down(-1) = -2
      await repo.vote(userId, "post", fx.post2, "down");
      await repo.vote(userId2, "post", fx.post2, "down");

      const result = await repo.netScoresByCommunitySince(new Date("2020-01-01"));

      expect(result.get(fx.community1)).toBe(0);
      expect(result.get(fx.community2)).toBe(-2);
    });

    it("since より前の vote は集計から除外する", async () => {
      await setupFixtures();
      const fx = await setupCommunityFixtures();
      const repo = createPrismaVoteRepository(prisma);

      await repo.vote(userId, "post", fx.post1, "up");

      // since を未来に置くと直近 vote が除外され空になる。
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await repo.netScoresByCommunitySince(future);

      expect(result.get(fx.community1)).toBeUndefined();
    });

    it("vote が 0 件のとき空の Map を返す", async () => {
      await setupFixtures();
      await setupCommunityFixtures();
      const repo = createPrismaVoteRepository(prisma);

      const result = await repo.netScoresByCommunitySince(new Date("2020-01-01"));

      expect(result.size).toBe(0);
    });
  });
});
