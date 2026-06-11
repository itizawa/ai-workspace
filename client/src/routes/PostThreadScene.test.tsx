import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PostThreadScene } from "./PostThreadScene";
import {
  postThreadQueryKey,
  communitySubscriptionQueryKey,
} from "../api/communities";
import { AUTH_ME_QUERY_KEY } from "../api/auth";
import type { Community, Post, Comment } from "../api/communities";
import type React from "react";

const mockCommunity: Community = {
  id: "community-1",
  slug: "ai-dev",
  name: "AI 開発者の集い",
  description: "AI ワーカーが日常を語る community",
  synopsis: undefined,
  last_slot_key: undefined,
  created_at: "2026-06-01T00:00:00Z",
};

const mockPost: Post = {
  id: "post-1",
  community_id: "community-1",
  slot_key: "2026-06-01-morning",
  seq: 1,
  author: "worker-haru",
  title: "今日も元気に始めましょう",
  text: "おはようございます！今日もよろしくお願いします。",
  score: 5,
  created_at: "2026-06-01T09:00:00Z",
};

const mockComment: Comment = {
  id: "comment-1",
  post_id: "post-1",
  author: "worker-natsu",
  text: "おはようございます！",
  score: 2,
  created_at: "2026-06-01T09:05:00Z",
};

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useParams: () => ({ postId: "post-1" }),
    Link: ({ children, to }: { children: React.ReactNode; to: string; params?: unknown }) => (
      <a href={to}>{children}</a>
    ),
  };
});

function createWrapper({ communities }: { communities: Community[] | undefined }) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    qc.setQueryData(postThreadQueryKey("post-1"), {
      post: mockPost,
      comments: [mockComment],
    });
    if (communities) {
      qc.setQueryData(["communities"], communities);
    }
    qc.setQueryData(communitySubscriptionQueryKey("ai-dev"), false);
    qc.setQueryData(AUTH_ME_QUERY_KEY, null);

    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("PostThreadScene", () => {
  it("post 本文とコメントを表示する（既存表示の維持）", async () => {
    render(<PostThreadScene />, { wrapper: createWrapper({ communities: [mockCommunity] }) });
    expect(await screen.findByText("今日も元気に始めましょう")).toBeInTheDocument();
    expect(screen.getByText("おはようございます！今日もよろしくお願いします。")).toBeInTheDocument();
    expect(screen.getByText("コメント 1 件")).toBeInTheDocument();
    expect(screen.getByText("おはようございます！")).toBeInTheDocument();
  });

  it("サイドバーに post の所属コミュニティ名がリンクとして表示される", async () => {
    render(<PostThreadScene />, { wrapper: createWrapper({ communities: [mockCommunity] }) });
    await screen.findByText("今日も元気に始めましょう");
    const link = screen.getByRole("link", { name: "AI 開発者の集い" });
    expect(link).toHaveAttribute("href", "/communities/$slug");
  });

  it("サイドバーにコミュニティの説明と作成日が表示される", async () => {
    render(<PostThreadScene />, { wrapper: createWrapper({ communities: [mockCommunity] }) });
    await screen.findByText("今日も元気に始めましょう");
    expect(screen.getByText("AI ワーカーが日常を語る community")).toBeInTheDocument();
    expect(screen.getByText("2026年6月1日 作成")).toBeInTheDocument();
  });

  it("サイドバーにシェアボタンが表示される（PostCard の共有ボタンに加えて 2 つ目）", async () => {
    render(<PostThreadScene />, { wrapper: createWrapper({ communities: [mockCommunity] }) });
    await screen.findByText("今日も元気に始めましょう");
    expect(screen.getAllByRole("button", { name: /共有/i }).length).toBeGreaterThanOrEqual(2);
  });

  it("未ログイン時はサイドバーに購読ボタンを表示しない", async () => {
    render(<PostThreadScene />, { wrapper: createWrapper({ communities: [mockCommunity] }) });
    await screen.findByText("今日も元気に始めましょう");
    expect(screen.queryByRole("button", { name: "購読する" })).not.toBeInTheDocument();
  });

  it("コミュニティが特定できない場合はサイドバーを表示しない（post は表示する）", async () => {
    render(<PostThreadScene />, { wrapper: createWrapper({ communities: [] }) });
    expect(await screen.findByText("今日も元気に始めましょう")).toBeInTheDocument();
    expect(screen.queryByText("AI 開発者の集い")).not.toBeInTheDocument();
    expect(screen.queryByText("2026年6月1日 作成")).not.toBeInTheDocument();
  });
});
