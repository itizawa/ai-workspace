import { z } from "zod";

/**
 * AI 社員。MVP に必要な最小限（id・displayName・role）。
 * キャラクター・バイブルの詳細（語彙の井戸など）は Phase 1 のプロンプト設計 Issue に委ねる（設計書 §7）。
 */
export const EmployeeSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  role: z.string().min(1).optional(),
  // #49: AI 社員（true）とユーザー所有社員（false）を区別する。省略時は false。
  isBot: z.boolean().default(false),
});

/**
 * 型は `z.input` から導出し、`isBot` を型レベルでは任意にする（#49）。
 * `.default(false)` により `parse` 後は常に `boolean` が埋まるため実行時の保証は保たれるが、
 * 出力型（`z.infer`）だと `isBot` が必須になり、id/displayName のみで Employee を組み立てる
 * 既存のフィクスチャ・呼び出し側（#25/#32/#33 等）が型エラーになる。これを避けるための選択。
 */
export type Employee = z.input<typeof EmployeeSchema>;

/**
 * MVP の既定 AI 社員（3 人）。client / server が共有する単一情報源（ADR-0005）。
 * id は既存のドメインロジック・テスト（selectAppearingMembers / message）と整合する haru / ken / mei。
 * 表示名・役割は MVP 暫定で、正典の社員定義（Phase 1 のプロンプト設計）が固まれば差し替える。
 */
export const DEFAULT_EMPLOYEES: readonly Employee[] = [
  { id: "haru", displayName: "haru", role: "ムードメーカー", isBot: true },
  { id: "ken", displayName: "ken", role: "ベテラン", isBot: true },
  { id: "mei", displayName: "mei", role: "新人", isBot: true },
];

/**
 * employee ID → displayName の解決関数を生成する（メッセージの発言者名表示などで共有）。
 * 内部で id→displayName の索引を 1 度だけ構築し、以降の解決を O(1) にする。
 * 未解決の ID は ID をそのままフォールバックとして返す（呼び出し側で表示の破綻を防ぐ）。
 * 純粋関数（React/DOM 非依存）として common に置き、client / server が共有する（ADR-0005）。
 */
export const createDisplayNameResolver = (
  employees: readonly Employee[] = DEFAULT_EMPLOYEES,
): ((employeeId: string) => string) => {
  const displayNameById = new Map(employees.map((e) => [e.id, e.displayName]));
  return (employeeId: string): string => displayNameById.get(employeeId) ?? employeeId;
};
