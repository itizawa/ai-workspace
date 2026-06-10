# Issue #329 設計書: Employee → Worker リネーム

## 目的

コードベース全体で「Employee（社員）」という命名を「Worker（ワーカー）」に統一する。
Hatchery のドメイン概念を一貫させ、将来の拡張（人間ユーザーを含む「Worker」概念への発展）に備える。

## 変更範囲と設計判断

### 1. common: ドメイン定義

`common/src/domain/employee/` → `common/src/domain/worker/`

- `EmployeeSchema` → `WorkerSchema`
- `type Employee` → `type Worker`
- `DEFAULT_EMPLOYEES` → `DEFAULT_WORKERS`
- `EMPLOYEE_MESSAGE_TEMPLATES` → `WORKER_MESSAGE_TEMPLATES`

### 2. server: Prisma スキーマ

`model Employee` → `model Worker` + `@@map("workers")` を追加（DB テーブルを `workers` に変更）。

マイグレーション: `ALTER TABLE "Employee" RENAME TO "workers";`

Prisma クライアントの `prisma.employee.*` → `prisma.worker.*`

### 3. server: 永続化層

- `employeeRepository.ts` → `workerRepository.ts`
- `prismaEmployeeRepository.ts` → `prismaWorkerRepository.ts`
- `EmployeeRecord` → `WorkerRecord`
- `InMemoryEmployeeRepository` → `InMemoryWorkerRepository`

### 4. server: ルート

- `employees.ts` → `workers.ts`
- `adminEmployeeImage.ts` → `adminWorkerImage.ts`
- API パス `/api/employees` → `/api/workers`

### 5. client: API 層・コンポーネント

- `employees.ts` → `workers.ts`
- `AdminEmployeeTab.tsx` → `AdminWorkerTab.tsx`
- `EmployeeTable.tsx` → `WorkerTable.tsx`
- `EditEmployeeDialog.tsx` → `EditWorkerDialog.tsx`
- `AddEmployeeDialog.tsx` → `AddWorkerDialog.tsx`

## 注意事項

- レガシーフィールド `createdEmployeeId`（Message ドメイン）・`employeeId`（channelMembership/User）は改変しない
- DB マイグレーションは `prisma migrate dev` 不要（SQL ファイルを手動作成）
