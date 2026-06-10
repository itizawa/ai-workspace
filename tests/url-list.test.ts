import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const urlListPath = path.join(repoRoot, "docs", "design", "url-list.md");
const designDir = path.join(repoRoot, "docs", "design");
const routerPath = path.join(repoRoot, "client", "src", "router.tsx");

function urlListBody(): string {
  return readFileSync(urlListPath, "utf8");
}

/** Markdown テーブルの行（| ... | ... | 形式）だけを抽出する。 */
function tableRows(body: string): string[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));
}

/** テーブル行を | 区切りのセル配列に分解する（前後の空セルを除去）。 */
function splitCells(row: string): string[] {
  return row
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

/** router.tsx から path: "..." で宣言されたルートパスをすべて抽出する。 */
function routerPaths(): string[] {
  const src = readFileSync(routerPath, "utf8");
  const matches = [...src.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
  return [...new Set(matches)];
}

describe("docs/design/url-list.md（受け入れ条件 #105）", () => {
  it("ファイルが存在する", () => {
    expect(existsSync(urlListPath), "docs/design/url-list.md が存在する").toBe(true);
  });

  it("5 列（URL/パス・画面名・概要・認証・設計書）を持つ Markdown テーブルがある", () => {
    const rows = tableRows(urlListBody());
    expect(rows.length, "テーブル行が存在する").toBeGreaterThan(0);

    const header = splitCells(rows[0]);
    expect(header).toHaveLength(5);
    const joined = header.join(" ");
    expect(joined).toMatch(/URL|パス/);
    expect(joined).toContain("画面名");
    expect(joined).toContain("概要");
    expect(joined).toContain("認証");
    expect(joined).toContain("設計書");
  });

  it("URL 列の表記が $param 形式に統一されている（:param / {param} の混在がない）", () => {
    const rows = tableRows(urlListBody());
    // 先頭2行（ヘッダ + 区切り）を除いたデータ行の URL 列を検査
    const dataRows = rows.slice(2);
    expect(dataRows.length).toBeGreaterThan(0);
    for (const row of dataRows) {
      const url = splitCells(row)[0];
      // URL セルからインラインコードのバッククォートを除去して検査
      const bare = url.replace(/`/g, "");
      expect(bare, `表記ゆれ :param が含まれない: ${url}`).not.toMatch(/\/:[A-Za-z]/);
      expect(bare, `表記ゆれ {param} が含まれない: ${url}`).not.toMatch(/\{[A-Za-z]+\}/);
    }
  });

  it("設計書列の相対リンク先（./issue-<N>.md）がすべて docs/design に実在する", () => {
    const links = [...urlListBody().matchAll(/\(\.\/(issue-\d+\.md)\)/g)].map((m) => m[1]);
    expect(links.length, "設計書への相対リンクが 1 件以上ある").toBeGreaterThan(0);
    for (const link of links) {
      expect(
        existsSync(path.join(designDir, link)),
        `リンク先 docs/design/${link} が実在する`,
      ).toBe(true);
    }
  });

  it("router.tsx の全ルートパスがテーブルの URL 列に含まれている", () => {
    const body = urlListBody();
    for (const route of routerPaths()) {
      expect(body, `ルート ${route} がテーブルに記載されている`).toContain(route);
    }
  });

  it("冒頭に単一情報源（目次）・1 行追加の運用方針が明記されている", () => {
    const body = urlListBody();
    expect(body).toMatch(/単一情報源|目次/);
    expect(body).toMatch(/1\s*行(を)?追加|一行(を)?追加/);
  });
});
