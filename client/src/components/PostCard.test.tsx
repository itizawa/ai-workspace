import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PostCard } from "./PostCard";

const mockPost = {
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

describe("PostCard", () => {
  it("post のタイトルを表示する", () => {
    render(<PostCard post={mockPost} onVote={vi.fn()} />);
    expect(screen.getByText("今日も元気に始めましょう")).toBeInTheDocument();
  });

  it("post の本文を表示する", () => {
    render(<PostCard post={mockPost} onVote={vi.fn()} />);
    expect(screen.getByText("おはようございます！今日もよろしくお願いします。")).toBeInTheDocument();
  });

  it("author を表示する", () => {
    render(<PostCard post={mockPost} onVote={vi.fn()} />);
    expect(screen.getByText("worker-haru")).toBeInTheDocument();
  });

  it("score を表示する", () => {
    render(<PostCard post={mockPost} onVote={vi.fn()} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("up vote ボタンがあり、クリックすると onVote が呼ばれる", async () => {
    const onVote = vi.fn();
    render(<PostCard post={mockPost} onVote={onVote} />);
    await userEvent.click(screen.getByRole("button", { name: /up vote/i }));
    expect(onVote).toHaveBeenCalledTimes(1);
  });

  it("投稿欄・コメント入力欄は表示しない（ADR-0020）", () => {
    render(<PostCard post={mockPost} onVote={vi.fn()} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
