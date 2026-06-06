# 設計書: 招待リンクの発行・管理 UI（設定画面の招待タブ）を実装する (#133)

## 1. 目的 / 背景

#131 で実装された招待リンク API（`POST /admin/invitations` / `GET /admin/invitations` / `POST /admin/invitations/:id/revoke`）を管理者が画面から操作できる UI を設定画面に追加する。

## 2. スコープ（やること / やらないこと）

**やること**:
- `SettingsScene` に「招待」タブ（`?tab=invitations`）を追加
- 招待リンク発行フォーム（有効期限プリセット選択 + 任意メモ）
- 発行後に招待 URL をコピーできる表示（Snackbar フィードバック付き）
- 招待一覧テーブル（ステータス Chip 色分け・失効ボタン）
- `client/src/api/invitations.ts` に TanStack Query フック

**やらないこと**:
- 招待 API 本体（#131 で実装済み）
- 受諾（新規登録）画面（後続 Issue）
- メール送信・再送機能

## 3. 受け入れ条件（テストに落とせる粒度で箇条書き）

- `useInvitations` / `useCreateInvitation` / `useRevokeInvitation` が `openApiClient` 経由で実装され、生 `fetch` / `as` キャストなし
- `SettingsScene` に「招待」タブが表示され、`?tab=invitations` で開くとアクティブになる
- 発行フォームで有効期限を選んで「発行」ボタンを押すと一覧が更新される
- 発行後に招待 URL が表示され、コピーボタン押下で `navigator.clipboard.writeText` が呼ばれる
- コピー時に Snackbar フィードバックが表示される
- 一覧にステータス Chip（active=緑 / used=灰 / expired=橙 / revoked=赤）が表示される
- `active` 状態の招待のみ「失効」ボタンが活性化される
- 失効後に一覧のステータスが `revoked` になる（queryInvalidate で反映）
- メモ入力に `inputProps={{ maxLength: 200 }}` が設定されている
- `pnpm test`（client）が緑

## 4. 設計方針（アーキ・データ構造・主要モジュール）

### 期限プリセット → expiresInHours のマッピング

```ts
const EXPIRY_PRESETS = [
  { label: "1時間", value: 1 },
  { label: "24時間", value: 24 },
  { label: "7日間", value: 24 * 7 },
  { label: "30日間", value: 24 * 30 },
] as const;
```

### 受諾画面 URL の形（仮決め・#134 で確定）

`${window.location.origin}/invite/${token}`

`/invite` ルートは #134（受諾画面 Issue）で追加予定。URL パスは実装後に合わせて調整する。

### ステータス色分けの規約

| ステータス | MUI color | 日本語ラベル |
|-----------|-----------|------------|
| active    | success   | 有効        |
| used      | default   | 使用済み     |
| expired   | warning   | 期限切れ    |
| revoked   | error     | 失効済み    |

### API クライアント設計

`openApiClient` 経由でレスポンスを `InvitationSchema` でランタイム検証する（batchLogs.ts と同パターン）。

## 5. 影響範囲 / 既存への変更

- `client/src/api/invitations.ts`（新規）
- `client/src/routes/settingsTabValues.ts`（`"invitations"` 追加）
- `client/src/routes/SettingsScene.tsx`（InvitationsTab コンポーネント + SETTINGS_TABS 追加）
- `client/src/api/invitations.test.ts`（新規）
- `client/src/routes/SettingsScene.test.tsx`（招待タブテスト追加）
- `docs/design/issue-133.md`（本ファイル）

## 6. テスト計画（TDDで書くテスト一覧）

### `client/src/api/invitations.test.ts`
- `fetchInvitations` が openApiClient 経由で GET する
- `fetchInvitations` が非 2xx で例外を投げる
- `createInvitation` が openApiClient 経由で POST する
- `createInvitation` が非 2xx で例外を投げる
- `revokeInvitation` が openApiClient 経由で POST する
- `revokeInvitation` が非 2xx で例外を投げる

### `client/src/routes/SettingsScene.test.tsx`（追記）
- `?tab=invitations` で開くと「招待」タブがアクティブになる
- 「招待」タブをクリックすると URL が `?tab=invitations` になる
- InvitationsTab: 発行ボタン押下で createInvitation が呼ばれる
- InvitationsTab: 発行後に招待 URL が表示される
- InvitationsTab: コピーボタン押下で navigator.clipboard.writeText が呼ばれる
- InvitationsTab: 一覧にステータス Chip が表示される
- InvitationsTab: active 状態の招待のみ「失効」ボタンが活性
- InvitationsTab: 失効ボタン押下で revokeInvitation が呼ばれる

## 7. リスク・未決事項

- 受諾画面 URL（`/invite/:token`）は #134 実装時に合わせて調整が必要（仮決めで実装）
- `openapi.gen.ts` はビルド時生成のため、CI では `pnpm --filter @hatchery/server openapi && pnpm --filter @hatchery/client gen-types` を先行実行する必要がある（Turborepo で保証済み）
