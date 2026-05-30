import { describe, expect, it } from "vitest";

import { total } from "./index.js";

describe("@hatchery/client", () => {
  it("パッケージ API（docs/Storybook 契約用の純粋関数）を公開する", () => {
    expect(total(4, 5)).toBe(9);
  });
});
