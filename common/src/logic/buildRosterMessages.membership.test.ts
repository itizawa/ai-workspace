import { describe, expect, it } from "vitest";

import type { Worker } from "../domain/worker/index.js";

import { buildRosterMessages } from "./buildRosterMessages.js";

/** 与えた値を循環して返す決定的 rng。 */
const seq = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

const WORKERS: Worker[] = [
  { id: "a", displayName: "A" },
  { id: "b", displayName: "B" },
  { id: "c", displayName: "C" },
];

const TEMPLATES = {
  a: ["a1"],
  b: ["b1"],
  c: ["c1"],
};

describe("buildRosterMessages — 所属マップで発言候補を絞る（#33）", () => {
  it("membershipByChannel 指定時、各チャンネルで所属 Worker のみが createdEmployeeId になる", () => {
    const messages = buildRosterMessages({
      channels: ["zatsudan", "shigoto"],
      workers: WORKERS,
      templates: TEMPLATES,
      perChannel: 3,
      rng: seq([0]),
      membershipByChannel: {
        zatsudan: ["a"],
        shigoto: ["b", "c"],
      },
    });
    const zatsudan = messages.filter((m) => m.channel === "zatsudan").map((m) => m.createdEmployeeId);
    const shigoto = messages.filter((m) => m.channel === "shigoto").map((m) => m.createdEmployeeId);
    expect(new Set(zatsudan)).toEqual(new Set(["a"]));
    expect(new Set(shigoto)).toEqual(new Set(["b", "c"]));
  });

  it("所属が空のチャンネルでは誰も発言しない", () => {
    const messages = buildRosterMessages({
      channels: ["zatsudan"],
      workers: WORKERS,
      templates: TEMPLATES,
      perChannel: 3,
      rng: seq([0]),
      membershipByChannel: { zatsudan: [] },
    });
    expect(messages).toHaveLength(0);
  });

  it("マップに無いチャンネルでは誰も発言しない", () => {
    const messages = buildRosterMessages({
      channels: ["unknown"],
      workers: WORKERS,
      templates: TEMPLATES,
      perChannel: 3,
      rng: seq([0]),
      membershipByChannel: { zatsudan: ["a"] },
    });
    expect(messages).toHaveLength(0);
  });

  it("membershipByChannel 未指定なら従来どおり全 Worker が候補（後方互換）", () => {
    const messages = buildRosterMessages({
      channels: ["zatsudan"],
      workers: WORKERS,
      templates: TEMPLATES,
      perChannel: 3,
      rng: seq([0]),
    });
    expect(new Set(messages.map((m) => m.createdEmployeeId))).toEqual(new Set(["a", "b", "c"]));
  });
});
