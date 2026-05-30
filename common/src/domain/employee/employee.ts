import { z } from "zod";

/**
 * AI 社員。MVP に必要な最小限（id・displayName・role）。
 * キャラクター・バイブルの詳細（語彙の井戸など）は Phase 1 のプロンプト設計 Issue に委ねる（設計書 §7）。
 */
export const EmployeeSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  role: z.string().min(1).optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;

/**
 * MVP の既定 AI 社員（3 人）。client / server が共有する単一情報源（ADR-0005）。
 * id は既存のドメインロジック・テスト（selectAppearingMembers / message）と整合する haru / ken / mei。
 * 表示名・役割は MVP 暫定で、正典の社員定義（Phase 1 のプロンプト設計）が固まれば差し替える。
 */
export const DEFAULT_EMPLOYEES: readonly Employee[] = [
  { id: "haru", displayName: "haru", role: "ムードメーカー" },
  { id: "ken", displayName: "ken", role: "ベテラン" },
  { id: "mei", displayName: "mei", role: "新人" },
];
