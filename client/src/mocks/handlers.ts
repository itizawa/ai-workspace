import { http, HttpResponse } from "msw";

import { mockAdminUser, mockChannels, mockMessages, mockSettings, mockBatchLogs } from "./data/fixtures.js";

/** MSW デフォルトハンドラ。各ストーリーで `parameters.msw.handlers` で上書き可能。 */
export const handlers = [
  http.get("/api/auth/me", () => HttpResponse.json(mockAdminUser)),

  http.get("/api/channels", () => HttpResponse.json(mockChannels)),

  http.get("/api/channels/:channelId/messages", () => HttpResponse.json(mockMessages)),

  http.get("/api/admin/settings", () => HttpResponse.json(mockSettings)),

  http.get("/api/admin/batch-logs", () => HttpResponse.json(mockBatchLogs)),

  http.get("/api/messages", () => HttpResponse.json(mockMessages)),

  http.post("/api/auth/login", () => HttpResponse.json(mockAdminUser)),

  http.post("/api/auth/logout", () => new HttpResponse(null, { status: 200 })),

  http.patch("/api/auth/me", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockAdminUser, ...body });
  }),
];
