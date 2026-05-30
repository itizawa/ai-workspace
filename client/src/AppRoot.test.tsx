import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppRoot } from "./AppRoot";

// 受け入れ条件 #5: ThemeProvider + QueryClientProvider + RouterProvider を合成し、
// クラッシュせずチャンネル一覧とホーム枠を描画する。
describe("AppRoot", () => {
  it("クラッシュせずチャンネル一覧とホーム枠を描画する", async () => {
    render(<AppRoot />);
    expect(await screen.findByText("#雑談")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /シーン/ })).toBeInTheDocument();
  });
});
