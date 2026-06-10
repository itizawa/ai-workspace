# 設計書: CommunityScene を Reddit 風 2 カラムレイアウトに変更する (#370)

## 1. 目的 / 背景

現在の `CommunityScene`（`/communities/$slug`）は Post 一覧とコミュニティ情報を上下に並べる単一カラムレイアウト。
ADR-0018（Reddit 風 UI）に沿い、左にPost一覧・右にコミュニティ詳細 sticky サイドバーの 2 カラムレイアウトに変更する。

## 2. スコープ（やること / やらないこと）

### やること
- `CommunityScene` を 2 カラムレイアウト（左: Post 一覧 / 右: sticky サイドバー）に変更
- 右サイドバー: コミュニティ名・説明・作成日・SubscribeButton・ShareButton
- レスポンシブ: md（960px）未満でサイドバーを非表示（1 カラム）
- 既存テスト（`CommunityScene.test.tsx`）を新レイアウトに追従

### やらないこと
- 購読者数（member count）の表示（API 未実装）
- PostScene へのサイドバー追加
- 既存 PostCard・SubscribeButton・ShareButton の内部変更

## 3. 受け入れ条件（テストに落とせる粒度で箇条書き）

1. `CommunityScene` が 2 カラム構成になる（左: Post 一覧 / 右: コミュニティ詳細サイドバー）
2. 右サイドバーにコミュニティ名（`community.name`）が表示される
3. 右サイドバーにコミュニティの説明（`community.description`）が表示される
4. 右サイドバーに作成日（フォーマット: 「YYYY年M月D日 作成」）が表示される
5. 購読ボタン（`SubscribeButton`）がサイドバー内に表示される（認証ユーザー時）
6. ShareButton がサイドバー内に表示される
7. Post 一覧は左カラムに維持され既存の表示・動作はそのまま
8. `pnpm turbo run build test lint` が緑

## 4. 設計方針（アーキ・データ構造・主要モジュール）

### レイアウト構成

```
Box（maxWidth: 1200px, mx: auto, p: 3）
  ├── Box（display: flex, gap: 3）  ← 2カラムコンテナ
  │   ├── Box（flex: 1）  ← 左カラム: Post 一覧
  │   │   └── ... 既存の PostCard リスト
  │   └── Box（width: 312px, flexShrink: 0）  ← 右カラム: サイドバー
  │       ← position: sticky; top: 80px (AppHeader ~64px + margin)
  │       ← sx={{ display: { xs: "none", md: "block" } }}  ← md未満で非表示
  │       └── Card（コミュニティ詳細）
  │           ├── Typography h6: コミュニティ名
  │           ├── Divider
  │           ├── Typography body2: 説明
  │           ├── Typography caption: 作成日（フォーマット済み）
  │           ├── ShareButton
  │           └── SubscribeButton（認証ユーザー時のみ）
```

### 作成日フォーマット

```typescript
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 作成`;
};
```

## 5. 影響範囲 / 既存への変更

- **client** — `client/src/routes/CommunityScene.tsx`（改修）、`client/src/routes/CommunityScene.test.tsx`（追従）
- **他ワークスペース**: 変更なし（client のみ）

## 6. テスト計画（TDD で書くテスト一覧）

- サイドバーにコミュニティ名が表示される
- サイドバーにコミュニティの説明が表示される
- サイドバーに作成日（「YYYY年M月D日 作成」フォーマット）が表示される
- 既存: h1 にコミュニティの表示名が表示される（維持）
- 既存: r/ プレフィックス付き slug は表示されない（維持）

## 7. リスク・未決事項

- `Community` 型の `created_at` フィールドが必ず文字列として存在するか → openapi.gen.ts 確認済み（`created_at: string` で存在）
- AppHeader の高さ（~64px）は MUI の default AppBar height で、将来変更された場合は sticky top を合わせる必要あり
