import type { UpdateEmployeeInput } from "@hatchery/common";

export interface EmployeeRecord {
  id: string;
  displayName: string;
  role: string | null;
  isBot: boolean;
  personality: string | null;
  /** 社員の画像 URL（#220）。#204 でアップロード基盤実装後に値が入る。現時点は null。 */
  imageUrl: string | null;
  /** 論理削除日時（#218）。null=有効、値=削除済み。 */
  deletedAt: Date | null;
}

export interface EmployeeRepository {
  findById(id: string): Promise<EmployeeRecord | null>;
  update(id: string, input: UpdateEmployeeInput): Promise<EmployeeRecord | null>;
  /** 複数 id の Employee をまとめて取得する。存在しない id は除外する（#53・定時バッチの発言者解決）。 */
  listByIds(ids: string[]): Promise<EmployeeRecord[]>;
  /** isBot=true の Employee を全件取得する（#240・仮想オフィス用）。論理削除済みは除外。 */
  listBotEmployees(): Promise<EmployeeRecord[]>;
  /** isBot=true の Employee を論理削除済みも含めて全件取得する（#218・メッセージ発言者名解決用）。 */
  listAllBotEmployees(): Promise<EmployeeRecord[]>;
  /** Employee を論理削除する（#218）。deletedAt をセットする。対象が存在しない場合は null を返す。 */
  softDelete(id: string): Promise<EmployeeRecord | null>;
  /** 論理削除済み含む Employee を id で取得する（#218・削除後の確認用）。 */
  findDeletedById(id: string): Promise<EmployeeRecord | null>;
  /** ワーカーの画像 URL を更新する（#204）。存在しない id は null を返す。 */
  updateImageUrl(id: string, imageUrl: string): Promise<EmployeeRecord | null>;
}

export class InMemoryEmployeeRepository implements EmployeeRepository {
  private readonly employees: EmployeeRecord[];

  constructor(employees: Array<Omit<EmployeeRecord, "deletedAt" | "imageUrl"> & { deletedAt?: Date | null; imageUrl?: string | null }> = []) {
    this.employees = employees.map((e) => ({ ...e, deletedAt: e.deletedAt ?? null, imageUrl: e.imageUrl ?? null }));
  }

  async findById(id: string): Promise<EmployeeRecord | null> {
    const found = this.employees.find((e) => e.id === id && e.deletedAt === null);
    return found ? { ...found } : null;
  }

  async update(id: string, input: UpdateEmployeeInput): Promise<EmployeeRecord | null> {
    const employee = this.employees.find((e) => e.id === id && e.deletedAt === null);
    if (!employee) return null;
    if (input.displayName !== undefined) employee.displayName = input.displayName;
    if (input.role !== undefined) employee.role = input.role;
    if (input.personality !== undefined) employee.personality = input.personality;
    return { ...employee };
  }

  async listByIds(ids: string[]): Promise<EmployeeRecord[]> {
    return ids
      .map((id) => this.employees.find((e) => e.id === id && e.deletedAt === null))
      .filter((e): e is EmployeeRecord => e !== undefined)
      .map((e) => ({ ...e }));
  }

  async listBotEmployees(): Promise<EmployeeRecord[]> {
    return this.employees.filter((e) => e.isBot && e.deletedAt === null).map((e) => ({ ...e }));
  }

  async listAllBotEmployees(): Promise<EmployeeRecord[]> {
    return this.employees.filter((e) => e.isBot).map((e) => ({ ...e }));
  }

  async softDelete(id: string): Promise<EmployeeRecord | null> {
    const employee = this.employees.find((e) => e.id === id && e.deletedAt === null);
    if (!employee) return null;
    employee.deletedAt = new Date();
    return { ...employee };
  }

  async findDeletedById(id: string): Promise<EmployeeRecord | null> {
    const found = this.employees.find((e) => e.id === id);
    return found ? { ...found } : null;
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<EmployeeRecord | null> {
    const employee = this.employees.find((e) => e.id === id);
    if (!employee) return null;
    employee.imageUrl = imageUrl;
    return { ...employee };
  }
}
