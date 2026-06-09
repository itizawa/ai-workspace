import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SubscribeButton } from "./SubscribeButton";

describe("SubscribeButton", () => {
  it("購読していないとき「購読する」ボタンが表示される", () => {
    render(<SubscribeButton subscribed={false} onSubscribe={vi.fn()} onUnsubscribe={vi.fn()} />);
    expect(screen.getByRole("button", { name: "購読する" })).toBeInTheDocument();
  });

  it("購読済みのとき「購読解除」ボタンが表示される", () => {
    render(<SubscribeButton subscribed={true} onSubscribe={vi.fn()} onUnsubscribe={vi.fn()} />);
    expect(screen.getByRole("button", { name: "購読解除" })).toBeInTheDocument();
  });

  it("未購読のとき「購読する」をクリックすると onSubscribe が呼ばれる", async () => {
    const onSubscribe = vi.fn();
    render(<SubscribeButton subscribed={false} onSubscribe={onSubscribe} onUnsubscribe={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "購読する" }));
    expect(onSubscribe).toHaveBeenCalledTimes(1);
  });

  it("購読済みのとき「購読解除」をクリックすると onUnsubscribe が呼ばれる", async () => {
    const onUnsubscribe = vi.fn();
    render(<SubscribeButton subscribed={true} onSubscribe={vi.fn()} onUnsubscribe={onUnsubscribe} />);
    await userEvent.click(screen.getByRole("button", { name: "購読解除" }));
    expect(onUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("disabled=true のときボタンが無効化される", () => {
    render(<SubscribeButton subscribed={false} onSubscribe={vi.fn()} onUnsubscribe={vi.fn()} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
