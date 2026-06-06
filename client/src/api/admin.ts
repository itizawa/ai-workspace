import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppSettingResponse } from "@hatchery/common";

import { openApiClient } from "./client.js";

export const ADMIN_SETTINGS_QUERY_KEY = ["admin", "settings"] as const;

export type { AppSettingResponse };

/**
 * GET /admin/settings を openApiClient（生成型・baseUrl 解決）経由で取得する（ADR-0006・#110）。
 * 生の相対 fetch はクロスオリジン配信（#78）で baseUrl が前置されず壊れるため openApiClient に統一。
 */
export async function fetchSettings(): Promise<AppSettingResponse[]> {
  const { data, error } = await openApiClient.GET("/admin/settings", { credentials: "include" });
  if (error) throw new Error(`GET /admin/settings failed: ${JSON.stringify(error)}`);
  return data ?? [];
}

/** PATCH /admin/settings を openApiClient 経由で更新する（#110）。成功時は更新後の設定を返す。 */
export async function patchSetting(key: string, value: string): Promise<AppSettingResponse> {
  const { data, response } = await openApiClient.PATCH("/admin/settings", {
    body: { key, value },
    credentials: "include",
  });
  if (!response.ok || !data) throw new Error(`PATCH /admin/settings failed: ${response.status}`);
  return data;
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: fetchSettings,
  });
}

export function useSaveAdminSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => patchSetting(key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_QUERY_KEY }),
  });
}
