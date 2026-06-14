import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function fileExists(relativePath: string): boolean {
  return existsSync(path.join(repoRoot, relativePath));
}

describe("common vitest.config.ts の存在とカバレッジ設定 (Issue #71)", () => {
  it("common/vitest.config.ts が存在する", () => {
    expect(fileExists("common/vitest.config.ts")).toBe(true);
  });

  it("coverage プロバイダーとして v8 が設定されている", () => {
    const content = readFile("common/vitest.config.ts");
    expect(content).toMatch(/provider\s*:\s*["']v8["']/);
  });

  it("lcov レポーターが設定されている", () => {
    const content = readFile("common/vitest.config.ts");
    expect(content).toMatch(/lcov/);
  });

  it("json-summary レポーターが設定されている", () => {
    const content = readFile("common/vitest.config.ts");
    expect(content).toMatch(/json-summary/);
  });

  it("coverage thresholds が設定されている", () => {
    const content = readFile("common/vitest.config.ts");
    expect(content).toMatch(/thresholds/);
  });

  it("coverage reportsDirectory が coverage に設定されている", () => {
    const content = readFile("common/vitest.config.ts");
    expect(content).toMatch(/reportsDirectory/);
  });
});

describe("server vitest.config.ts の存在とカバレッジ設定 (Issue #71)", () => {
  it("server/vitest.config.ts が存在する", () => {
    expect(fileExists("server/vitest.config.ts")).toBe(true);
  });

  it("coverage プロバイダーとして v8 が設定されている", () => {
    const content = readFile("server/vitest.config.ts");
    expect(content).toMatch(/provider\s*:\s*["']v8["']/);
  });

  it("lcov レポーターが設定されている", () => {
    const content = readFile("server/vitest.config.ts");
    expect(content).toMatch(/lcov/);
  });

  it("json-summary レポーターが設定されている", () => {
    const content = readFile("server/vitest.config.ts");
    expect(content).toMatch(/json-summary/);
  });

  it("coverage thresholds が設定されている", () => {
    const content = readFile("server/vitest.config.ts");
    expect(content).toMatch(/thresholds/);
  });
});

describe("client vite.config.ts のカバレッジ設定 (Issue #71)", () => {
  it("coverage プロバイダーとして v8 が設定されている", () => {
    const content = readFile("client/vite.config.ts");
    expect(content).toMatch(/provider\s*:\s*["']v8["']/);
  });

  it("lcov レポーターが設定されている", () => {
    const content = readFile("client/vite.config.ts");
    expect(content).toMatch(/lcov/);
  });

  it("json-summary レポーターが設定されている", () => {
    const content = readFile("client/vite.config.ts");
    expect(content).toMatch(/json-summary/);
  });

  it("coverage thresholds が設定されている", () => {
    const content = readFile("client/vite.config.ts");
    expect(content).toMatch(/thresholds/);
  });
});

describe("root package.json に @vitest/coverage-v8 が追加されている (Issue #71)", () => {
  it("@vitest/coverage-v8 が devDependencies または dependencies に含まれている", () => {
    const content = readFile("package.json");
    expect(content).toMatch(/@vitest\/coverage-v8/);
  });
});

describe("CI ワークフローのカバレッジ設定 (Issue #71 / #507)", () => {
  // #507: カバレッジは turbo の test タスク（各 WS の test script が --coverage）で生成するため、
  // ci.yml 側に直接 --coverage を書かない（書くと2重実行になる）。
  it("actions/upload-artifact ステップが存在する", () => {
    const content = readFile(".github/workflows/ci.yml");
    expect(content).toMatch(/actions\/upload-artifact/);
  });

  it("davelosert/vitest-coverage-report-action ステップが存在する", () => {
    const content = readFile(".github/workflows/ci.yml");
    expect(content).toMatch(/davelosert\/vitest-coverage-report-action/);
  });
});

describe("各ワークスペースの test script が coverage 付き単一実行になっている (Issue #507)", () => {
  for (const ws of ["common", "server", "client"]) {
    it(`${ws}/package.json の test script が vitest run --coverage を実行する`, () => {
      const pkg = JSON.parse(readFile(`${ws}/package.json`)) as {
        scripts?: Record<string, string>;
      };
      const testScript = pkg.scripts?.test ?? "";
      expect(testScript).toMatch(/vitest\s+run/);
      expect(testScript).toMatch(/--coverage/);
    });
  }
});
