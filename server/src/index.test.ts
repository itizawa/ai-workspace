import { describe, expect, it } from "vitest";

import { sum } from "./index.js";

describe("@hatchery/server", () => {
  it("placeholder の sum が合計を返す（実体は #6 で差し替え）", () => {
    expect(sum(2, 3)).toBe(5);
  });
});
