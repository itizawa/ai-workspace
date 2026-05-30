/**
 * @hatchery/server 雛形。実体（Express / Prisma / 定時バッチ）は #6 で差し替える。
 *
 * #4 の placeholder は common の `add` を再利用して server → common を示していたが、
 * #5 で `add` が実ドメイン API へ置き換わり参照不能になった。#7 では CI を緑に保つための
 * 最小修復として `add` 依存を外し、純粋な placeholder に留める（実 server → common 依存は
 * #6 の Express/Prisma 実装で導入される）。
 */
export const sum = (a: number, b: number): number => a + b;
