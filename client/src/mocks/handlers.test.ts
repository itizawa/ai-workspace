/**
 * MSW ハンドラのパスが API クライアントの実パスと一致することを検証するテスト (#198)。
 * handlers をそのまま msw/node の setupServer に載せ、各 API ラッパ関数を呼び出して
 * モックデータが返ること（= ハンドラにマッチした）を確認する。
 * パスがずれていれば fetch が素通りしてエラーになるため、パスずれを自動検知できる。
 */
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { fetchMe } from "../api/auth.js";
import { fetchSettings } from "../api/admin.js";
import { fetchBatchLogs } from "../api/batchLogs.js";
import { mockAdminUser, mockSettings, mockBatchLogs, mockMessages } from "./data/fixtures.js";
import { handlers } from "./handlers.js";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("MSW ハンドラのパスが API クライアントの実パスと一致する (#198)", () => {
  it("fetchMe が /api/auth/me ハンドラにマッチしてモック AuthUser を返す", async () => {
    const result = await fetchMe();
    expect(result).toMatchObject({
      id: mockAdminUser.id,
      displayName: mockAdminUser.displayName,
    });
  });

  it("fetchSettings が /api/admin/settings ハンドラにマッチしてモック設定を返す", async () => {
    const result = await fetchSettings();
    expect(result).toEqual(mockSettings);
  });

  it("fetchBatchLogs が /api/admin/batch-logs ハンドラにマッチしてモックログを返す", async () => {
    const result = await fetchBatchLogs();
    expect(result.length).toBe(mockBatchLogs.length);
    expect(result[0].id).toBe(mockBatchLogs[0].id);
    expect(result[0].status).toBe(mockBatchLogs[0].status);
  });

  it("/api/messages GET ハンドラが存在しモッセージ配列を返す", async () => {
    const res = await fetch("/api/messages");
    expect(res.ok).toBe(true);
    const data = await res.json() as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(mockMessages.length);
  });

  it("POST /api/auth/login ハンドラが存在しモック AuthUser を返す", async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "admin-user", password: "pass" }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json() as { id: string };
    expect(data.id).toBe(mockAdminUser.id);
  });
});
