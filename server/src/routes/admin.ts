import { UpdateAppSettingSchema } from "@hatchery/common";
import { Router } from "express";

import { requireAuth } from "../middleware/requireAuth.js";
import { validateBody } from "../middleware/validateBody.js";
import type { AppSettingRepository } from "../persistence/appSettingRepository.js";
import { decrypt, encrypt, maskApiKey } from "../utils/crypto.js";

const MASKED_KEYS = new Set(["CLAUDE_API_KEY"]);

function toResponse(key: string, encryptedValue: string) {
  let rawValue = "";
  if (encryptedValue) {
    try {
      rawValue = decrypt(encryptedValue);
    } catch {
      // 復号に失敗した場合（不正な形式・古いデータ等）はマスク表示で隠す
      return { key, maskedValue: "****" };
    }
  }
  const maskedValue = MASKED_KEYS.has(key) ? maskApiKey(rawValue) : rawValue || null;
  return { key, maskedValue };
}

export function createAdminRouter(appSettingRepository: AppSettingRepository): Router {
  const router = Router();

  router.get("/settings", requireAuth, async (_req, res, next) => {
    try {
      const settings = await appSettingRepository.findAll();
      res.json(settings.map((s) => toResponse(s.key, s.value)));
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    "/settings",
    requireAuth,
    validateBody(UpdateAppSettingSchema),
    async (req, res, next) => {
      try {
        const { key, value } = req.body as { key: string; value: string };
        const encrypted = value ? encrypt(value) : "";
        const setting = await appSettingRepository.upsert(key, encrypted);
        res.json(toResponse(setting.key, setting.value));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

/**
 * バッチ実行時に使用する API キーを取得する。
 * DB の復号値を優先し、未設定なら環境変数 ANTHROPIC_API_KEY をフォールバックとして使う。
 */
export async function getApiKey(
  appSettingRepository: AppSettingRepository,
): Promise<string | undefined> {
  const setting = await appSettingRepository.findByKey("CLAUDE_API_KEY");
  if (setting?.value) {
    try {
      return decrypt(setting.value);
    } catch {
      // 復号失敗時は env フォールバック
    }
  }
  return process.env.ANTHROPIC_API_KEY ?? undefined;
}
