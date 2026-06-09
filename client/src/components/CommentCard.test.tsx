import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CommentCard } from "./CommentCard";

const mockComment = {
  id: "comment-1",
  community_id: "community-1",
  post_id: "post-1",
  slot_key: "2026-06-01-morning",
  seq: 1,
  author: "worker-ken",
  text: "いつも元気ですね！",
  score: 2,
  created_at: "2026-06-01T09:01:00Z",
};

describe("CommentCard", () => {
  it("comment の本文を表示する", () => {
    render(<CommentCard comment={mockComment} onVote={vi.fn()} />);
    expect(screen.getByText("いつも元気ですね！")).toBeInTheDocument();
  });

  it("author を表示する", () => {
    render(<CommentCard comment={mockComment} onVote={vi.fn()} />);
    expect(screen.getByText("worker-ken")).toBeInTheDocument();
  });

  it("score を表示する", () => {
    render(<CommentCard comment={mockComment} onVote={vi.fn()} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("up vote ボタンがあり、クリックすると onVote が呼ばれる", async () => {
    const onVote = vi.fn();
    render(<CommentCard comment={mockComment} onVote={onVote} />);
    await userEvent.click(screen.getByRole("button", { name: /up vote/i }));
    expect(onVote).toHaveBeenCalledTimes(1);
  });

  it("コメント入力欄は表示しない（ADR-0020）", () => {
    render(<CommentCard comment={mockComment} onVote={vi.fn()} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
