import { z } from "zod";

import { PostSchema } from "../post/post.js";

/** カーソルの最大長。base64(JSON{ createdAt, id }) で最大 ~100 chars。余裕を持って 512。 */
export const FEED_CURSOR_MAX_LENGTH = 512;

/** ホームフィード取得クエリのスキーマ（#367）。cursor と limit を検証する。 */
export const HomeFeedQuerySchema = z.object({
  cursor: z.string().max(FEED_CURSOR_MAX_LENGTH).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type HomeFeedQuery = z.infer<typeof HomeFeedQuerySchema>;

/** ホームフィードレスポンスのスキーマ（#367）。カーソルページネーション形式。 */
export const HomeFeedResponseSchema = z.object({
  posts: z.array(PostSchema),
  nextCursor: z.string().max(FEED_CURSOR_MAX_LENGTH).nullable(),
});

export type HomeFeedResponse = z.infer<typeof HomeFeedResponseSchema>;
