import { describe, expect, it } from "vitest";

import {
  badRequest,
  conflict,
  forbidden,
  internalError,
  notFound,
  type DomainError,
  type DomainErrorType,
} from "./domainError.js";

describe("notFound()", () => {
  it("type が NotFound の DomainError を返す", () => {
    const e = notFound("ChannelNotFound");
    expect(e.type).toBe("NotFound");
    expect(e.message).toBe("ChannelNotFound");
  });
});

describe("conflict()", () => {
  it("type が Conflict の DomainError を返す", () => {
    const e = conflict("DuplicateEntry");
    expect(e.type).toBe("Conflict");
    expect(e.message).toBe("DuplicateEntry");
  });
});

describe("forbidden()", () => {
  it("type が Forbidden の DomainError を返す", () => {
    const e = forbidden("Forbidden");
    expect(e.type).toBe("Forbidden");
    expect(e.message).toBe("Forbidden");
  });
});

describe("badRequest()", () => {
  it("type が BadRequest の DomainError を返す", () => {
    const e = badRequest("EmployeeNotLinked");
    expect(e.type).toBe("BadRequest");
    expect(e.message).toBe("EmployeeNotLinked");
  });
});

describe("internalError()", () => {
  it("type が InternalError の DomainError を返す", () => {
    const e = internalError("UnexpectedError");
    expect(e.type).toBe("InternalError");
    expect(e.message).toBe("UnexpectedError");
  });
});

describe("DomainError 型", () => {
  it("各ファクトリが DomainError 型として機能する", () => {
    const errors: DomainError[] = [
      notFound("msg"),
      conflict("msg"),
      forbidden("msg"),
      badRequest("msg"),
      internalError("msg"),
    ];
    expect(errors).toHaveLength(5);
    for (const e of errors) {
      expect(e).toHaveProperty("type");
      expect(e).toHaveProperty("message");
    }
  });

  it("DomainErrorType の網羅チェック", () => {
    const types: DomainErrorType[] = [
      "NotFound",
      "Conflict",
      "Forbidden",
      "BadRequest",
      "InternalError",
    ];
    expect(types).toHaveLength(5);
  });
});
