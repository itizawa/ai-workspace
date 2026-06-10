import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * #188: ADR `.md` 正本を MDX ラッパーで表示する際、Markdown テーブルが崩れて
 * 表示されないバグの再発防止。`<pre>` ベタ貼りではなく MarkdownDoc 経由で描画していること。
 */
describe("ADR MDX ラッパーの描画方式（#188）", () => {
  const mdx = readFileSync(path.join(here, "0007.mdx"), "utf8");

  it("テーブル崩れの原因だった <pre> ベタ貼りを使っていない（AC3）", () => {
    expect(mdx).not.toContain("<pre");
  });

  it("MarkdownDoc を import して .md 正本を描画している（AC3）", () => {
    expect(mdx).toContain("MarkdownDoc");
    expect(mdx).toMatch(/<MarkdownDoc\s+content=\{content\}\s*\/>/);
  });
});
