import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHideOnScroll } from "./useHideOnScroll";

const makeScrollEvent = (scrollTop: number) =>
  ({ currentTarget: { scrollTop } }) as unknown as React.UIEvent<HTMLElement>;

describe("useHideOnScroll", () => {
  it("初期状態では visible=true", () => {
    const { result } = renderHook(() => useHideOnScroll());
    expect(result.current.visible).toBe(true);
  });

  it("下方向スクロールで visible が false になる", () => {
    const { result } = renderHook(() => useHideOnScroll(5));

    act(() => {
      result.current.onScroll(makeScrollEvent(100));
    });

    expect(result.current.visible).toBe(false);
  });

  it("上方向スクロールで visible が true に戻る", () => {
    const { result } = renderHook(() => useHideOnScroll(5));

    act(() => {
      result.current.onScroll(makeScrollEvent(100));
    });
    act(() => {
      result.current.onScroll(makeScrollEvent(50));
    });

    expect(result.current.visible).toBe(true);
  });

  it("最上部（scrollTop=0）まで戻ると visible が true になる", () => {
    const { result } = renderHook(() => useHideOnScroll(5));

    act(() => {
      result.current.onScroll(makeScrollEvent(100));
    });
    act(() => {
      result.current.onScroll(makeScrollEvent(0));
    });

    expect(result.current.visible).toBe(true);
  });

  it("しきい値未満の微小スクロールでは状態を維持する", () => {
    const { result } = renderHook(() => useHideOnScroll(5));

    // まず下スクロールで hidden にする
    act(() => {
      result.current.onScroll(makeScrollEvent(100));
    });
    // 微小スクロール: false のまま
    act(() => {
      result.current.onScroll(makeScrollEvent(103));
    });

    expect(result.current.visible).toBe(false);
  });
});
