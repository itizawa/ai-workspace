import { NotFoundError } from "@hatchery/common";
import multer from "multer";
import { Router } from "express";

import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";
import type { EmployeeRepository } from "../persistence/employeeRepository.js";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  type StorageService,
} from "../services/storageService.js";

/**
 * admin 管理者向けワーカー画像アップロードルーター（#204 / ADR-0022）。
 * POST /api/admin/employees/:id/image
 *
 * - admin ロール必須（requireAuth + requireAdmin）
 * - multipart/form-data で `image` フィールドを受け取る
 * - MIME: image/png, image/jpeg, image/webp, image/gif のみ
 * - サイズ: 5MB 以下
 * - 成功時: { id, imageUrl } を返す
 */
export function createAdminEmployeeImageRouter(
  employeeRepository: EmployeeRepository,
  storageService: StorageService,
): Router {
  const router = Router();

  // multer を memoryStorage で設定（ファイルをメモリに保持し、GCS に転送する）。
  // fileFilter で MIME タイプを事前検証し、limits でサイズ上限を設定する。
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter(_req, file, callback) {
      const allowedMimes: readonly string[] = ALLOWED_IMAGE_MIME_TYPES;
      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        // false を渡すと req.file が undefined になるが、エラーは throw しない。
        // ハンドラー側で req.file を検証して 400 を返す。
        callback(null, false);
      }
    },
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  });

  router.post(
    "/employees/:id/image",
    requireAuth,
    requireAdmin,
    // multer ミドルウェア: サイズ超過は multer.MulterError を投げる
    (req, res, next) => {
      upload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ error: "FileTooLarge: image must be 5MB or less" });
          return;
        }
        if (err) {
          next(err);
          return;
        }
        next();
      });
    },
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string };

        // ファイルが未添付または MIME が無効（fileFilter で弾かれた）場合は 400
        if (!req.file) {
          res.status(400).json({
            error: `InvalidFile: image field is required. Allowed MIME types: ${ALLOWED_IMAGE_MIME_TYPES.join(", ")}`,
          });
          return;
        }

        // employee 存在確認
        const employee = await employeeRepository.findById(id);
        if (!employee) {
          throw new NotFoundError("EmployeeNotFound");
        }

        // GCS（または InMemory）にアップロード
        const imageUrl = await storageService.uploadWorkerImage({
          employeeId: id,
          mimeType: req.file.mimetype,
          buffer: req.file.buffer,
        });

        // DB の imageUrl を更新
        const updated = await employeeRepository.updateImageUrl(id, imageUrl);
        if (!updated) {
          throw new NotFoundError("EmployeeNotFound");
        }

        res.status(200).json({ id: updated.id, imageUrl: updated.imageUrl });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
