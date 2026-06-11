import type { ReactElement } from "react";
import Markdown from "markdown-to-jsx";

export interface MarkdownDocProps {
  /** 表示する Markdown 正本（`.md?raw` で読み込んだ文字列を想定）。 */
  content: string;
}

/**
 * `.md` 正本（ADR / 画面設計書）を Storybook 上で表示するための共通コンポーネント。
 *
 * 以前は `?raw` で読み込んだ Markdown を `<pre>` にベタ貼りしていたため、
 * GFM テーブル（`| 列 | 列 |`）がパースされず生のパイプ文字として表示され崩れていた（#188）。
 * `markdown-to-jsx` で Markdown を正しく HTML（`<table>` / 見出し / 段落等）へ変換して描画する。
 */
export function MarkdownDoc({ content }: MarkdownDocProps): ReactElement {
  return (
    <div className="markdown-doc">
      <Markdown>{content}</Markdown>
    </div>
  );
}
