import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  VoteDirection,
  VoteRecord,
  VoteRepository,
  VoteTargetType,
} from "./voteRepository.js";

/** VoteRepository の Prisma / PostgreSQL 実装（ADR-0019 / ADR-0025）。 */
export function createPrismaVoteRepository(prisma: PrismaClient): VoteRepository {
  return {
    async findVote(
      userId: string,
      targetType: VoteTargetType,
      targetId: string,
    ): Promise<VoteRecord | null> {
      const row = await prisma.vote.findUnique({
        where: { userId_targetType_targetId: { userId, targetType, targetId } },
      });
      if (!row) return null;
      return {
        id: row.id,
        userId: row.userId,
        targetType: row.targetType as VoteTargetType,
        targetId: row.targetId,
        direction: row.direction as VoteDirection,
        createdAt: row.createdAt,
      };
    },

    async vote(
      userId: string,
      targetType: VoteTargetType,
      targetId: string,
      direction: VoteDirection,
    ): Promise<{ scoreDelta: number }> {
      const existing = await prisma.vote.findUnique({
        where: { userId_targetType_targetId: { userId, targetType, targetId } },
      });

      if (!existing) {
        await prisma.vote.create({ data: { userId, targetType, targetId, direction } });
        return { scoreDelta: direction === "up" ? 1 : -1 };
      }

      if (existing.direction === direction) {
        await prisma.vote.delete({
          where: { userId_targetType_targetId: { userId, targetType, targetId } },
        });
        return { scoreDelta: direction === "up" ? -1 : 1 };
      }

      await prisma.vote.update({
        where: { userId_targetType_targetId: { userId, targetType, targetId } },
        data: { direction },
      });
      return { scoreDelta: direction === "up" ? 2 : -2 };
    },

    async netScoresByCommunitySince(since: Date): Promise<Map<string, number>> {
      // Vote.targetId は Post / Comment の id を多態参照する（DB FK なし）。
      // post 票は Post 経由、comment 票は Comment 経由で communityId に解決し、
      // up を +1 / down を -1 として community 単位に集計する（#486 / ADR-0030）。
      const rows = await prisma.$queryRaw<{ communityId: string; netScore: bigint }[]>(Prisma.sql`
        SELECT "communityId", SUM(CASE WHEN "direction" = 'up' THEN 1 ELSE -1 END) AS "netScore"
        FROM (
          SELECT p."communityId" AS "communityId", v."direction" AS "direction"
          FROM "Vote" v
          JOIN "Post" p ON p."id" = v."targetId"
          WHERE v."targetType" = 'post' AND v."createdAt" >= ${since}
          UNION ALL
          SELECT c."communityId" AS "communityId", v."direction" AS "direction"
          FROM "Vote" v
          JOIN "Comment" c ON c."id" = v."targetId"
          WHERE v."targetType" = 'comment' AND v."createdAt" >= ${since}
        ) AS resolved
        GROUP BY "communityId"
      `);

      const scores = new Map<string, number>();
      for (const row of rows) {
        scores.set(row.communityId, Number(row.netScore));
      }
      return scores;
    },
  };
}
