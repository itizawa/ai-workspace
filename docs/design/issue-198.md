# 設計書: Storybook の画面ストーリーが MSW モック不一致でログイン画面にリダイレクトされる問題を修正 (#198)

## 1. 目的 / 背景

`client/src/mocks/handlers.ts` のハンドラパスが `/api/` プレフィックスなしで登録されているため、API クライアント（`/api/` 始まり）のリクエストと一致せず、ルートガードが `/login` へリダイレクトしてしまう。ハンドラのパスを実パスに合わせることで Storybook の画面ストーリーが意図した画面を描画できるようにする。

## 2. スコープ（やること / やらないこと）

### やること
- `client/src/mocks/handlers.ts` の全ハンドラパスを `/api/` プレフィックス付きに修正
- `GET /api/messages` ハンドラを追加（現状欠落）
- `client/src/routes/LoginScene.stories.tsx` の `/auth/me` オーバーライドを `/api/auth/me` に修正
- Vitest テストでハンドラパスが API クライアントと一致することを自動検証

### やらないこと
- `HomeScene` / `AccountScene` の bare component 描画方式の見直し（別 Issue）
- Storybook `onUnhandledRequest` の `"error"` 変更（任意・本 Issue では対応しない）

## 3. 受け入れ条件（テストに落とせる粒度で箇条書き）

1. `handlers.ts` の各ハンドラパスが実 API パス（`/api/` 始まり）と一致する
2. `fetchMe()` が `handlers` にマッチしてモックデータを返す
3. `fetchChannels()` 相当が `handlers` にマッチしてモックデータを返す
4. `fetchSettings()` が `handlers` にマッチしてモックデータを返す
5. `fetchBatchLogs()` が `handlers` にマッチしてモックデータを返す
6. `GET /api/messages` ハンドラが存在し、モックデータを返す
7. `LoginScene.stories.tsx` の `/auth/me` オーバーライドが `/api/auth/me` になっている

## 4. 設計方針

### handlers.ts の修正

全ハンドラに `/api/` を前置する:

| 修正前 | 修正後 |
|--------|--------|
| `/auth/me` | `/api/auth/me` |
| `/channels` | `/api/channels` |
| `/channels/:channelId/messages` | `/api/channels/:channelId/messages` |
| `/admin/settings` | `/api/admin/settings` |
| `/admin/batch-logs` | `/api/admin/batch-logs` |
| `/auth/login` | `/api/auth/login` |
| `/auth/logout` | `/api/auth/logout` |
| `/auth/me` (PATCH) | `/api/auth/me` (PATCH) |
| （欠落） | `/api/messages` GET を追加 |

### テスト設計 (`handlers.test.ts`)

`msw/node` の `setupServer` にハンドラを載せ、API ラッパ関数（`fetchMe` / `fetchSettings` / `fetchBatchLogs`）を呼び出してモックデータが返ることを検証する。パスがずれれば fetch はハンドラにマッチせず失敗する。

## 5. 影響範囲 / 既存への変更

| 対象ファイル | 変更内容 |
|---|---|
| `client/src/mocks/handlers.ts` | 全パスに `/api/` 前置 + `/api/messages` 追加 |
| `client/src/routes/LoginScene.stories.tsx` | `/auth/me` → `/api/auth/me` |
| `client/src/mocks/handlers.test.ts` | 新規: MSW ハンドラパス整合性テスト |

## 6. テスト計画（TDDで書くテスト一覧）

`client/src/mocks/handlers.test.ts` に新規作成:

1. `fetchMe が handlers にマッチしてモック AuthUser を返す`
2. `fetchSettings が handlers にマッチしてモック設定を返す`
3. `fetchBatchLogs が handlers にマッチしてモックログを返す`
4. `GET /api/messages ハンドラが存在しモックデータを返す`
5. `POST /api/auth/login ハンドラが存在しモック AuthUser を返す`

## 7. リスク・未決事項

- `msw/node` は `undici` を使って Node.js の `fetch` をインターセプトする。jsdom 環境で `globalThis.fetch` を使う `openApiClient` と正しく組み合わさるか確認が必要（動かない場合は `vi.stubGlobal("fetch")` 方式に切り替え）。
