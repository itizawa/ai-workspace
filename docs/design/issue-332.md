# 設計書: Community に成果物設定（許可スキル＋指示文）を追加し、ADR-0016 を Supersede する新 ADR を作成する (#332)

## 1. 目的 / 背景

ADR-0016 の `goal`（出力契約）は channel 時代の概念であり、ADR-0018/ADR-0019 の公共コミュニティへのピボット後、channel ドメイン自体が廃止予定（#330）となった。
本 Issue では Community に成果物設定（`artifactConfig`）を追加し、定時バッチが Claude Agent SDK で成果物を生成できる基盤を整える。
定時バッチへの Agent SDK 統合は後続 Issue（#333）。

## 2. スコープ（やること / やらないこと）

### やること
- ADR-0023 を追加（`artifactConfig` の概念・決定を正本化）
- ADR-0016 を Superseded に更新
- ADR-0017 の (e) 「直近マイルストーンをデフォルトで付与」→「マイルストーンは付与しない」に更新
- common: `ArtifactConfigSchema` + 定数 `COMMUNITY_ARTIFACT_INSTRUCTIONS_MAX_LENGTH` + `CommunitySchema` に `artifact_config` 追加 + `UpdateCommunitySchema` に `artifact_config` 追加
- server: Prisma マイグレーション（Community に `artifactConfig Json?` 追加）、リポジトリ更新、admin CRUD API 更新、OpenAPI レジストリ更新
- client: `CommunitiesTab.tsx` に成果物設定フォームフィールドを追加

### やらないこと
- 定時バッチでの Agent SDK 実行（#333）
- `Artifact` エンティティの永続化・カード表示（#334）
- `github-issue` 以外のスキル追加
- 予算アラート機能

## 3. 受け入れ条件（テストに落とせる粒度で箇条書き）

1. `COMMUNITY_ARTIFACT_INSTRUCTIONS_MAX_LENGTH = 500` がエクスポートされ、`ArtifactConfigSchema` で `instructions.max(500)` を検証する
2. `ArtifactConfigSchema` は `skills: z.array(z.enum(["github-issue"])).min(1)` を持つ
3. `CommunitySchema.artifact_config` が `null` または `{ skills, instructions? }` を受け入れる（optional: 未指定も可）
4. `UpdateCommunitySchema.artifact_config` に `null`（クリア）/ オブジェクト（設定）/ 省略（変更なし）を渡せる
5. admin PATCH `/api/admin/communities/:id` で `artifact_config: { skills: ["github-issue"] }` を設定・更新・クリアできる（200 返却）
6. `artifact_config` に 501 文字の `instructions` を渡すと 400 を返す
7. `artifact_config` に空の `skills` 配列を渡すと 400 を返す
8. client の `EditCommunityForm` に「GitHub Issue 自動起票」チェックボックスと `instructions` テキストフィールドが存在する
9. `pnpm turbo run build test lint` が全て緑

## 4. 設計方針（アーキ・データ構造・主要モジュール）

### common
```ts
export const COMMUNITY_ARTIFACT_INSTRUCTIONS_MAX_LENGTH = 500;

export const ArtifactConfigSchema = z.object({
  skills: z.array(z.enum(["github-issue"])).min(1),
  instructions: z.string().max(COMMUNITY_ARTIFACT_INSTRUCTIONS_MAX_LENGTH).optional(),
});
export type ArtifactConfig = z.infer<typeof ArtifactConfigSchema>;

// CommunitySchema に追加:
artifact_config: ArtifactConfigSchema.nullable().optional(),

// UpdateCommunitySchema に追加:
artifact_config: ArtifactConfigSchema.nullable().optional(),
```

### server: Prisma
```prisma
model Community {
  ...
  artifactConfig Json?   // null = 設定なし、JSON = ArtifactConfig
}
```

### server: CommunityRecord / リポジトリ
```ts
// communityRepository.ts に追加
import type { ArtifactConfig } from "@hatchery/common";

interface CommunityRecord {
  ...
  artifactConfig: ArtifactConfig | null;
}

interface UpdateCommunityRecordInput {
  ...
  artifactConfig?: ArtifactConfig | null;  // undefined = 変更なし、null = クリア
}
```

### server: admin.ts
- `toCommunityResponse` に `artifact_config: r.artifactConfig ?? undefined` を追加
- PATCH handler: `artifact_config` を `artifactConfig` に変換してリポジトリに渡す

### server: OpenAPI registry
- `UpdateCommunitySchema` を import・register
- admin community CRUD endpoints を追加

### client: CommunitiesTab.tsx
- `EditCommunityForm` の `useForm` に `artifactEnabled` / `artifactInstructions` フィールドを追加
- `artifactEnabled` で form.Field のチェックボックスを制御
- `artifactInstructions` に `inputProps={{ maxLength: 500 }}` の二重防御

## 5. 影響範囲 / 既存への変更

| 対象 | 変更内容 |
|------|----------|
| `common/src/domain/community/community.ts` | `ArtifactConfigSchema`・定数追加、`CommunitySchema`・`UpdateCommunitySchema` 更新 |
| `server/prisma/schema.prisma` | `Community.artifactConfig Json?` 追加 |
| `server/prisma/migrations/` | 新規マイグレーション |
| `server/src/persistence/communityRepository.ts` | `ArtifactConfig` import・`CommunityRecord`・インターフェース更新 |
| `server/src/persistence/prismaCommunityRepository.ts` | `toRecord`・CRUD 実装更新 |
| `server/src/routes/admin.ts` | `toCommunityResponse`・PATCH handler 更新 |
| `server/src/openapi/registry.ts` | `UpdateCommunitySchema` 登録・admin community ルート追加 |
| `client/src/components/CommunitiesTab.tsx` | `EditCommunityForm` に artifact_config フィールド追加 |

## 6. テスト計画（TDD で書くテスト一覧）

### common
- `COMMUNITY_ARTIFACT_INSTRUCTIONS_MAX_LENGTH` が 500 であること
- `ArtifactConfigSchema` で `skills: ["github-issue"]` が通ること
- `ArtifactConfigSchema` で空の skills 配列が拒否されること
- `ArtifactConfigSchema` で 500 文字の instructions が通ること
- `ArtifactConfigSchema` で 501 文字の instructions が拒否されること
- `CommunitySchema` に `artifact_config: null` が通ること
- `CommunitySchema` に `artifact_config` 省略が通ること
- `UpdateCommunitySchema` に `artifact_config: null` が通ること
- `UpdateCommunitySchema` に `artifact_config` 省略が通ること

### server (admin.communities.test.ts)
- PATCH で `artifact_config` を設定すると 200 で返却に含まれること
- PATCH で `artifact_config: null` でクリアできること
- PATCH で `artifact_config.instructions` が 501 文字なら 400 を返すこと
- PATCH で `artifact_config.skills` が空配列なら 400 を返すこと

### client (CommunitiesTab.test.tsx)
- `artifact_config` が null の community を表示したとき「GitHub Issue 自動起票」チェックボックスが未チェック
- `artifact_config` が設定済みの community を表示したとき「GitHub Issue 自動起票」チェックボックスがチェック済み

## 7. リスク・未決事項

- Prisma の `Json?` カラムは `Prisma.JsonValue | null` として返るため、`toRecord` で型アサーションが必要。書き込み時はバリデーション済みの Zod パース結果を渡すので安全。
- 既存行は `artifactConfig = null` として扱われ、既存バッチ動作には影響しない（後方互換）。
