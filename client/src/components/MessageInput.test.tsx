import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MessageInput } from "./MessageInput";

describe("MessageInput（#48）", () => {
  it("テキストが空のとき送信ボタンが disabled", () => {
    render(<MessageInput onSubmit={vi.fn()} disabled={false} />);
    expect(screen.getByRole("button", { name: /送信/ })).toBeDisabled();
  });

  it("テキストを入力すると送信ボタンが enabled", async () => {
    render(<MessageInput onSubmit={vi.fn()} disabled={false} />);
    await userEvent.type(screen.getByRole("textbox"), "こんにちは");
    expect(screen.getByRole("button", { name: /送信/ })).toBeEnabled();
  });

  it("送信ボタンをクリックすると onSubmit が入力テキストで呼ばれる", async () => {
    const onSubmit = vi.fn();
    render(<MessageInput onSubmit={onSubmit} disabled={false} />);
    await userEvent.type(screen.getByRole("textbox"), "テスト投稿");
    await userEvent.click(screen.getByRole("button", { name: /送信/ }));
    expect(onSubmit).toHaveBeenCalledWith("テスト投稿");
  });

  it("送信後にテキスト入力がクリアされる", async () => {
    render(<MessageInput onSubmit={vi.fn()} disabled={false} />);
    await userEvent.type(screen.getByRole("textbox"), "テスト投稿");
    await userEvent.click(screen.getByRole("button", { name: /送信/ }));
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("disabled=true のとき送信ボタンと入力欄が disabled", () => {
    render(<MessageInput onSubmit={vi.fn()} disabled={true} />);
    expect(screen.getByRole("button", { name: /送信/ })).toBeDisabled();
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
