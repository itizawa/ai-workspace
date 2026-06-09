import { describe, expect, it } from "vitest";

import { WorldStateSchema } from "./worldState.js";

describe("WorldStateSchema", () => {
  const validWorldState = {
    summaryVersion: 1,
    workerStates: {
      "worker-haru": {
        mood: "元気",
        experience: 10,
        lastAppearedSlotKey: "2026-06-10T09:00:00.000Z",
        relations: [{ targetWorkerId: "worker-ken", value: 5 }],
        hasEvolved: false,
      },
    },
  };

  it("有効な world_state をパースできる", () => {
    const result = WorldStateSchema.safeParse(validWorldState);
    expect(result.success).toBe(true);
  });

  it("summaryVersion を持つ", () => {
    const result = WorldStateSchema.parse(validWorldState);
    expect(result.summaryVersion).toBe(1);
  });

  it("workerStates を持つ", () => {
    const result = WorldStateSchema.parse(validWorldState);
    expect(result.workerStates["worker-haru"]).toBeDefined();
  });

  it("workerState の mood を持つ（任意）", () => {
    const result = WorldStateSchema.parse(validWorldState);
    expect(result.workerStates["worker-haru"]?.mood).toBe("元気");
  });

  it("workerState の experience を持つ", () => {
    const result = WorldStateSchema.parse(validWorldState);
    expect(result.workerStates["worker-haru"]?.experience).toBe(10);
  });

  it("workerState の lastAppearedSlotKey を持つ（任意）", () => {
    const result = WorldStateSchema.parse(validWorldState);
    expect(result.workerStates["worker-haru"]?.lastAppearedSlotKey).toBe(
      "2026-06-10T09:00:00.000Z",
    );
  });

  it("workerState の relations を持つ", () => {
    const result = WorldStateSchema.parse(validWorldState);
    expect(result.workerStates["worker-haru"]?.relations).toHaveLength(1);
  });

  it("workerState の hasEvolved を持つ", () => {
    const result = WorldStateSchema.parse(validWorldState);
    expect(result.workerStates["worker-haru"]?.hasEvolved).toBe(false);
  });

  it("open_prompts を持たない（ADR-0020 でお題廃止）", () => {
    const result = WorldStateSchema.parse(validWorldState);
    expect("open_prompts" in result).toBe(false);
  });

  it("synopsis を持たない（Community 側に持つ）", () => {
    const result = WorldStateSchema.parse(validWorldState);
    expect("synopsis" in result).toBe(false);
  });

  it("空の workerStates で正常にパースできる", () => {
    const data = { summaryVersion: 0, workerStates: {} };
    const result = WorldStateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("デフォルト値で空オブジェクトをパースできる", () => {
    const result = WorldStateSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summaryVersion).toBe(0);
      expect(result.data.workerStates).toEqual({});
    }
  });
});
