# 設計書: Issue #310 — [admin] community を作成・編集できる（管理画面・ADR-0020）

## 概要

ADR-0020 で確定した通り、admin が community（サブレディット相当のエンティティ）を
作成・編集できる API と管理画面 UI を実装する。

## 背景・目的

- ADR-0019: `Community` は `slug` / `name` / `description`（作風）/ `synopsis` / `last_slot_key` / `created_at` を持つ第一級エンティティ
- ADR-0020: admin のみが community を CRUD できる（一般 member は 403、未認証は 401）
- `description`（作風）は定時バッチ（#306）の community 固有プロンプト部として使われる
- Phase 3 「ユーザーへの community 作成開放」の前提となる実装

## 受け入れ条件

1. **common**: `CommunitySchema` の `slug` に小文字英数・ハイフンのパターンバリデーションを追加。
   作成・編集用スキーマ（`CreateCommunitySchema` / `UpdateCommunitySchema`）を追加
2. **server**:
   - `POST /api/admin/communities` — community 作成（admin のみ）
   - `PATCH /api/admin/communities/:id` — community 編集（admin のみ）
   - `GET /api/admin/communities` — community 一覧（admin のみ）
   - `slug` 一意制約違反は 409 Conflict
   - OpenAPI レジストリに登録・再生成可能
3. **client**: 管理画面に「コミュニティ」タブを追加し、一覧・作成・編集フォームを提供

## アーキテクチャ設計

### common 変更

`common/src/domain/community/community.ts` に追加:

- `slug` の regex バリデーション: `/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/`
  （小文字英数で始まり終わる、中間にハイフン可、1文字でも可）
- `CreateCommunitySchema`: `slug` / `name` / `description` のみ（id / created_at は不要）
- `UpdateCommunitySchema`: `name` / `description` のみ（slug は作成後変更不可）

### server 変更

#### 永続化層

`CommunityRepository` インターフェース + `InMemoryCommunityRepository`:
- `list(): Promise<Community[]>`
- `findById(id: string): Promise<Community | null>`
- `findBySlug(slug: string): Promise<Community | null>`
- `create(input: CreateCommunityInput): Promise<Community>`
- `update(id: string, input: UpdateCommunityInput): Promise<Community | null>`

注: Prisma スキーマに `Community` モデルが未追加のため、本 Issue では
`InMemoryCommunityRepository` のみ実装し `PrismaCommunityRepository` は別 Issue に委ねる
（Blocked by #305: 永続化基盤）。

→ **実際に DB マイグレーションは行わず、InMemory 実装のみ**。

#### ルート

`server/src/routes/admin.ts` に community CRUD エンドポイントを追加。
`requireAuth + requireAdmin` ミドルウェアで保護（既存の `router.use(requireAuth, requireAdmin)` で一括適用済み）。

#### OpenAPI

`server/src/openapi/registry.ts` に community CRUD パスを登録。

### client 変更

- `client/src/api/communities.ts`: community API クライアント + TanStack Query フック
- `client/src/components/CommunitiesTab.tsx`: 管理画面コミュニティタブ（一覧・作成・編集）
- `client/src/routes/SettingsScene.tsx`: "communities" タブを追加
- `client/src/routes/settingsTabValues.ts`: `"communities"` を追加

### フォーム規約

`@tanstack/react-form` の `useForm` / `form.Field` を使用（useState によるフォーム管理禁止）。
各入力フィールドに `inputProps={{ maxLength: N }}` を設定し、Zod スキーマと二重防御。

## `description`（作風）と定時バッチの関係

`Community.description` は「この community の作風・世界観指示」を格納する。
定時バッチ（#306）では community を生成単位として、`description` を
プロンプトの community 固有部（作風指示）として渡す設計になっている。
本 Issue ではその前提としての CRUD 実装のみを担う。

## 制約・留意事項

- `slug` は作成後変更不可（URL の永続性のため）
- 論理削除は将来 Issue に委ねる
- `PrismaCommunityRepository` は #305 完了後に実装
- ユーザーへの作成開放は Phase 3（本 Issue は admin 限定）

## テスト戦略

### server テスト（TDD）

`server/src/routes/admin.communities.test.ts`:
- `POST /api/admin/communities`: admin → 201 / member → 403 / 未認証 → 401 / slug 重複 → 409
- `PATCH /api/admin/communities/:id`: admin → 200 / member → 403 / 未認証 → 401 / 存在しない → 404
- `GET /api/admin/communities`: admin → 200 / member → 403 / 未認証 → 401

### common テスト

`common/src/domain/community/community.test.ts`:
- `CommunitySchema.slug` の regex: 有効/無効パターン
- `CreateCommunitySchema` / `UpdateCommunitySchema` のバリデーション
