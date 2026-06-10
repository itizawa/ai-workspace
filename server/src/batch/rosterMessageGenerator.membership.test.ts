import { DEFAULT_WORKERS, WORKER_MESSAGE_TEMPLATES, type Channel } from "@hatchery/common";
import { describe, expect, it } from "vitest";

import { createRosterMessageGenerator } from "./rosterMessageGenerator.js";

const CHANNELS: Channel[] = [
  { id: "zatsudan", label: "雑談" },
  { id: "shigoto", label: "仕事" },
];

describe("createRosterMessageGenerator — 所属 Worker のみ発言（#33）", () => {
  it("membershipByChannel を渡すと、各チャンネルで所属 Worker のみが speaker になる", () => {
    const generate = createRosterMessageGenerator({
      channels: CHANNELS,
      workers: DEFAULT_WORKERS,
      templates: WORKER_MESSAGE_TEMPLATES,
      perChannel: 3,
      rng: () => 0,
      membershipByChannel: {
        zatsudan: ["haru"],
        shigoto: ["ken", "mei"],
      },
    });
    const messages = generate();
    const zatsudan = messages.filter((m) => m.channel === "zatsudan").map((m) => m.createdEmployeeId);
    const shigoto = messages.filter((m) => m.channel === "shigoto").map((m) => m.createdEmployeeId);
    expect(new Set(zatsudan)).toEqual(new Set(["haru"]));
    expect(new Set(shigoto)).toEqual(new Set(["ken", "mei"]));
  });

  it("所属が無いチャンネルでは誰も発言しない", () => {
    const generate = createRosterMessageGenerator({
      channels: CHANNELS,
      workers: DEFAULT_WORKERS,
      templates: WORKER_MESSAGE_TEMPLATES,
      perChannel: 3,
      rng: () => 0,
      membershipByChannel: { zatsudan: ["haru"] },
    });
    const messages = generate();
    expect(messages.some((m) => m.channel === "shigoto")).toBe(false);
  });
});
