import { z } from "zod";

/** アプリ設定のキーバリューエントリ（DB の AppSetting モデルに対応）。 */
export const AppSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  updatedAt: z.date(),
});

export type AppSetting = z.infer<typeof AppSettingSchema>;

/** 設定を更新するリクエストボディ。key と value を指定する。 */
export const UpdateAppSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export type UpdateAppSettingInput = z.infer<typeof UpdateAppSettingSchema>;

/** API レスポンス用: value はマスク表示。 */
export const AppSettingResponseSchema = z.object({
  key: z.string(),
  maskedValue: z.string().nullable(),
});

export type AppSettingResponse = z.infer<typeof AppSettingResponseSchema>;
