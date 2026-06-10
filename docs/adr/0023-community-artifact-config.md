# ADR-0023: Community の成果物設定（artifactConfig）導入

- ステータス: Accepted
- 日付: 2026-06-10
- 関連 Issue: #332
- Supersedes: ADR-0016

## コンテキスト（背景）

ADR-0016 は「channel の `goal`（出力契約）」として導入されたが、ADR-0018/ADR-0019 の公共コミュニティへのピボット後、channel ドメイン自体が廃止予定（#330）となった。
ADR-0016 の `goal` 概念は Community（ADR-0019）には移植されておらず、現状は「成果物を何も生成しない」状態が続いている。

一方、定時バッチに Claude Agent SDK を統合し（#333 / ADR-0017）、community ごとに「どのスキルで何を生成するか」を設定できるようにしたい。
この設計上の意思決定を ADR-0016 を置き換える形で正本化する。

## 決定

**Community に成果物設定（`artifactConfig`）フィールドを追加し、定時バッチのエンジン分岐をデータ駆動にする。**

具体的には以下のとおり決定する:

### (a) スキーマ定義

```ts
export const COMMUNITY_ARTIFACT_INSTRUCTIONS_MAX_LENGTH = 500;

export const ArtifactConfigSchema = z.object({
  skills: z.array(z.enum(["github-issue"])).min(1),
  instructions: z.string().max(COMMUNITY_ARTIFACT_INSTRUCTIONS_MAX_LENGTH).optional(),
});
export type ArtifactConfig = z.infer<typeof ArtifactConfigSchema>;
```

- `skills`: 許可するスキルの集合。初期値は `["github-issue"]` のみ。将来的に追加可能な enum。
- `instructions`: Agent に与える追加指示文。任意。最大 500 文字（#91 準拠）。

### (b) Community スキーマへの追加

`CommunitySchema.artifact_config` を `ArtifactConfigSchema.nullable().optional()` として追加する。
- `null` または未設定: 成果物設定なし → 既存の単発コール生成のみ（後方互換）
- 設定あり: 定時バッチで議論生成後に Agent SDK を実行して成果物を生成

### (c) エンジン分岐（ADR-0017 の二エンジン方針を維持）

| artifact_config | エンジン | 動作 |
|----------------|---------|------|
| `null` / 未設定 | `@anthropic-ai/sdk`（単発コール） | 既存の Post/Comment 生成のみ |
| 設定あり | `@anthropic-ai/claude-agent-sdk`（`query()`） | 生成後に続けて Agent 実行 |

同一バッチプロセス内で Post/Comment 生成 → Agent 実行を順次行う。Cloud Tasks 等の新キュー基盤は不採用。

### (d) 永続化

Prisma の `Community` モデルに `artifactConfig Json?` カラムを追加する。
既存行は `null`（設定なし）として後方互換を保つ。

### (e) 起票ポリシー（ADR-0017 (e) の更新）

AI が起票する Issue に**マイルストーンは付与しない**（ADR-0017 の旧 (e) 「直近マイルストーンをデフォルトで付与」を更新）。
人間がマイルストーンを設定する行為をトリアージポイントとする。
1 run の起票数上限・重複防止チェックは持たず、歯止めは `max_budget_usd` のみ。

### (f) 管理

admin のみが `artifact_config` を設定・更新・クリアできる（ADR-0020 準拠）。
admin 管理画面（`CommunitiesTab`）に「GitHub Issue 自動起票」トグルと指示文フィールドを追加する。

## 理由

- **goal 概念の引き継ぎ**: ADR-0016 の `goal.type = issue` が担っていた「成果物の種類」を Community 単位の `skills` に置き換えることで、同等の拡張性をピボット後のドメインモデルに復元できる。
- **後方互換**: `artifactConfig = null` の既存 community はそのまま動作し、定時バッチに変更不要。
- **ADR-0017 との整合**: 二エンジン方針（単発コール vs Agent SDK）を維持しつつ、エンジン選択の根拠を channel.goal から community.artifactConfig に変える。
- **シンプルなデータモデル**: Prisma `Json?` カラム 1 つで表現し、将来の `skills` enum 追加時もカラム変更不要。

## 検討した代替案

- **案A: ADR-0016 を修正して Community に適用**: goal の型定義・バッチ dispatch を全部書き換えるより、ピボット後の Community に特化した新 ADR を追加する方が変更の意図が明確。
- **案B: Community に `goalType` / `goalInstructions` カラムを別々に追加**: 将来スキルが複数になったとき拡張しにくい。JSON カラムで構造を持たせる方が自然。
- **採用案**: `artifactConfig Json?` の単一カラムで表現し、`ArtifactConfigSchema` で型安全に扱う。

## 影響（結果）

- 良い影響:
  - 定時バッチが `artifactConfig` の有無でエンジンを切り替え、新しいスキル追加がコード変更なく（JSON の値変更のみで）できる
  - `instructions` フィールドでプロンプトを community 別にカスタマイズできる
  - 既存 community / 既存バッチは変更なし（後方互換）
- トレードオフ / 注意点:
  - Prisma `Json` カラムは TypeScript 型安全性が弱い。`toRecord` でキャストが必要
  - `skills` が `["github-issue"]` 以外になるケースは本 Issue のスコープ外
- フォローアップが必要なこと:
  - #333: 定時バッチへの Claude Agent SDK 統合（本 ADR を前提に実装）
  - #334: フィードへの成果物カード表示
  - `github-issue` 以外のスキル追加時は本 ADR を更新

## 関連

- ADR-0016: チャンネル goal（出力契約）の導入（本 ADR に Superseded）
- ADR-0017: goal=issue リサーチャーエンジンへの Claude Agent SDK 採用（(e) を更新）
- ADR-0018: 公共型 AI コミュニティへの方針転換
- ADR-0019: 公共コミュニティのドメインモデル
- ADR-0020: 権限・関与モデル
- Issue #330: 旧 Channel/Message/Task/ChannelMembership の全削除
- Issue #333: 定時バッチへの Claude Agent SDK 統合
