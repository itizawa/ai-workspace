import { afterEach, describe, expect, it, vi } from "vitest";

import { acceptInvitation, fetchInvitation } from "./invitations.js";

/** JSON ボディを持つ Response を組み立てる小ヘルパ。 */
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchInvitation (GET /api/invitations/{token})", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("200 のとき InvitationStatus を返す", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { status: "active", expiresAt: "2026-01-01T00:00:00.000Z" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchInvitation("tok-abc");
    expect(result).toMatchObject({ status: "active" });
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain("/api/invitations/tok-abc");
    expect(request.method).toBe("GET");
  });

  it("404 のとき null を返す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, { error: "Not found" })));
    await expect(fetchInvitation("tok-abc")).resolves.toBeNull();
  });

  it("404 以外の非 2xx で例外を投げる", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { error: "Server error" })));
    await expect(fetchInvitation("tok-abc")).rejects.toThrow();
  });
});

describe("acceptInvitation（受諾・User 作成）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("acceptInvitation（受諾・User 作成）", () => {
    const acceptBody = { loginId: "newuser", displayName: "新ユーザー", password: "password123" };
    const sampleAuthUser = { id: "newuser", loginId: "newuser", displayName: "新ユーザー", role: "member" };

    it("openApiClient 経由で POST /api/invitations/{token}/accept を呼ぶ", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, sampleAuthUser));
      vi.stubGlobal("fetch", fetchMock);

      await acceptInvitation("tok-abc", acceptBody);

      const request = fetchMock.mock.calls[0][0] as Request;
      expect(request).toBeInstanceOf(Request);
      expect(request.url).toContain("/api/invitations/tok-abc/accept");
      expect(request.method).toBe("POST");
    });

    it("201 で AuthUser を返す", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(201, sampleAuthUser)));

      const result = await acceptInvitation("tok-abc", acceptBody);
      expect(result.id).toBe("newuser");
      expect(result.displayName).toBe("新ユーザー");
    });

    it("リクエストボディに id / displayName / password が含まれる", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, sampleAuthUser));
      vi.stubGlobal("fetch", fetchMock);

      await acceptInvitation("tok-abc", acceptBody);

      const request = fetchMock.mock.calls[0][0] as Request;
      const body = await request.json();
      expect(body).toMatchObject({ loginId: "newuser", displayName: "新ユーザー", password: "password123" });
    });

    it("409 で ApiError(409) を投げる（ID 重複・招待失効）", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(409, { error: "Login id already exists" })));
      await expect(acceptInvitation("tok-abc", acceptBody)).rejects.toMatchObject({ status: 409 });
    });

    it("404 で例外を投げる（トークン不存在）", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, { error: "Not found" })));
      await expect(acceptInvitation("tok-abc", acceptBody)).rejects.toThrow();
    });
  });
});
