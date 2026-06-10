import { UpdateWorkerSchema, err, isErr, notFound, ok, type UpdateWorkerInput } from "@hatchery/common";
import { Router } from "express";

import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateBody } from "../middleware/validateBody.js";
import type { WorkerRepository } from "../persistence/workerRepository.js";
import { resultToResponse } from "../utils/resultToResponse.js";

export function createWorkersRouter(workerRepository: WorkerRepository): Router {
  const router = Router();

  router.get("/", (req, res, next) => {
    const includeDeleted = req.query["includeDeleted"] === "true";
    const listFn = includeDeleted
      ? () => workerRepository.listAllBotWorkers()
      : () => workerRepository.listBotWorkers();
    listFn()
      .then((workers) => res.status(200).json(workers))
      .catch(next);
  });

  router.patch(
    "/:id",
    requireAuth,
    requireAdmin,
    validateBody(UpdateWorkerSchema),
    (req, res, next) => {
      const { id } = req.params as { id: string };
      const input = req.body as UpdateWorkerInput;
      workerRepository
        .update(id, input)
        .then((worker) => {
          const result = worker ? ok(worker) : err(notFound("WorkerNotFound"));
          if (isErr(result)) { resultToResponse(res, result); return; }
          res.status(200).json(result.value);
        })
        .catch(next);
    },
  );

  return router;
}
