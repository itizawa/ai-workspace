import { UpdateEmployeeSchema, err, forbidden, isErr, notFound, ok, type UpdateEmployeeInput } from "@hatchery/common";
import { Router } from "express";

import { requireAuth } from "../middleware/requireAuth.js";
import { validateBody } from "../middleware/validateBody.js";
import type { EmployeeRepository } from "../persistence/employeeRepository.js";
import { resultToResponse } from "../utils/resultToResponse.js";

export function createEmployeesRouter(employeeRepository: EmployeeRepository): Router {
  const router = Router();

  router.get("/", (_req, res, next) => {
    employeeRepository
      .listBotEmployees()
      .then((employees) => res.status(200).json(employees))
      .catch(next);
  });

  router.patch(
    "/:id",
    requireAuth,
    validateBody(UpdateEmployeeSchema),
    (req, res, next) => {
      const { id } = req.params as { id: string };
      const user = req.user!;

      if (user.employeeId !== id) {
        resultToResponse(res, err(forbidden("Forbidden")));
        return;
      }

      const input = req.body as UpdateEmployeeInput;
      employeeRepository
        .update(id, input)
        .then((employee) => {
          const result = employee ? ok(employee) : err(notFound("EmployeeNotFound"));
          if (isErr(result)) { resultToResponse(res, result); return; }
          res.status(200).json(result.value);
        })
        .catch(next);
    },
  );

  return router;
}
