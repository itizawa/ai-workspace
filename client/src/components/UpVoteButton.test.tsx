import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UpVoteButton } from "./UpVoteButton";

describe("UpVoteButton", () => {
  it("score を数値で表示する", () => {
    render(<UpVoteButton score={5} onVote={vi.fn()} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("up vote ボタンが表示される", () => {
    render(<UpVoteButton score={0} onVote={vi.fn()} />);
    expect(screen.getByRole("button", { name: /up vote/i })).toBeInTheDocument();
  });

  it("ボタンをクリックすると onVote が呼ばれる", async () => {
    const onVote = vi.fn();
    render(<UpVoteButton score={3} onVote={onVote} />);
    await userEvent.click(screen.getByRole("button", { name: /up vote/i }));
    expect(onVote).toHaveBeenCalledTimes(1);
  });

  it("voted=true のとき色が変わる（aria-pressed=true）", () => {
    render(<UpVoteButton score={5} onVote={vi.fn()} voted />);
    expect(screen.getByRole("button", { name: /up vote/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("voted=false のとき aria-pressed=false", () => {
    render(<UpVoteButton score={5} onVote={vi.fn()} voted={false} />);
    expect(screen.getByRole("button", { name: /up vote/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("disabled=true のときボタンが無効化される", () => {
    render(<UpVoteButton score={5} onVote={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /up vote/i })).toBeDisabled();
  });
});
