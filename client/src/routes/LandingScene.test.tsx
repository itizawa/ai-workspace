import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { LandingScene } from "./LandingScene";

/**
 * LandingScene は内部で TanStack Router の Link（CTA → /login）を使うため、
 * RouterProvider 配下で描画する必要がある。最小のメモリルータでラップする。
 */
function renderLandingScene(): ReactElement {
  const rootRoute = createRootRoute({ component: LandingScene });
  const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/login", component: () => null });
  const router = createRouter({
    routeTree: rootRoute.addChildren([loginRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return <RouterProvider router={router} />;
}

describe("LandingScene", () => {
  it("ヒーローにプロダクト名「Hatchery」の見出しを表示する", async () => {
    render(renderLandingScene());
    expect(await screen.findByRole("heading", { name: /Hatchery/ })).toBeInTheDocument();
  });

  it("コンセプトを一言で表すキャッチコピーを表示する", async () => {
    render(renderLandingScene());
    // 「放置して眺める、自分の会社の AI 社員」の趣旨（観察エンタメ）。
    expect((await screen.findAllByText(/放置して眺める/)).length).toBeGreaterThan(0);
  });

  it("中核の魅力 (a) 同じ顔ぶれが継続し記憶でキャラが立つ を見出しで表示する", async () => {
    render(renderLandingScene());
    const heading = await screen.findByRole("heading", { name: /同じ顔ぶれ.*キャラ/ });
    expect(heading).toBeInTheDocument();
  });

  it("中核の魅力 (b) 定時にだけ動く を見出しで表示する", async () => {
    render(renderLandingScene());
    expect(await screen.findByRole("heading", { name: /定時にだけ動く/ })).toBeInTheDocument();
  });

  it("中核の魅力 (c) 覗くと変化が育つ（観察→関与→変化の実感ループ）を見出しで表示する", async () => {
    render(renderLandingScene());
    expect(await screen.findByRole("heading", { name: /覗くと変化が育つ/ })).toBeInTheDocument();
    // 観察 → 関与 → 変化の実感ループの説明文も含む。
    expect((await screen.findAllByText(/観察 → 関与 → 変化/)).length).toBeGreaterThan(0);
  });

  it("/login へ遷移する CTA リンクを表示する", async () => {
    render(renderLandingScene());
    const cta = await screen.findByRole("link", { name: /ログイン|はじめる/ });
    expect(cta).toHaveAttribute("href", "/login");
  });
});
