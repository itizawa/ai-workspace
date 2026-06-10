# 設計書: トップ画面のホームフィードを無限スクロール（カーソルページネーション）に対応する (#367)

## 1. 目的 / 背景

`GET /api/feed` は現状 `limit=50` の一括取得のみで、50件以上の過去 post が閲覧できない。
「放置して眺める観察エンタメ」ではスクロールで過去の会話を遡る体験が中心となるため、
スクロール末尾到達時に次ページを自動取得する**無限スクロール（カーソルベースページネーション）**を導入する。

## 2. スコープ（やること / やらないこと）

**やること:**
- `GET /api/feed` をカーソルベースページネーションに対応
- `common/` にクエリスキーマ（`HomeFeedQuerySchema`）とレスポンススキーマ（`HomeFeedResponseSchema`）を追加
- `PostRepository.listLatestPaged` を新設（cursor + limit → `{ posts, nextCursor }`）
- OpenAPI 定義更新 → client 型生成（一方向フロー）
- `useHomeFeed` を `useInfiniteQuery` ベースに置換
- `HomeFeedScene` に `IntersectionObserver` で番兵スクロール検知を追加

**やらないこと:**
- community 個別フィード、コメントの無限スクロール
- 新着の自動ポーリング、並び順切り替え
- `POST /api/feed` 等の変更

## 3. 受け入れ条件（テストに落とせる粒度）

1. `GET /api/feed` が `cursor`（省略可・文字列・max 512）と `limit`（省略可・整数・1〜100・既定 20）を受け取る
2. レスポンスが `{ posts: Post[]; nextCursor: string | null }` 形式
3. 並び順は `createdAt DESC, id DESC`（タイブレーク）で安定し、ページ境界で重複/欠落なし
4. `limit` 超過（101+）・不正 `cursor` に対し 400 を返す
5. `nextCursor === null` は末尾（追加ページなし）を示す
6. `common/` の Zod スキーマで `limit` に `.max(100)`, `.min(1)`, `cursor` に `.max(512)` がある
7. `pnpm turbo run build test lint` 全緑

## 4. 設計方針（アーキ・データ構造・主要モジュール）

### カーソル設計

カーソルは `base64(JSON.stringify({ createdAt: ISO文字列, id: string }))` とする。

- 並び順: `createdAt DESC, id DESC`
- 次ページ条件: `createdAt < cursor.createdAt` OR `(createdAt === cursor.createdAt AND id < cursor.id)`
- `nextCursor` 判定: `limit+1` 件取得し、`limit+1` 件あれば `items[limit-1]` をエンコードして返す。`limit` 件以下なら `null`。

### common/ の追加スキーマ（`common/src/domain/feed/feed.ts`）

```ts
export const HomeFeedQuerySchema = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const HomeFeedResponseSchema = z.object({
  posts: z.array(PostSchema),
  nextCursor: z.string().max(512).nullable(),
});
```

### PostRepository インターフェース拡張

```ts
listLatestPaged(cursor?: string, limit?: number): Promise<{ posts: PostRecord[]; nextCursor: string | null }>;
```

### server ルート（validateQuery ミドルウェアをインライン実装）

`req.query` を `HomeFeedQuerySchema.safeParse` で検証し、失敗時 400。
成功時に `postRepo.listLatestPaged(cursor, limit)` を呼び `{ posts, nextCursor }` を返す。

### client 変更

- `fetchHomeFeed` → `fetchHomeFeedPage(cursor?: string): Promise<{ posts: Post[]; nextCursor: string | null }>`
- `useHomeFeed()` → `useInfiniteHomeFeed()`: `useInfiniteQuery` で `getNextPageParam(lastPage) = lastPage.nextCursor ?? undefined`
- `HomeFeedScene`: `useRef` + `IntersectionObserver` で番兵 `<div>` を監視、交差で `fetchNextPage()` 呼び出し

## 5. 影響範囲 / 既存への変更

| ファイル | 変更 |
|---------|------|
| `common/src/domain/feed/feed.ts` | 新規作成 |
| `common/src/domain/feed/index.ts` | 新規作成 |
| `common/src/index.ts` | feed export 追加 |
| `server/src/persistence/postRepository.ts` | `listLatestPaged` 追加（インターフェース + インメモリ実装） |
| `server/src/persistence/prismaPostRepository.ts` | `listLatestPaged` 追加 |
| `server/src/routes/feed.ts` | クエリ検証 + 新メソッド使用 |
| `server/src/routes/feed.test.ts` | ページネーションテスト追加 |
| `server/src/openapi/registry.ts` | `GET /api/feed` 定義更新 |
| `client/src/api/communities.ts` | `useInfiniteHomeFeed` 追加 |
| `client/src/routes/HomeFeedScene.tsx` | 無限スクロール UI 対応 |

## 6. テスト計画（TDDで書くテスト一覧）

**server/src/routes/feed.test.ts:**
- cursor なし・先頭 20 件（limit 既定）を取得し nextCursor が非 null
- nextCursor を使って続きを取得、境界で重複/欠落なし
- 最後のページで nextCursor が null
- limit 超過（101）→ 400
- 不正 cursor（base64 で解析できない内容）→ 400
- limit=1 で 1 件ずつ取得できる

**common/src/domain/feed/feed.test.ts:**（任意、スキーマ単体テスト）
- `HomeFeedQuerySchema` の `limit` 境界値（1, 100, 101→エラー, 0→エラー）

## 7. リスク・未決事項

- `listLatest`（旧 API）は `listByCommunity` 等で参照されていないため、今後 `listLatestPaged` に統一する方向で問題なし。既存テスト互換性のため今回は残す。
- client の `openapi.gen.ts` は生成物（コミットしない）のため、型変更は `pnpm gen-types` で対応。
