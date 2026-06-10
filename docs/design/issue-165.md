# 設計書: ロボットのドット絵 favicon (SVG) を設定する (#165)

## 1. 目的 / 背景

現在 client にはファビコンが一切設定されていない。`client/index.html` の `<head>` に favicon の `<link>` が無く、ブラウザタブには汎用アイコンが表示される。プロダクト「Hatchery」（AI ワーカーを眺める観察エンタメ・`concept.md`）の識別性・ブランド感を高めるため、AI ワーカー（ロボット）をモチーフにしたドット絵調の自作 SVG ファビコンを用意する。

## 2. スコープ（やること / やらないこと）

### やること

- `client/public/favicon.svg` を新規作成（ロボットのドット絵調・自己完結 SVG）。
- `client/index.html` の `<head>` に SVG favicon の `<link>` を追加。
- favicon の存在・妥当性・link 追加を検証する client テストを追加。

### やらないこと（スコープ外）

- PNG/ICO フォールバック、apple-touch-icon、PWA manifest、複数サイズ対応、アニメーション。
- client 以外のワークスペースへの変更。

## 3. 受け入れ条件（テストに落とせる粒度）

1. `client/public/favicon.svg` が存在する。
2. favicon.svg のルートが `<svg>` 要素で `viewBox` 属性を持つ（well-formed・自己完結）。
3. favicon.svg がドット絵を構成する `<rect>` を複数含む（外部画像・フォント・スクリプトに依存しない）。
4. favicon.svg の配色に Slack 風テーマの primary（`#1164A3`）/ sidebar 系暗色（`#26334D`）が含まれる。
5. `client/index.html` の `<head>` に `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` が存在する。

## 4. 設計方針

- 24x24 グリッドの `viewBox="0 0 24 24"` を採用し、整数座標で `<rect>` を並べてロボットの顔（四角い頭・アンテナ・目・口）を表現する。ピクセルがにじまないよう整数座標・整数サイズで配置。
- 背景に丸み付きの暗色セル（`#26334D`）を敷き、白タブ・暗タブどちらでも輪郭が視認できるようにする。頭部・顔パーツは primary `#1164A3` と白系で構成しコントラストを確保。
- 外部参照（画像・フォント・スクリプト）を一切持たない純粋な `<rect>` ベースの SVG とする。

## 5. 影響範囲 / 既存への変更

- 対象ワークスペース: **client のみ**。
  - 新規: `client/public/favicon.svg`
  - 変更: `client/index.html`（`<head>` に link 1 行追加）
  - 新規: `client/src/test/favicon.test.ts`（検証テスト）
- 依存方向（client → common）に影響なし。common/server/docs は触らない。

## 6. テスト計画（TDD で書くテスト）

`client/src/test/favicon.test.ts`（既存 `indexHtmlOgp.test.ts` と同様に cwd 起点でファイル読込）:

- `client/public/favicon.svg` が存在する。
- favicon.svg がルート `<svg ...>` を持ち `viewBox` 属性を含む。
- favicon.svg が複数の `<rect` を含む。
- favicon.svg が `#1164A3` と `#26334D` を含む。
- favicon.svg が外部依存（`<image`・`<script`・`url(`・`http`）を含まない。
- `index.html` に `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` が存在する。

## 7. リスク・未決事項

- ドット絵の見た目は主観的だが、受け入れ条件は構造（rect グリッド・配色・自己完結）で機械検証する。
- 16x16 ではなく 24x24 を採用（顔パーツの表現自由度を確保）。受け入れ条件は「16 もしくは 24 程度」を許容しているため逸脱なし。
