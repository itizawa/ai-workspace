import { DEFAULT_EMPLOYEES, type Channel, type Employee, type MessageRecord } from "@hatchery/common";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DRIP_INTERVAL_MS, TYPING_DURATION_MS } from "../utils/messageDrip";
import { ChannelView } from "./ChannelView";

/** prefers-reduced-motion の matchMedia をモックする（reduce=true で reduced-motion 有効）。 */
const mockReducedMotion = (reduce: boolean): void => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduce : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

/** テスト用に id 付き MessageRecord を生成する。 */
const rec = (id: string, employeeId: string, text: string, order: number): MessageRecord => ({
  id,
  createdEmployeeId: employeeId,
  channel: "zatsudan",
  text,
  postedAt: new Date("2026-06-05T09:00:00Z"),
  createdAt: new Date("2026-06-05T09:00:00Z"),
  order,
});

// 受け入れ条件（#30）: channel に属する message[] を発言者名 + 本文の
// フラット一覧として表示する presentational コンポーネント。
const channel: Channel = { id: "zatsudan", label: "雑談" };

const employees: readonly Employee[] = [
  { id: "haru", displayName: "ハル" },
  { id: "ken", displayName: "ケン" },
];

const messages: readonly MessageRecord[] = [
  {
    id: "msg-1",
    createdEmployeeId: "haru",
    channel: "zatsudan",
    text: "おはようございます！",
    postedAt: new Date("2026-06-05T09:00:00Z"),
    createdAt: new Date("2026-06-05T09:00:00Z"),
    order: 0,
  },
  {
    id: "msg-2",
    createdEmployeeId: "ken",
    channel: "zatsudan",
    text: "今日もよろしく。",
    postedAt: new Date("2026-06-05T10:30:00Z"),
    createdAt: new Date("2026-06-05T10:30:00Z"),
    order: 1,
  },
];

const formatPostedAt = (date: Date): string =>
  new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);

describe("ChannelView", () => {
  it("チャンネルラベルを見出しとして表示する", () => {
    render(<ChannelView channel={channel} messages={messages} employees={employees} />);
    expect(screen.getByRole("heading", { name: "雑談" })).toBeInTheDocument();
  });

  it("各メッセージの本文を表示する", () => {
    render(<ChannelView channel={channel} messages={messages} employees={employees} />);
    expect(screen.getByText("おはようございます！")).toBeInTheDocument();
    expect(screen.getByText("今日もよろしく。")).toBeInTheDocument();
  });

  it("createdEmployeeId を employees の displayName に解決して表示する（#222）", () => {
    render(<ChannelView channel={channel} messages={messages} employees={employees} />);
    expect(screen.getByText("ハル")).toBeInTheDocument();
    expect(screen.getByText("ケン")).toBeInTheDocument();
  });

  it("未解決の createdEmployeeId は ID をそのままフォールバック表示する（#222）", () => {
    const withUnknown: readonly MessageRecord[] = [
      {
        id: "msg-unknown",
        createdEmployeeId: "unknown-id",
        channel: "zatsudan",
        text: "誰?",
        postedAt: new Date("2026-06-05T09:00:00Z"),
        createdAt: new Date("2026-06-05T09:00:00Z"),
        order: 0,
      },
    ];
    render(<ChannelView channel={channel} messages={withUnknown} employees={employees} />);
    expect(screen.getByText("unknown-id")).toBeInTheDocument();
  });

  it("employees 省略時は DEFAULT_EMPLOYEES で解決する", () => {
    render(<ChannelView channel={channel} messages={messages} />);
    // DEFAULT_EMPLOYEES の haru の displayName は "haru"
    const haru = DEFAULT_EMPLOYEES.find((e) => e.id === "haru");
    expect(haru).toBeDefined();
    expect(screen.getByText(haru!.displayName)).toBeInTheDocument();
  });

  it("メッセージ件数ぶんの行を描画する", () => {
    render(<ChannelView channel={channel} messages={messages} employees={employees} />);
    const list = screen.getByRole("list", { name: "メッセージ一覧" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(messages.length);
  });

  it("messages が空のとき空状態を表示し、一覧は描画しない", () => {
    render(<ChannelView channel={channel} messages={[]} employees={employees} />);
    expect(screen.getByText(/まだメッセージがありません/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "メッセージ一覧" })).not.toBeInTheDocument();
  });

  it("postedAt の時刻を HH:mm 形式で各メッセージに表示する（#278）", () => {
    render(<ChannelView channel={channel} messages={messages} employees={employees} />);
    expect(screen.getByText(formatPostedAt(messages[0].postedAt))).toBeInTheDocument();
    expect(screen.getByText(formatPostedAt(messages[1].postedAt))).toBeInTheDocument();
  });
});

describe("ChannelView 新着ドリップ表示（#282）", () => {
  beforeEach(() => {
    mockReducedMotion(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("初回ロードの過去ログは即時に全件表示する（ドリップしない・AC-3）", () => {
    const initial = [rec("m1", "haru", "おはよう", 0), rec("m2", "ken", "よろしく", 1)];
    render(<ChannelView channel={channel} messages={initial} employees={employees} />);

    // タイマーを進めずとも初回ログは全件本文が出ている。
    expect(screen.getByText("おはよう")).toBeInTheDocument();
    expect(screen.getByText("よろしく")).toBeInTheDocument();
    // タイピングインジケータは出ていない。
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("初回ロード後に増えた新着のみ、タイピング → 本文の順で 1 件ずつ表示する（AC-1 / AC-2）", () => {
    const initial = [rec("m1", "haru", "おはよう", 0)];
    const { rerender } = render(
      <ChannelView channel={channel} messages={initial} employees={employees} />,
    );
    expect(screen.getByText("おはよう")).toBeInTheDocument();

    // 新着 m2（ケン）, m3（ハル）が増える。
    const grown = [
      rec("m1", "haru", "おはよう", 0),
      rec("m2", "ken", "やあ", 1),
      rec("m3", "haru", "またね", 2),
    ];
    rerender(<ChannelView channel={channel} messages={grown} employees={employees} />);

    // 本文が出る前にケンのタイピングインジケータが出ており、本文 m2/m3 はまだ。
    expect(screen.getByRole("status", { name: /ケン.*入力中/ })).toBeInTheDocument();
    expect(screen.queryByText("やあ")).not.toBeInTheDocument();
    expect(screen.queryByText("またね")).not.toBeInTheDocument();

    // タイピング時間経過で m2 本文が出る。
    act(() => {
      vi.advanceTimersByTime(TYPING_DURATION_MS);
    });
    expect(screen.getByText("やあ")).toBeInTheDocument();
    // 次の m3 本文はまだ出ていない。
    expect(screen.queryByText("またね")).not.toBeInTheDocument();

    // ドリップ間隔 + タイピング時間経過で m3 本文が出る。
    act(() => {
      vi.advanceTimersByTime(DRIP_INTERVAL_MS + TYPING_DURATION_MS);
    });
    expect(screen.getByText("またね")).toBeInTheDocument();
    // 全部出し切ったらタイピングは消える。
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("時系列順（メッセージ配列順）を維持して表示する（AC-1）", () => {
    const initial = [rec("m1", "haru", "1番目", 0)];
    const { rerender } = render(
      <ChannelView channel={channel} messages={initial} employees={employees} />,
    );
    const grown = [
      rec("m1", "haru", "1番目", 0),
      rec("m2", "ken", "2番目", 1),
      rec("m3", "haru", "3番目", 2),
    ];
    rerender(<ChannelView channel={channel} messages={grown} employees={employees} />);
    // 全部出し切る。
    act(() => {
      vi.advanceTimersByTime((TYPING_DURATION_MS + DRIP_INTERVAL_MS) * 3);
    });
    const list = screen.getByRole("list", { name: "メッセージ一覧" });
    const texts = within(list)
      .getAllByText(/番目$/)
      .map((el) => el.textContent);
    expect(texts).toEqual(["1番目", "2番目", "3番目"]);
  });

  it("reduced-motion 時は新着も即時表示しタイピングを出さない（AC-4）", () => {
    mockReducedMotion(true);
    const initial = [rec("m1", "haru", "おはよう", 0)];
    const { rerender } = render(
      <ChannelView channel={channel} messages={initial} employees={employees} />,
    );
    const grown = [
      rec("m1", "haru", "おはよう", 0),
      rec("m2", "ken", "やあ", 1),
      rec("m3", "haru", "またね", 2),
    ];
    rerender(<ChannelView channel={channel} messages={grown} employees={employees} />);

    // タイマーを進めずとも新着が即時表示され、タイピングは出ない。
    expect(screen.getByText("やあ")).toBeInTheDocument();
    expect(screen.getByText("またね")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ChannelView 編集ボタン（#206）", () => {
  it("onEditName が渡されると編集ボタンが表示される", () => {
    render(<ChannelView channel={channel} messages={[]} onEditName={vi.fn()} />);
    expect(screen.getByRole("button", { name: "チャンネル名を編集" })).toBeInTheDocument();
  });

  it("onEditName が渡されないと編集ボタンは表示されない（未ログイン相当）（AC-f）", () => {
    render(<ChannelView channel={channel} messages={[]} />);
    expect(screen.queryByRole("button", { name: "チャンネル名を編集" })).not.toBeInTheDocument();
  });

  it("編集ボタンをクリックすると onEditName が呼ばれる", async () => {
    const onEditName = vi.fn();
    render(<ChannelView channel={channel} messages={[]} onEditName={onEditName} />);
    await userEvent.click(screen.getByRole("button", { name: "チャンネル名を編集" }));
    expect(onEditName).toHaveBeenCalled();
  });
});
