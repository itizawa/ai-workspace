# 設計書: MUI コンポーネントを components/uiParts 腐敗防止層経由に統一し直接 import を ESLint で禁止 (#178)

## 1. 目的 / 背景

client コード全体に `@mui/material` への直接 import が拡散しており、MUI バージョンアップや差し替え時の影響範囲が広い。`client/src/components/uiParts/` を腐敗防止層（Anti-Corruption Layer）として設け、アプリコードは uiParts 経由のみで MUI を使う構造にする。ESLint で機械的に違反を検出しCI で防止する。

## 2. スコープ（やること / やらないこと）

**やること**
- `client/src/components/uiParts/index.ts` に現在使用中の全 MUI コンポーネントを再エクスポート
- `client/src` 配下のアプリコード（uiParts 自身・例外ファイルを除く）から `@mui/material/*` への直接 import を `components/uiParts` 経由に置き換え
- `eslint.config.mjs` に `@mui/*` 直接 import 禁止ルール（`no-restricted-imports`）を追加（uiParts・例外ファイルを除く）
- `tests/` にリポジトリ規約テストを追加し、ESLint ルールの動作を検証

**やらないこと**
- MUI コンポーネントの Props カスタマイズや共通スタイルの作り込み（最小限の再エクスポートのみ）
- `@mui/icons-material` の制限（現状未使用）
- uiParts での独自テーマ設定

## 3. 受け入れ条件（テストに落とせる粒度で箇条書き）

1. `client/src/components/uiParts/index.ts` が存在し、現在使用中の全 MUI コンポーネントを export している
2. `client/src` 配下のアプリコード（uiParts・例外ファイル除く）に `@mui/material*` への直接 import が存在しない
3. ESLint ルールが `client/src` 配下のアプリコードで `@mui/material*` 直接 import をエラーとして検出する
4. `client/src/components/uiParts/**` は ESLint ルールの対象外（直接 import 可）
5. `client/src/theme.ts`・`client/src/AppRoot.tsx` は ESLint ルールの例外（createTheme/ThemeProvider/CssBaseline/Theme 型の import が通る）
6. `tests/` のリポジトリ規約テストで、違反パターンが ESLint エラーになることを検証
7. `pnpm turbo run build test lint` が緑

## 4. 設計方針（アーキ・データ構造・主要モジュール）

### uiParts の実装方式: **再エクスポート（pass-through）**

Issue の要件は「UI ライブラリへの依存を uiParts に集約」であり、現時点で独自 Props やスタイルの共通化は不要。最小コストで実現するため、`uiParts/index.ts` から MUI コンポーネントをそのまま `export { X } from "@mui/material/X"` で再エクスポートする。

将来的に共通 Props を追加したい場合は uiParts 内にラッパーファイルを追加し、index.ts の export 先を変えるだけで対応できる。

### 例外ファイル（@mui 直接 import を許可）

| ファイル | 許可する理由 | 許可するもの |
|---------|------------|------------|
| `client/src/components/uiParts/**` | ACL 自身が MUI を束ねる層 | @mui/* |
| `client/src/theme.ts` | MUI テーマ設定基盤 | @mui/material/styles |
| `client/src/AppRoot.tsx` | ThemeProvider + CssBaseline のエントリ | @mui/material/styles, @mui/material/CssBaseline |

### ESLint ルール設計

`no-restricted-imports` の `patterns` に `@mui/material` / `@mui/material/*` を追加。既存の `@hatchery/server` 制限と統合し、例外ファイルは ESLint の `files` override で対象外にする。

### 使用中の MUI コンポーネント（uiParts で re-export する全部品）

Alert, Avatar, Box, Button, Chip, CircularProgress, FormControl, FormControlLabel, FormLabel, InputLabel, Link, List, ListItem, ListItemButton, ListItemText, MenuItem, Popover, Radio, RadioGroup, Select, Skeleton, Snackbar, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography, useMediaQuery

## 5. 影響範囲 / 既存への変更

対象ワークスペース: **client** のみ

変更ファイル:
- 新規: `client/src/components/uiParts/index.ts`
- 変更: `eslint.config.mjs`（ルール追加）
- 変更: MUI 直接 import している 18 ファイル（import パス置換）
- 新規: `tests/mui-boundary.test.ts`（リポジトリ規約テスト）

## 6. テスト計画（TDD で書くテスト一覧）

`tests/mui-boundary.test.ts` に追加（`dependency-direction.test.ts` と同じ ESLint ハーネスを使用）:

1. **違反検出（負ケース）**: `client/src/bad.ts` で `import Box from "@mui/material/Box"` → ESLint エラーになる
2. **違反検出（バレルパス）**: `client/src/bad2.ts` で `import { Box } from "@mui/material"` → ESLint エラーになる
3. **uiParts 自身は許可（正ケース）**: `client/src/components/uiParts/index.ts` で `import Box from "@mui/material/Box"` → エラーにならない
4. **theme.ts は許可（正ケース）**: `client/src/theme.ts` で `import { createTheme } from "@mui/material/styles"` → エラーにならない
5. **AppRoot.tsx は許可（正ケース）**: `client/src/AppRoot.tsx` で `import CssBaseline from "@mui/material/CssBaseline"` → エラーにならない
6. **uiParts 経由は許可（正ケース）**: `client/src/bad.ts` で `import { Box } from "./components/uiParts"` → エラーにならない

## 7. リスク・未決事項

- `no-restricted-imports` は import 文のテキスト（モジュール指定子）を見るため、動的 import には適用されない。ただし現コードに動的 MUI import は存在しないため問題なし。
- 既存の `no-restricted-imports` ルールと競合しないよう `files` override を正しく配置する。既存ルールは `@hatchery/*` パッケージ名の遮断を目的としており、MUI ルールと直交しているため競合しない。
