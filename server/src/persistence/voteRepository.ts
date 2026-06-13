/**
 * Vote（up/down）の永続化境界（ポート）。ADR-0025 で down vote を追加。
 * (userId, targetType, targetId) の複合ユニーク制約で 1 ユーザー × 1 ターゲットにつき 1 レコードを維持。
 * 同一方向の再押下で toggle off（中立）、異なる方向で switch する。
 */

import type { VoteDirection } from "@hatchery/common";

export type { VoteDirection };
export type VoteTargetType = "post" | "comment";

export interface VoteRecord {
  id: string;
  userId: string;
  targetType: VoteTargetType;
  targetId: string;
  direction: VoteDirection;
  createdAt: Date;
}

export interface VoteRepository {
  /** 既存 vote レコードを取得する。未投票なら null。 */
  findVote(userId: string, targetType: VoteTargetType, targetId: string): Promise<VoteRecord | null>;
  /**
   * vote を記録する（toggle/switch ロジック）。
   * - 未投票 → up: create, scoreDelta = +1
   * - 未投票 → down: create, scoreDelta = -1
   * - up 済み → up: delete (toggle off), scoreDelta = -1
   * - down 済み → down: delete (toggle off), scoreDelta = +1
   * - up 済み → down: update, scoreDelta = -2
   * - down 済み → up: update, scoreDelta = +2
   */
  vote(
    userId: string,
    targetType: VoteTargetType,
    targetId: string,
    direction: VoteDirection,
  ): Promise<{ scoreDelta: number }>;
  /**
   * 直近の vote から community 別の純スコア（up: +1 / down: -1）合計を集計する（#486 / ADR-0030）。
   * 定時バッチの「vote 重み付き 1 コミュニティ選定」の重み算出に使う。
   *
   * @param since この日時以降（`createdAt >= since`）の vote のみ集計する。
   * @returns communityId → 純スコア合計の Map。集計対象が無い community はキーを持たない。
   */
  netScoresByCommunitySince(since: Date): Promise<Map<string, number>>;
}

/**
 * targetId（Post / Comment の id）を所属 community id に解決する関数。
 * インメモリ実装の `netScoresByCommunitySince` で targetId を community に紐づけるために使う。
 * 解決できない（存在しない）ターゲットは null を返す。
 */
export type ResolveCommunityId = (
  targetType: VoteTargetType,
  targetId: string,
) => string | null;

/**
 * DB 非依存のインメモリ実装。ユースケース/ルートのテストで注入する。
 *
 * @param resolveCommunityId `netScoresByCommunitySince` で targetId → communityId を解決する関数。
 *   省略時は全ターゲットが解決不能（純スコア集計は常に空）になる。
 * @param clock `createdAt` に使う現在時刻供給関数（テストで固定するため）。既定は `() => new Date()`。
 */
export function createInMemoryVoteRepository(
  resolveCommunityId?: ResolveCommunityId,
  clock: () => Date = () => new Date(),
): VoteRepository {
  const records: VoteRecord[] = [];
  let seq = 0;

  function findRecord(
    userId: string,
    targetType: VoteTargetType,
    targetId: string,
  ): VoteRecord | null {
    return (
      records.find(
        (r) => r.userId === userId && r.targetType === targetType && r.targetId === targetId,
      ) ?? null
    );
  }

  return {
    findVote(
      userId: string,
      targetType: VoteTargetType,
      targetId: string,
    ): Promise<VoteRecord | null> {
      return Promise.resolve(findRecord(userId, targetType, targetId));
    },

    vote(
      userId: string,
      targetType: VoteTargetType,
      targetId: string,
      direction: VoteDirection,
    ): Promise<{ scoreDelta: number }> {
      const existing = findRecord(userId, targetType, targetId);

      if (!existing) {
        seq += 1;
        records.push({
          id: `vote-${seq}`,
          userId,
          targetType,
          targetId,
          direction,
          createdAt: clock(),
        });
        return Promise.resolve({ scoreDelta: direction === "up" ? 1 : -1 });
      }

      if (existing.direction === direction) {
        // toggle off: delete
        const idx = records.indexOf(existing);
        records.splice(idx, 1);
        return Promise.resolve({ scoreDelta: direction === "up" ? -1 : 1 });
      }

      // switch direction
      existing.direction = direction;
      return Promise.resolve({ scoreDelta: direction === "up" ? 2 : -2 });
    },

    netScoresByCommunitySince(since: Date): Promise<Map<string, number>> {
      const scores = new Map<string, number>();
      for (const record of records) {
        if (record.createdAt.getTime() < since.getTime()) continue;
        const communityId = resolveCommunityId?.(record.targetType, record.targetId) ?? null;
        if (communityId === null) continue;
        const delta = record.direction === "up" ? 1 : -1;
        scores.set(communityId, (scores.get(communityId) ?? 0) + delta);
      }
      return Promise.resolve(scores);
    },
  };
}
