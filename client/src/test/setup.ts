import "@testing-library/jest-dom/vitest";

import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// 並列実行（多数のテストファイル同時実行）で findBy* の既定 1000ms タイムアウトに
// 引っかかってフレーキーに落ちるのを防ぐため、非同期ユーティリティのタイムアウトを引き上げる。
// #462: SidebarCommunitySection 等が常時 Suspense クエリで一段非同期に描画されるため余裕を持たせる。
configure({ asyncUtilTimeout: 5000 });

/** jsdom 未実装の Web API をスタブする。 */
function installJsdomPolyfills(): void {
  // jsdom は window.scrollTo 未実装。TanStack Router のスクロール復元が呼ぶためスタブする。
  vi.stubGlobal("scrollTo", () => {});

  // jsdom は IntersectionObserver 未実装。無限スクロールの sentinel 監視（HomeFeedScene 等）が
  // 構築するためスタブする（#462: Suspense 化で初回レンダリングから sentinel が存在し observe が走る）。
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): [] {
        return [];
      }
    },
  );
}

// 各テストの直前にポリフィルを再適用する。`vi.unstubAllGlobals()` を afterEach で呼ぶ
// テスト（fetch をスタブするスイート等）でも、次テストでこれらの API が確実に存在するようにする。
beforeEach(() => {
  installJsdomPolyfills();
});

// 初回テスト前（最初の beforeEach 前）にも一度適用しておく。
installJsdomPolyfills();

// 各テスト後に React Testing Library のマウントを破棄する（テスト間の DOM 汚染を防ぐ）。
afterEach(() => {
  cleanup();
});
