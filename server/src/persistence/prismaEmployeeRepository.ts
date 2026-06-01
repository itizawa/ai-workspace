import type { UpdateEmployeeInput } from "@hatchery/common";
import type { PrismaClient } from "@prisma/client";

import type { EmployeeRecord, EmployeeRepository } from "./employeeRepository.js";

export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<EmployeeRecord | null> {
    const row = await this.prisma.employee.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      displayName: row.displayName,
      role: row.role,
      isBot: row.isBot,
      personality: row.personality,
    };
  }

  async update(id: string, input: UpdateEmployeeInput): Promise<EmployeeRecord | null> {
    try {
      const row = await this.prisma.employee.update({
        where: { id },
        data: {
          ...(input.displayName !== undefined && { displayName: input.displayName }),
          ...(input.role !== undefined && { role: input.role }),
          ...(input.personality !== undefined && { personality: input.personality }),
        },
      });
      return {
        id: row.id,
        displayName: row.displayName,
        role: row.role,
        isBot: row.isBot,
        personality: row.personality,
      };
    } catch {
      return null;
    }
  }
}
