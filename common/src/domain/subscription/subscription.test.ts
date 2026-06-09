import { describe, expect, it } from "vitest";

import { SubscriptionSchema } from "./subscription.js";

describe("SubscriptionSchema", () => {
  const validSubscription = {
    user_id: "user-1",
    community_id: "comm-1",
    created_at: new Date("2026-06-10T09:00:00.000Z"),
  };

  it("有効なサブスクリプションをパースできる", () => {
    const result = SubscriptionSchema.safeParse(validSubscription);
    expect(result.success).toBe(true);
  });

  it("user_id を持つ", () => {
    const result = SubscriptionSchema.parse(validSubscription);
    expect(result.user_id).toBe("user-1");
  });

  it("community_id を持つ", () => {
    const result = SubscriptionSchema.parse(validSubscription);
    expect(result.community_id).toBe("comm-1");
  });

  it("created_at を持つ", () => {
    const result = SubscriptionSchema.parse(validSubscription);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it("user_id が空文字を reject する", () => {
    const data = { ...validSubscription, user_id: "" };
    expect(SubscriptionSchema.safeParse(data).success).toBe(false);
  });

  it("community_id が空文字を reject する", () => {
    const data = { ...validSubscription, community_id: "" };
    expect(SubscriptionSchema.safeParse(data).success).toBe(false);
  });
});
