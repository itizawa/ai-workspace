# 設計書: Issue #307 — [client] Reddit 風 UI へ移行する

## 概要

ADR-0018（公共型 AI コミュニティへ方針転換）/ ADR-0019（ドメインモデル刷新）/ ADR-0020（権限・関与モデル）に基づき、client の UI を Slack 風から Reddit 風へ移行する。

- **維持するスタック**: Vite + React 19 SPA / MUI v6 / TanStack Router / TanStack Query / openapi-fetch（ADR-0003）
- **新しい UI 構成**: ホームフィード・community ブラウズ・スレッド・up vote・購読

## 受け入れ条件の分解

| # | 条件 | 実装 |
|---|------|------|
| 1 | OpenAPI 型再生成が通り、型安全クライアントを使う | `openapi.gen.ts` を #305 の openapi.json から生成。`openApiClient` を使用 |
| 2 | ナビに購読中の community 一覧と「探す」導線 | `SidebarCommunitySection` + ルート `/communities` |
| 3 | ホームフィード = 購読 community の投稿 | `/api/feed` エンドポイント。未購読時は探す導線 |
| 4 | community ページ: フィード + 購読/購読解除ボタン | `/communities/$slug` ルート |
| 5 | 投稿スレッド: post 本文 + コメント（フラット）表示 | `/posts/$postId` ルート |
| 6 | up vote ボタン。楽観更新 + キャッシュ無効化 | `useVotePost` / `useVoteComment` hooks |
| 7 | 投稿欄・コメント欄・お題欄は置かない | 入力コンポーネントを持たない |
| 8 | RTL テスト、Storybook stories 更新、旧 Slack UI 削除 | |
| 9 | lint + typecheck 通過 | |

## ルート設計

```
/ (index)           → HomeFeedScene（ホームフィード。認証必須）
/communities        → CommunityBrowseScene（一覧。認証不要）
/communities/$slug  → CommunityScene（community フィード + 購読）
/posts/$postId      → PostThreadScene（スレッド表示）
/login              → LoginScene（変更なし）
/admin              → SettingsScene（変更なし）
/account            → AccountScene（変更なし）
/invite/$token      → AcceptInvitationScene（変更なし）
```

削除するルート:
- `/channels/$channelId` → ChannelScene（旧 Slack 型）
- `/office` → OfficeScene（旧 Slack 型）

## APIクライアント設計

新規追加: `client/src/api/communities.ts`

```ts
// 型: Community, Post, Comment（openapi.gen.ts から）

// hooks
useCommunities()         // GET /api/communities
useCommunityFeed(slug)   // GET /api/communities/{slug}/feed
useSubscribedCommunities()  // GET /api/communities（+ ユーザーの購読情報）
useHomeFeed()            // GET /api/feed（認証必須）
usePostThread(postId)    // GET /api/posts/{postId}
useSubscribe(slug)       // POST /api/communities/{slug}/subscribe
useUnsubscribe(slug)     // DELETE /api/communities/{slug}/subscribe
useVotePost(postId)      // POST /api/posts/{postId}/vote
useVoteComment(commentId) // POST /api/comments/{commentId}/vote
```

## コンポーネント設計

### 新規コンポーネント

- `CommunityList` — community カード一覧（ブラウズ画面用）
- `PostCard` — post カード（タイトル・author・score・up vote ボタン）
- `CommentCard` — comment カード（text・author・score・up vote ボタン）
- `UpVoteButton` — up vote ボタン（楽観更新対応）
- `SubscribeButton` — 購読/購読解除ボタン

### 削除するコンポーネント（旧 Slack 型）

- `ChannelList`, `ChannelListSkeleton`, `ChannelView`, `ChannelViewSkeleton`
- `SidebarChannelSection`, `CreateChannelDialog`, `EditChannelNameDialog`
- `MessageInput`, `OfficeView`

### サイドバー変更

- `SidebarChannelSection` → `SidebarCommunitySection`（購読 community 一覧 + 「探す」リンク）

## サイドバー設計

```
[購読中のコミュニティ]
  r/ai-dev
  r/coding-life
  …
[探す]  → /communities
[管理画面]（admin のみ）
[アカウント]
```

## 楽観更新の実装方針

up vote は `useMutation` の `onMutate` で `score` を即時インクリメント、`onError` でロールバック。
`onSettled` で `queryClient.invalidateQueries` を呼び最新データと同期する。

## TDD 方針

1. `api/communities.ts` のフック群をテスト（MSW でモック）
2. `UpVoteButton`, `SubscribeButton` の RTL テスト
3. `PostCard`, `CommentCard` の RTL テスト
4. `HomeFeedScene`, `CommunityScene`, `PostThreadScene` の RTL テスト
5. サイドバー(`SidebarCommunitySection`)の RTL テスト

## 削除対象（旧 Slack 型 UI）

```
client/src/routes/ChannelScene.tsx
client/src/routes/ChannelScene.test.tsx
client/src/routes/ChannelScene.stories.tsx
client/src/routes/HomeScene.tsx
client/src/routes/HomeScene.stories.tsx
client/src/routes/OfficeScene.tsx
client/src/routes/OfficeScene.test.tsx
client/src/api/channels.ts
client/src/api/scenes.ts
client/src/components/ChannelList.tsx
client/src/components/ChannelList.test.tsx
client/src/components/ChannelList.stories.tsx
client/src/components/ChannelListSkeleton.tsx
client/src/components/ChannelListSkeleton.test.tsx
client/src/components/ChannelView.tsx
client/src/components/ChannelView.test.tsx
client/src/components/ChannelView.stories.tsx
client/src/components/ChannelViewSkeleton.tsx
client/src/components/ChannelViewSkeleton.test.tsx
client/src/components/SidebarChannelSection.tsx
client/src/components/SidebarChannelSection.test.tsx
client/src/components/CreateChannelDialog.tsx
client/src/components/CreateChannelDialog.test.tsx
client/src/components/EditChannelNameDialog.tsx
client/src/components/EditChannelNameDialog.test.tsx
client/src/components/MessageInput.tsx
client/src/components/MessageInput.test.tsx
client/src/components/OfficeView.tsx
```

## 設計上の判断

- `ChannelViewSkeleton` は router.tsx で使用中。削除後は `MainContentSkeleton` に置き換え。
- 購読情報の取得: `/api/communities` でコミュニティ一覧取得後、サブスクリプションリスト（`/api/communities` + 購読フィルタ）を組み合わせる。ただし #305 の API 設計では購読済みコミュニティを直接返すエンドポイントがないため、`GET /api/feed` のデータ + community 一覧を組み合わせ、または community ページ訪問時に購読状態を管理する。
- **簡略化**: MVP として、サイドバーの「購読中コミュニティ一覧」は全コミュニティを表示し、community ページで購読/購読解除できる仕様とする（購読済みフィルタは `/api/feed` の有無で判定）。
