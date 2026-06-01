import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChannelList } from "./ChannelList";

/** JSON ボディを持つ Response を組み立てる小ヘルパ。 */
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** retry を無効化した QueryClient で children を包む（テスト間でキャッシュを共有しない）。 */
function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// 受け入れ条件 AC6: ChannelList は GET /channels の結果を描画し、DEFAULT_CHANNELS を直接参照しない。
describe("ChannelList（GET /channels 駆動・#47）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET /channels から返ったチャンネルのラベルを描画する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          { id: "zatsudan", label: "#雑談" },
          { id: "shigoto", label: "#仕事" },
        ]),
      ),
    );

    renderWithClient(<ChannelList />);

    expect(await screen.findByText("#雑談")).toBeInTheDocument();
    expect(await screen.findByText("#仕事")).toBeInTheDocument();
  });

  it("API が返したチャンネルだけを描画する（ハードコードに依存しない）", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, [{ id: "kikaku", label: "#企画" }])),
    );

    renderWithClient(<ChannelList />);

    expect(await screen.findByText("#企画")).toBeInTheDocument();
    expect(screen.queryByText("#雑談")).not.toBeInTheDocument();
  });
});
