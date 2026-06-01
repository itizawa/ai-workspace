import type { UpdateEmployeeInput } from "@hatchery/common";

export interface EmployeeRecord {
  id: string;
  displayName: string;
  role: string | null;
  isBot: boolean;
  personality: string | null;
}

export interface EmployeeRepository {
  findById(id: string): Promise<EmployeeRecord | null>;
  update(id: string, input: UpdateEmployeeInput): Promise<EmployeeRecord | null>;
}

export class InMemoryEmployeeRepository implements EmployeeRepository {
  private readonly employees: EmployeeRecord[];

  constructor(employees: EmployeeRecord[] = []) {
    this.employees = employees.map((e) => ({ ...e }));
  }

  async findById(id: string): Promise<EmployeeRecord | null> {
    return this.employees.find((e) => e.id === id) ?? null;
  }

  async update(id: string, input: UpdateEmployeeInput): Promise<EmployeeRecord | null> {
    const employee = this.employees.find((e) => e.id === id);
    if (!employee) return null;
    if (input.displayName !== undefined) employee.displayName = input.displayName;
    if (input.role !== undefined) employee.role = input.role;
    if (input.personality !== undefined) employee.personality = input.personality;
    return { ...employee };
  }
}
