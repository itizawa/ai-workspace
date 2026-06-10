import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@hatchery/client": path.resolve(__dirname, "../client/src"),
      "@hatchery/common": path.resolve(__dirname, "../common/src"),
    },
  },
  // vite/esbuild のデフォルト include は .ts/.mts/.tsx のみで .cts を TS 変換しない。
  // .storybook/main.cts（CommonJS TS）を test から import するため .cts も変換対象に加える。
  esbuild: {
    include: [/\.[cm]?[jt]sx?$/],
  },
  test: {
    // MarkdownDoc など React コンポーネントのレンダリングを RTL で検証するため jsdom を使う。
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
