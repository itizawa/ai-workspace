import { err, notFound, conflict, forbidden, badRequest, internalError, ok } from "@hatchery/common";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { resultToResponse } from "./resultToResponse.js";

function mockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("resultToResponse()", () => {
  describe("Ok の場合", () => {
    it("false を返し、レスポンスを送信しない", () => {
      const res = mockResponse();
      const result = resultToResponse(res, ok({ id: "1" }));
      expect(result).toBe(false);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("Err の場合", () => {
    it("NotFound → 404 を返す", () => {
      const res = mockResponse();
      const result = resultToResponse(res, err(notFound("ChannelNotFound")));
      expect(result).toBe(true);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "ChannelNotFound" });
    });

    it("Conflict → 409 を返す", () => {
      const res = mockResponse();
      const result = resultToResponse(res, err(conflict("DuplicateEntry")));
      expect(result).toBe(true);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: "DuplicateEntry" });
    });

    it("Forbidden → 403 を返す", () => {
      const res = mockResponse();
      const result = resultToResponse(res, err(forbidden("ForbiddenAccess")));
      expect(result).toBe(true);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "ForbiddenAccess" });
    });

    it("BadRequest → 400 を返す", () => {
      const res = mockResponse();
      const result = resultToResponse(res, err(badRequest("EmployeeNotLinked")));
      expect(result).toBe(true);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "EmployeeNotLinked" });
    });

    it("InternalError → 500 を返す", () => {
      const res = mockResponse();
      const result = resultToResponse(res, err(internalError("UnexpectedError")));
      expect(result).toBe(true);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "UnexpectedError" });
    });
  });
});
