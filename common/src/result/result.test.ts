import { describe, expect, it } from "vitest";

import { err, isErr, isOk, ok, type Err, type Ok, type Result } from "./result.js";

describe("ok()", () => {
  it("ok: true の値を持つ Ok を返す", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    expect((result as Ok<number>).value).toBe(42);
  });

  it("ok(undefined) も正常に動作する", () => {
    const result = ok(undefined);
    expect(result.ok).toBe(true);
  });

  it("ok(null) も正常に動作する", () => {
    const result = ok(null);
    expect(result.ok).toBe(true);
  });

  it("ok はオブジェクト型の値を保持する", () => {
    const value = { id: "1", name: "test" };
    const result = ok(value);
    expect(result.ok).toBe(true);
    expect((result as Ok<typeof value>).value).toEqual(value);
  });
});

describe("err()", () => {
  it("ok: false のエラー値を持つ Err を返す", () => {
    const result = err("NotFound");
    expect(result.ok).toBe(false);
    expect((result as Err<string>).error).toBe("NotFound");
  });

  it("err はオブジェクト型のエラーを保持する", () => {
    const error = { type: "NotFound" as const, message: "Resource not found" };
    const result = err(error);
    expect(result.ok).toBe(false);
    expect((result as Err<typeof error>).error).toEqual(error);
  });
});

describe("isOk()", () => {
  it("ok の Result に対して true を返す", () => {
    expect(isOk(ok(42))).toBe(true);
  });

  it("err の Result に対して false を返す", () => {
    expect(isOk(err("error"))).toBe(false);
  });

  it("型ガードとして機能する", () => {
    const result: Result<number, string> = ok(42);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    } else {
      expect.fail("isOk should be true");
    }
  });
});

describe("isErr()", () => {
  it("err の Result に対して true を返す", () => {
    expect(isErr(err("error"))).toBe(true);
  });

  it("ok の Result に対して false を返す", () => {
    expect(isErr(ok(42))).toBe(false);
  });

  it("型ガードとして機能する", () => {
    const result: Result<number, string> = err("NotFound");
    if (isErr(result)) {
      expect(result.error).toBe("NotFound");
    } else {
      expect.fail("isErr should be true");
    }
  });
});

describe("Result 型 — 網羅パターン", () => {
  it("ok と err を判別共用体で切り分けられる", () => {
    const result: Result<number, string> = ok(42);
    if (result.ok) {
      expect(result.value).toBe(42);
    } else {
      expect.fail("should be ok");
    }
  });

  it("非同期処理（Promise<Result>）でも動作する", async () => {
    const asyncOk = async (): Promise<Result<string, string>> => ok("success");
    const asyncErr = async (): Promise<Result<string, string>> => err("failure");

    const r1 = await asyncOk();
    expect(isOk(r1)).toBe(true);

    const r2 = await asyncErr();
    expect(isErr(r2)).toBe(true);
  });
});
