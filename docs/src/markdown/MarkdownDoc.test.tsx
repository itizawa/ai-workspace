import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MarkdownDoc } from "./MarkdownDoc.js";

const TABLE_MD = `# 見出し

本文の段落です。

| 状態 | 説明     | ストーリー |
| ---- | -------- | ---------- |
| 通常 | 通常の例 | \`Default\` |
| 空   | 空の例   | \`Empty\`   |
`;

describe("MarkdownDoc", () => {
  it("GFM テーブルを HTML の <table> として描画する（AC1）", () => {
    const { container } = render(<MarkdownDoc content={TABLE_MD} />);

    // テーブル要素が描画される（パイプ区切りの生テキストではない）。
    const table = container.querySelector("table");
    expect(table).not.toBeNull();

    // ヘッダセル・データセルが table 要素として描画される。
    expect(container.querySelectorAll("th").length).toBe(3);
    expect(container.querySelectorAll("td").length).toBeGreaterThanOrEqual(6);

    // ヘッダ / セルのテキストが取得できる。
    expect(screen.getByText("状態")).toBeInTheDocument();
    expect(screen.getByText("通常")).toBeInTheDocument();
  });

  it("テーブル区切りの生テキスト（| --- |）が残らない（AC1）", () => {
    const { container } = render(<MarkdownDoc content={TABLE_MD} />);
    expect(container.textContent ?? "").not.toContain("----");
    expect(container.textContent ?? "").not.toContain("| 状態 |");
  });

  it("見出し・段落などテーブル以外の基本要素も描画する（AC2）", () => {
    const { container } = render(<MarkdownDoc content={TABLE_MD} />);

    const heading = screen.getByRole("heading", { name: "見出し" });
    expect(heading).toBeInTheDocument();
    expect(container.textContent ?? "").toContain("本文の段落です。");
  });
});
