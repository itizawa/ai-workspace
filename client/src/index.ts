/**
 * @hatchery/client のパッケージ API（docs(#9)/Storybook 等が参照する純粋な表面）。
 * SPA 本体（React / MUI / TanStack）は main.tsx 以下に実装し、本 barrel には UI を持ち込まない
 * （docs の node 実行時に React を読み込ませないため）。
 *
 * client → common の実依存は SPA 側（components/ChannelList が common の DEFAULT_CHANNELS を描画）で
 * 表現する。許可方向（client → common の一方向）は #4 の ESLint 境界で機械的に強制される。
 */

/** docs(#9) の placeholder が参照する純粋関数（パッケージ API が存在することを示す最小例）。 */
export const total = (a: number, b: number): number => a + b;
