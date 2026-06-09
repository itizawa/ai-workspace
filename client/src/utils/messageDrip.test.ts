import { describe, expect, it } from "vitest";

import { computeDrip, messageDripKey } from "./messageDrip";

// テスト用に「id を持つメッセージ」の最小形を作る。
const m = (id: string) => ({ id, createdEmployeeId: "haru", channel: "zatsudan", text: id });

describe("messageDripKey", () => {
  it("id があれば id を返す", () => {
    expect(messageDripKey(m("a"), 0)).toBe("a");
  });

  it("id が無ければ index ベースのキーを返す（fixture フォールバック）", () => {
    const withoutId = { createdEmployeeId: "haru", channel: "zatsudan", text: "x" };
    expect(messageDripKey(withoutId, 3)).toBe("idx-3");
  });
});

describe("computeDrip", () => {
  it("初回（displayed が null）は全件を即時表示済みとして返し、新着キューは空", () => {
    const messages = [m("a"), m("b"), m("c")];
    const result = computeDrip(messages, null);
    expect(result.visibleKeys).toEqual(new Set(["a", "b", "c"]));
    expect(result.queue).toEqual([]);
    expect(result.allKeys).toEqual(["a", "b", "c"]);
  });

  it("既存表示済みに対して新規 id が増えたら、新着分だけを時系列順でキューに積む", () => {
    const messages = [m("a"), m("b"), m("c"), m("d")];
    const displayed = new Set(["a", "b"]);
    const result = computeDrip(messages, displayed);
    // 既に表示済みの a,b は可視。新着 c,d はまだ不可視でキューに入る。
    expect(result.visibleKeys).toEqual(new Set(["a", "b"]));
    expect(result.queue).toEqual(["c", "d"]);
  });

  it("新着が無ければキューは空・可視集合は表示済みのまま", () => {
    const messages = [m("a"), m("b")];
    const displayed = new Set(["a", "b"]);
    const result = computeDrip(messages, displayed);
    expect(result.queue).toEqual([]);
    expect(result.visibleKeys).toEqual(new Set(["a", "b"]));
  });

  it("immediate=true（reduced-motion 等）のときは新着も即時に可視化しキューは空", () => {
    const messages = [m("a"), m("b"), m("c")];
    const displayed = new Set(["a"]);
    const result = computeDrip(messages, displayed, { immediate: true });
    expect(result.visibleKeys).toEqual(new Set(["a", "b", "c"]));
    expect(result.queue).toEqual([]);
  });

  it("表示順（時系列）はメッセージ配列の順序を維持する", () => {
    const messages = [m("a"), m("b"), m("c")];
    const result = computeDrip(messages, new Set(["a"]));
    expect(result.queue).toEqual(["b", "c"]);
    expect(result.allKeys).toEqual(["a", "b", "c"]);
  });
});
