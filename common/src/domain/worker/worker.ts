import { z } from "zod";

export const WORKER_DISPLAY_NAME_MAX_LENGTH = 50;
export const WORKER_ROLE_MAX_LENGTH = 50;
/** 画像 URL の最大文字数（#220・#91）。 */
export const WORKER_IMAGE_URL_MAX_LENGTH = 500;

export const WorkerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).max(WORKER_DISPLAY_NAME_MAX_LENGTH),
  role: z.string().min(1).max(WORKER_ROLE_MAX_LENGTH).optional(),
  isBot: z.boolean().default(false),
  personality: z.string().max(500).optional(),
  imageUrl: z.string().url().max(WORKER_IMAGE_URL_MAX_LENGTH).optional(),
  avatarUrl: z.string().url().max(2048).optional(),
  deletedAt: z.union([z.string().datetime(), z.date()]).nullable().optional(),
});

export type Worker = z.infer<typeof WorkerSchema>;

export const UpdateWorkerSchema = z.object({
  displayName: z.string().min(1).max(WORKER_DISPLAY_NAME_MAX_LENGTH).optional(),
  role: z.string().min(1).max(WORKER_ROLE_MAX_LENGTH).optional(),
  personality: z.string().max(500).optional(),
});

export type UpdateWorkerInput = z.infer<typeof UpdateWorkerSchema>;

export const CreateWorkerSchema = z.object({
  displayName: z.string().min(1).max(WORKER_DISPLAY_NAME_MAX_LENGTH),
  role: z.string().min(1).max(WORKER_ROLE_MAX_LENGTH).optional(),
  personality: z.string().max(500).optional(),
});

export type CreateWorkerInput = z.infer<typeof CreateWorkerSchema>;

export const DEFAULT_WORKERS: readonly Worker[] = [
  { id: "haru", displayName: "haru", role: "ムードメーカー", isBot: true },
  { id: "ken", displayName: "ken", role: "ベテラン", isBot: true },
  { id: "mei", displayName: "mei", role: "新人", isBot: true },
];

export const formatWorkerDisplayName = (worker: {
  displayName: string;
  deletedAt?: Date | string | null;
}): string => {
  if (worker.deletedAt != null) {
    return `【削除済み】${worker.displayName}`;
  }
  return worker.displayName;
};

export const createDisplayNameResolver = (
  workers: readonly Worker[] = DEFAULT_WORKERS,
): ((workerId: string) => string) => {
  const displayNameById = new Map(
    workers.map((w) => [w.id, formatWorkerDisplayName({ displayName: w.displayName, deletedAt: w.deletedAt ?? null })]),
  );
  return (workerId: string): string => displayNameById.get(workerId) ?? workerId;
};

export const createAvatarUrlResolver = (
  workers: readonly Worker[] = DEFAULT_WORKERS,
): ((workerId: string) => string | undefined) => {
  const imageUrlById = new Map(workers.map((w) => [w.id, w.imageUrl]));
  return (workerId: string): string | undefined => imageUrlById.get(workerId);
};
