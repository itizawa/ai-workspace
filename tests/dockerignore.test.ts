import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dockerignorePath = path.join(repoRoot, ".dockerignore");
const dockerfilePath = path.join(repoRoot, "server", "Dockerfile");

function parseDockerignore(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function isExcludedByDockerignore(filePath: string, rules: string[]): boolean {
  let excluded = false;
  for (const rule of rules) {
    const isNegation = rule.startsWith("!");
    const pattern = isNegation ? rule.slice(1) : rule;
    if (matchesPattern(filePath, pattern)) {
      excluded = !isNegation;
    }
  }
  return excluded;
}

function matchesPattern(filePath: string, pattern: string): boolean {
  if (pattern === filePath) return true;
  if (filePath.startsWith(pattern + "/")) return true;
  return false;
}

function extractCopiedPackageJsonPaths(dockerfileContent: string): string[] {
  return dockerfileContent
    .split("\n")
    .flatMap((line) => {
      const match = line.match(/^COPY\s+(\S+\/package\.json)\s+/);
      return match ? [match[1]] : [];
    });
}

describe("受け入れ条件 #1: client/package.json と docs/package.json が再 include される", () => {
  it("client/package.json は除外されない", () => {
    const rules = parseDockerignore(readFileSync(dockerignorePath, "utf8"));
    expect(isExcludedByDockerignore("client/package.json", rules)).toBe(false);
  });

  it("docs/package.json は除外されない", () => {
    const rules = parseDockerignore(readFileSync(dockerignorePath, "utf8"));
    expect(isExcludedByDockerignore("docs/package.json", rules)).toBe(false);
  });
});

describe("受け入れ条件 #2: client/ docs/ 配下のその他ファイルは引き続き除外される", () => {
  it("client/src/main.ts は除外される", () => {
    const rules = parseDockerignore(readFileSync(dockerignorePath, "utf8"));
    expect(isExcludedByDockerignore("client/src/main.ts", rules)).toBe(true);
  });

  it("docs/adr/0001.md は除外される", () => {
    const rules = parseDockerignore(readFileSync(dockerignorePath, "utf8"));
    expect(isExcludedByDockerignore("docs/adr/0001.md", rules)).toBe(true);
  });
});

describe("受け入れ条件 #3: Dockerfile の COPY */package.json が全て除外されない（回帰防止）", () => {
  it("Dockerfile が client/package.json と docs/package.json を参照している", () => {
    const dockerfileContent = readFileSync(dockerfilePath, "utf8");
    const paths = extractCopiedPackageJsonPaths(dockerfileContent);
    expect(paths).toContain("client/package.json");
    expect(paths).toContain("docs/package.json");
  });

  it("Dockerfile が参照する全 package.json が .dockerignore で除外されない", () => {
    const rules = parseDockerignore(readFileSync(dockerignorePath, "utf8"));
    const dockerfileContent = readFileSync(dockerfilePath, "utf8");
    const paths = extractCopiedPackageJsonPaths(dockerfileContent);
    for (const p of paths) {
      expect(
        isExcludedByDockerignore(p, rules),
        `${p} は .dockerignore で除外されてはならない`,
      ).toBe(false);
    }
  });
});
