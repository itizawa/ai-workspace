# 設計書: 認可モデルを ABAC（属性ベースアクセス制御）に定める ADR を追加する (#169)

## 1. 目的 / 背景

現行の権限管理は RBAC（`admin` / `member` 2 ロール）で、チャンネル単位アクセス・本人限定操作など「ロール 1 軸では表現しきれない判定」が今後増える。認可モデルを ABAC に定める ADR-0014 を作成し、後続の実装 Issue が参照できる正本を用意する。

## 2. スコープ（やること / やらないこと）

**やること:**
- `docs/adr/0014-authorization-abac.md` を MADR 風フォーマットで作成（ステータス: Accepted）
- `docs/adr/README.md` の一覧表に 0014 の行を追加
- ADR 体裁を検証する規約テスト `tests/adr-authorization-abac.test.ts` を追加

**やらないこと:**
- ABAC ポリシー評価関数の実装（`common` への追加）
- `server/src/middleware/requireAdmin.ts` の置換
- client ガードの変更
- その他 ADR 以外のコード変更

## 3. 受け入れ条件（テストに落とせる粒度で箇条書き）

1. `docs/adr/0014-authorization-abac.md` が存在し、ステータス `Accepted`・関連 Issue `#169` を含む
2. MADR 必須セクション（コンテキスト / 決定 / 理由 / 検討した代替案 / 影響（結果））をすべて含む
3. ABAC 固有内容（ABAC・属性モデル・subject/resource/action・移行方針）を含む
4. 代表ポリシー例 3 つ（管理操作・チャンネル単位・ownerId 本人限定）の記述がある
5. `docs/adr/README.md` に `[0014](./0014-authorization-abac.md)` 形式の行がある
6. `pnpm test:repo` が全緑（新規テスト含む）
7. `pnpm turbo run test`・`pnpm turbo run lint` が全緑

## 4. 設計方針（アーキ・データ構造・主要モジュール）

- ADR は `docs/adr/template.md` の MADR 風フォーマットに準拠
- 属性モデルは 4 要素（subject / resource / action / environment）で定義
- ポリシー評価の置き場は `common` の純粋関数（依存方向 client→common / server→common を遵守）
- 現行 `isAdmin` は「admin ロール判定」として継続し、ABAC ポリシーに吸収される移行方針を記述

## 5. 影響範囲 / 既存への変更

- **docs のみ**: `docs/adr/0014-authorization-abac.md`（新規）、`docs/adr/README.md`（1 行追加）
- **tests のみ**: `tests/adr-authorization-abac.test.ts`（新規）
- common / server / client のコードは一切変更しない

## 6. テスト計画（TDD で書くテスト一覧）

`tests/adr-authorization-abac.test.ts`:

- ADR ファイル存在チェック（`0014-*.md` が 1 件）
- メタ情報チェック（ステータス / 日付 / 関連 Issue #169）
- MADR 必須セクション見出しチェック（5 見出し）
- ABAC 固有キーワードチェック（ABAC, subject, resource, action, 属性モデル）
- 移行方針チェック（isAdmin / RBAC への言及）
- 代表ポリシー例チェック（ownerId）
- README 一覧チェック（0014 行）

## 7. リスク・未決事項

- なし（ADR のみで実装コードを変更しないため、リスクは最小）
- 後続 Issue として ABAC ポリシー評価関数の実装・middleware 置換・client ガードを起票する旨を ADR に明記する
