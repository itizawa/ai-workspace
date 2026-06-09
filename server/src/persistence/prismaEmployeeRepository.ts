import type { UpdateEmployeeInput } from "@hatchery/common";
import { Prisma, type PrismaClient } from "@prisma/client";

import type { EmployeeRecord, EmployeeRepository } from "./employeeRepository.js";

/** Prisma の Employee 行を EmployeeRecord に変換する（共通ヘルパ）。 */
function toRecord(row: {
  id: string;
  displayName: string;
  role: string | null;
  isBot: boolean;
  personality: string | null;
  deletedAt: Date | null;
}): EmployeeRecord {
  return {
    id: row.id,
    displayName: row.displayName,
    role: row.role,
    isBot: row.isBot,
    personality: row.personality,
    // #220: imageUrl は #204 のアップロード基盤実装後に DB カラム追加予定。現時点は null。
    imageUrl: null,
    deletedAt: row.deletedAt,
  };
}

export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<EmployeeRecord | null> {
    const row = await this.prisma.employee.findUnique({ where: { id, deletedAt: null } });
    if (!row) return null;
    return toRecord(row);
  }

  async update(id: string, input: UpdateEmployeeInput): Promise<EmployeeRecord | null> {
    try {
      const row = await this.prisma.employee.update({
        where: { id, deletedAt: null },
        data: {
          ...(input.displayName !== undefined && { displayName: input.displayName }),
          ...(input.role !== undefined && { role: input.role }),
          ...(input.personality !== undefined && { personality: input.personality }),
        },
      });
      return toRecord(row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return null;
      }
      throw err;
    }
  }

  async listByIds(ids: string[]): Promise<EmployeeRecord[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.employee.findMany({ where: { id: { in: ids }, deletedAt: null } });
    const byId = new Map(rows.map((row) => [row.id, row]));
    // 入力 id の順序を保って返す（存在しない id は除外）。
    return ids
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => row != null)
      .map((row) => toRecord(row));
  }

  async listBotEmployees(): Promise<EmployeeRecord[]> {
    const rows = await this.prisma.employee.findMany({ where: { isBot: true, deletedAt: null } });
    return rows.map((row) => toRecord(row));
  }

  async softDelete(id: string): Promise<EmployeeRecord | null> {
    try {
      const row = await this.prisma.employee.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return toRecord(row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return null;
      }
      throw err;
    }
  }

  async findDeletedById(id: string): Promise<EmployeeRecord | null> {
    const row = await this.prisma.employee.findUnique({ where: { id } });
    if (!row) return null;
    return toRecord(row);
  }
}
