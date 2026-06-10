# 設計書: 画面設計書で md のテーブルが崩れていて表示されない (#188)

## 1. 目的 / 背景

Storybook 上の「画面設計書 / ADR ページ」は、`.md` 正本ファイルを薄い MDX ラッパーで取り込んで表示している（ADR-0007 の設計方針）。
現状の取り込み実装（`docs/src/adr/0007.mdx`）は `?raw` で読み込んだ Markdown 文字列を **`<pre>` ブロックにそのまま流し込んでいる**ため、
Markdown の **テーブル（`| 列 | 列 |` / `| --- | --- |`）がパースされず、パイプ文字のままの生テキスト**として表示される。
結果として「テーブルが崩れて表示されない」状態になっている。ADR `.md` 正本（例: 0011 / 0014 / 0017）はテーブルを含むため、この影響を受ける。

## 2. スコープ（やること / やらないこと）

### やること

- `.md` 正本を取り込んで表示する際に、Markdown を **正しく HTML へレンダリングする**（特に GFM テーブルを `<table>` として描画する）共通コンポーネント `MarkdownDoc` を追加する。
- `docs/src/adr/0007.mdx` の `<pre>` ベタ貼りを `MarkdownDoc` での描画に置き換える。
- Markdown レンダリングに必要な依存（`markdown-to-jsx`）を `docs` ワークスペースへ追加する。

### やらないこと

- ADR / 設計書 `.md` 本文そのものの修正（テーブル記法は正しい。崩れているのは描画側）。
- 全 ADR の MDX ラッパー量産（本 Issue は描画の崩れ修正が目的。0007 の修正で再発防止パターンを確立する）。
- Markdown パーサの自作。実績ある軽量ライブラリ（`markdown-to-jsx`、単一依存・React 19 対応・GFM テーブル対応）を採用する。

## 3. 受け入れ条件（テストに落とせる粒度で箇条書き）

- AC1: `MarkdownDoc` に GFM テーブルを含む Markdown 文字列を渡すと、HTML の `<table>`（`<th>` / `<td>` を含む）として描画され、レンダリング結果にパイプ区切りの生テキスト（`| --- |`）が残らない。
- AC2: `MarkdownDoc` は見出し（`#`）・段落などテーブル以外の基本要素も描画できる（見出しテキストが本文として出力される）。
- AC3: `docs/src/adr/0007.mdx` がテーブル崩れの原因だった `<pre>` ベタ貼りを使っておらず、`MarkdownDoc` 経由で `.md` 正本を描画している。

## 4. 設計方針（アーキ・データ構造・主要モジュール）

- `docs/src/markdown/MarkdownDoc.tsx`: `markdown-to-jsx` の `Markdown` をラップする presentational コンポーネント。props は `content: string`。
  GFM テーブルを含む Markdown を React 要素ツリーへ変換して描画する。
- `markdown-to-jsx` を `docs/package.json` の dependencies に追加。React/DOM に依存する描画ロジックは `docs` に閉じる（依存方向の制約に反しない）。
- `0007.mdx`: `import content from "...md?raw"` はそのまま、`<pre>{content}</pre>` を `<MarkdownDoc content={content} />` に置換。

## 5. 影響範囲 / 既存への変更（対象ワークスペース: client / server / common / docs）

- `docs` のみ。client / server / common には変更なし（依存方向 docs → client/common を維持）。
- 追加: `docs/src/markdown/MarkdownDoc.tsx`、`docs/src/markdown/MarkdownDoc.test.tsx`、`docs/package.json` への依存追加。
- 変更: `docs/src/adr/0007.mdx`。

## 6. テスト計画（TDD で書くテスト一覧）

- `docs/src/markdown/MarkdownDoc.test.tsx`（Vitest + React Testing Library / jsdom）
  - GFM テーブル文字列を渡すと `<table>` がレンダリングされ、ヘッダセル・データセルのテキストが取得でき、`| --- |` の生テキストが残らない（AC1）。
  - 見出し・段落を含む Markdown でテーブル以外のテキストも描画される（AC2）。
- `0007.mdx` の検証は文字列検査テスト（`docs/src/adr/adr-mdx-render.test.ts`）で、`<pre>` を使わず `MarkdownDoc` を import/使用していることを確認（AC3）。

## 7. リスク・未決事項

- `docs` はこれまで jsdom テスト環境を持たない可能性がある → 必要なら Vitest 設定に `environment: "jsdom"` と RTL を追加する（client の設定を踏襲）。
- `markdown-to-jsx` は単一依存で副作用が小さく、React 19 と互換。新規依存追加だがオフラインでなければ取得可能。
