# 設計書: サイドバーのチャンネル作成をアイコンボタン＋モーダルに変更する (#177)

## 1. 目的 / 背景

現状のサイドバーには `AddChannelForm` が常時展開されており、Slack 風 UI のガイドライン（concept.md）と乖離している。アイコンボタン押下でモーダルが開く方式に変更し、サイドバーをすっきりさせる。

## 2. スコープ（やること / やらないこと）

**やること:**
- `AddChannelForm.tsx` を「アイコンボタン＋モーダル」構成に全面改修
- `uiParts/index.ts` に `Dialog` / `DialogTitle` / `DialogContent` / `DialogActions` / `IconButton` / `Tooltip` を追加
- `RootLayout.tsx` はそのまま維持（`<AddChannelForm />` のマウントは変えない）
- `AddChannelForm.test.tsx` を新しい UI フローに合わせて更新

**やらないこと:**
- チャンネルタイプの増設・フォーム項目追加
- チャンネル編集・削除 UI
- `client/src/api/channels.ts` / `common` のスキーマ変更

## 3. 受け入れ条件（テストに落とせる粒度）

1. ログイン時はサイドバーにフォームが DOM 上に展開**されていない**（`queryByRole("button", { name: "追加" })` が null）
2. `aria-label="チャンネル作成"` の IconButton が表示される
3. `Tooltip` ラベル「チャンネル作成」を持つ
4. IconButton クリック → Dialog が開き、チャンネル名入力・タイプ選択・送信ボタンが表示される
5. 送信 → `useCreateChannel` mutation が走り、成功時に Dialog が閉じる
6. キャンセル/閉じるボタン → Dialog が閉じ mutation は走らない
7. 未ログイン時は IconButton も表示されない
8. バリデーション（`maxLength`）は変わらず維持する

## 4. 設計方針

### コンポーネント構成

`AddChannelForm.tsx` を以下の構成に改修する:

```
AddChannelForm（export）
  └─ IconButton（aria-label="チャンネル作成"）+ Tooltip
  └─ Dialog（open = useState）
       └─ DialogTitle: "チャンネル作成"
       └─ DialogContent: TextField + RadioGroup（既存フォームロジック）
       └─ DialogActions: キャンセルボタン + 送信ボタン
```

- `open` 状態を `useState<boolean>` で保持
- `handleClose()` で閉じる（キャンセル・背景クリック共通）
- `onSuccess` コールバックで `setOpen(false)` + `setLabel("")`
- フォームは `<Box component="form" onSubmit={handleSubmit}>` を Dialog 内に配置

### uiParts への追加

```ts
export { default as Dialog } from "@mui/material/Dialog";
export { default as DialogActions } from "@mui/material/DialogActions";
export { default as DialogContent } from "@mui/material/DialogContent";
export { default as DialogTitle } from "@mui/material/DialogTitle";
export { default as IconButton } from "@mui/material/IconButton";
export { default as Tooltip } from "@mui/material/Tooltip";
```

アイコンは `@mui/icons-material/Add`（`@mui/icons-material` を新規追加）。

### `RootLayout.tsx` への変更

変更不要。現状の `<AddChannelForm />` マウントをそのまま維持する。

## 5. 影響範囲

- `client/src/components/AddChannelForm.tsx`（全面改修）
- `client/src/components/uiParts/index.ts`（6 エクスポート追加）
- `client/src/components/AddChannelForm.test.tsx`（テスト更新）
- `client/package.json`（`@mui/icons-material` 追加）
- `client/src/routes/RootLayout.tsx`（変更なし）

## 6. テスト計画（TDD）

`AddChannelForm.test.tsx` で以下をテスト:

| テスト | 検証内容 |
|--------|----------|
| 未ログイン時は何も表示しない | `container` が空 |
| ログイン時はアイコンボタンを表示する | `aria-label="チャンネル作成"` の button が見える |
| ログイン時はフォームを常時表示しない | `queryByRole("button", { name: "追加" })` が null |
| アイコンボタンクリックで Dialog が開く | `findByRole("dialog")` 成功、「追加」ボタンが findBy で取得できる |
| Dialog 内で送信すると mutation が走りダイアログが閉じる | fetch が呼ばれ、dialog が消える |
| キャンセルボタンで Dialog が閉じる | dialog が消え fetch は呼ばれない |

## 7. リスク・未決事項

- `@mui/icons-material` を新規追加（`^6.1.10`）。
- MUI Dialog はデフォルトで `role="dialog"` を付与するため、RTL の `findByRole("dialog")` で取得可能。
- jsdom 環境での Tooltip は hover なしで内容が現れないケースがあるため、受け入れ条件 3 のテストは `aria-label` で代替する。
