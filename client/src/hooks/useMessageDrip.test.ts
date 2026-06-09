import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DRIP_INTERVAL_MS, TYPING_DURATION_MS } from "../utils/messageDrip";
import { useMessageDrip } from "./useMessageDrip";

// id 付きメッセージの最小形（永続化形 MessageRecord 相当）。
const m = (id: string, employeeId = "haru") => ({
  id,
  createdEmployeeId: employeeId,
  channel: "zatsudan",
  text: id,
});

describe("useMessageDrip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初回ロードの過去ログは即時に全件可視（ドリップしない・AC-3）", () => {
    const messages = [m("a"), m("b"), m("c")];
    const { result } = renderHook(() => useMessageDrip(messages, false));

    // 初回 commit 時点で全件可視・タイピングなし。
    expect(result.current.isVisible("a")).toBe(true);
    expect(result.current.isVisible("b")).toBe(true);
    expect(result.current.isVisible("c")).toBe(true);
    expect(result.current.typingKey).toBeNull();
  });

  it("初回ロード後に増えた新着のみ時間差で 1 件ずつ可視化する（AC-1）", () => {
    const initial = [m("a"), m("b")];
    const { result, rerender } = renderHook(
      ({ messages }: { messages: ReturnType<typeof m>[] }) => useMessageDrip(messages, false),
      { initialProps: { messages: initial } },
    );

    // 初回は a,b が即時可視。
    expect(result.current.isVisible("a")).toBe(true);
    expect(result.current.isVisible("b")).toBe(true);

    // 新着 c,d が増える。
    rerender({ messages: [m("a"), m("b"), m("c"), m("d")] });

    // まだ新着は不可視。
    expect(result.current.isVisible("c")).toBe(false);
    expect(result.current.isVisible("d")).toBe(false);

    // タイピング表示時間が経過すると最初の新着が可視になる。
    act(() => {
      vi.advanceTimersByTime(TYPING_DURATION_MS);
    });
    expect(result.current.isVisible("c")).toBe(true);
    // 次の新着はまだ。
    expect(result.current.isVisible("d")).toBe(false);

    // 次のドリップ間隔 + タイピング表示時間で 2 件目が可視になる。
    act(() => {
      vi.advanceTimersByTime(DRIP_INTERVAL_MS + TYPING_DURATION_MS);
    });
    expect(result.current.isVisible("d")).toBe(true);
    // すべて出し切ったらタイピングは消える。
    expect(result.current.typingKey).toBeNull();
  });

  it("新着出現前にその発言者のタイピングインジケータを表示する（AC-2）", () => {
    const { result, rerender } = renderHook(
      ({ messages }: { messages: ReturnType<typeof m>[] }) => useMessageDrip(messages, false),
      { initialProps: { messages: [m("a", "haru")] } },
    );

    rerender({ messages: [m("a", "haru"), m("b", "ken")] });

    // 本文が出る前に、新着 b のキーがタイピング中になっている。
    expect(result.current.typingKey).toBe("b");
    expect(result.current.isVisible("b")).toBe(false);

    // タイピング時間経過で本文が可視になりタイピングは解除。
    act(() => {
      vi.advanceTimersByTime(TYPING_DURATION_MS);
    });
    expect(result.current.isVisible("b")).toBe(true);
    expect(result.current.typingKey).toBeNull();
  });

  it("reduced-motion 時は新着も即時表示しタイピングを出さない（AC-4）", () => {
    const { result, rerender } = renderHook(
      ({ messages }: { messages: ReturnType<typeof m>[] }) => useMessageDrip(messages, true),
      { initialProps: { messages: [m("a")] } },
    );

    rerender({ messages: [m("a"), m("b"), m("c")] });

    // 即時に全件可視・タイピングなし（タイマーを進めない）。
    expect(result.current.isVisible("b")).toBe(true);
    expect(result.current.isVisible("c")).toBe(true);
    expect(result.current.typingKey).toBeNull();
  });
});
