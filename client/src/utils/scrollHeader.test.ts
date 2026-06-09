import { describe, expect, it } from "vitest";
import { computeHeaderVisibility } from "./scrollHeader";

describe("computeHeaderVisibility", () => {
  it("下スクロールで非表示にする（delta > threshold）", () => {
    expect(computeHeaderVisibility(100, 200, 5, true)).toBe(false);
  });

  it("上スクロールで表示する（delta < -threshold）", () => {
    expect(computeHeaderVisibility(200, 100, 5, false)).toBe(true);
  });

  it("最上部（scrollTop=0）では表示する", () => {
    expect(computeHeaderVisibility(10, 0, 5, false)).toBe(true);
  });

  it("scrollTop が負値でも表示する（オーバースクロール）", () => {
    expect(computeHeaderVisibility(5, -3, 5, false)).toBe(true);
  });

  it("しきい値未満の微小スクロールでは表示状態を維持する（非表示中のまま）", () => {
    expect(computeHeaderVisibility(100, 103, 5, false)).toBe(false);
  });

  it("しきい値未満の微小スクロールでは表示状態を維持する（表示中のまま）", () => {
    expect(computeHeaderVisibility(100, 103, 5, true)).toBe(true);
  });

  it("ちょうど threshold に等しい delta は変化しない（境界値: 微小扱い）", () => {
    expect(computeHeaderVisibility(100, 105, 5, true)).toBe(true);
  });

  it("threshold を超えると下スクロールで非表示", () => {
    expect(computeHeaderVisibility(100, 106, 5, true)).toBe(false);
  });
});
