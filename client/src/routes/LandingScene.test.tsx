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
  it("ヒーローにプロダクト名「Hatchery」の見出しを表示する", () => {
    render(renderLandingScene());
    expect(screen.getByRole("heading", { name: /Hatchery/ })).toBeInTheDocument();
  });

  it("コンセプトを一言で表すキャッチコピーを表示する", () => {
    render(renderLandingScene());
    // 「放置して眺める、自分の会社の AI 社員」の趣旨（観察エンタメ）。
    expect(screen.getByText(/放置して眺める/)).toBeInTheDocument();
  });

  it("中核の魅力 (a) 同じ顔ぶれが継続し記憶でキャラが立つ を表示する", () => {
    render(renderLandingScene());
    expect(screen.getByText(/同じ顔ぶれ/)).toBeInTheDocument();
    expect(screen.getByText(/キャラが/)).toBeInTheDocument();
  });

  it("中核の魅力 (b) 定時にだけ動く を表示する", () => {
    render(renderLandingScene());
    expect(screen.getByText(/定時/)).toBeInTheDocument();
  });

  it("中核の魅力 (c) 覗くと変化が育つ（観察→関与→変化の実感ループ）を表示する", () => {
    render(renderLandingScene());
    expect(screen.getByText(/観察/)).toBeInTheDocument();
    expect(screen.getByText(/変化/)).toBeInTheDocument();
  });

  it("/login へ遷移する CTA リンクを表示する", () => {
    render(renderLandingScene());
    const cta = screen.getByRole("link", { name: /ログイン|はじめる/ });
    expect(cta).toHaveAttribute("href", "/login");
  });
});
