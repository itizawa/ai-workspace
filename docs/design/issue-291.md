# 設計書: Issue #291 — Result 型エラーハンドリング移行

## 概要

ユースケース・永続化層の想定内エラー（NotFound / Conflict / Forbidden 等）を、例外 throw から `Result<T, E>` 型による値返却に移行する。

## 受け入れ条件の解釈

1. **ADR-0021** を作成し、Result 型の採用と設計方針を記録する
2. `common` に `Result<T, E>` 型とドメインエラー型を追加する（外部ライブラリ不要の自前実装）
3. ユースケース関数のシグネチャを `Promise<Result<T, E>>` 化し、内部の AppError throw を Result の Err 値返却に置換する
4. ルート層で Result を判定し HTTP レスポンスに写像する。`errorHandler` は想定外例外の最終防壁として維持
5. 既存の HTTP 振る舞い（ステータスコード・エラーボディ）は不変
6. `pnpm turbo run build test lint` が緑

## 設計決定

### Result 型の実装方針

外部ライブラリ（neverthrow / fp-ts）を使わず、`common` に自前の軽量 Result 型を実装する。

**理由**:
- `common` の依存を最小限に保つ（ADR-0005）
- 依存ライブラリ追加なしに型安全なエラーハンドリングが実現できる
- 判別共用体（discriminated union）は TypeScript のネイティブ機能で十分表現できる

```typescript
// common/src/result/result.ts
export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;
```

### ドメインエラー型

```typescript
// common/src/result/domainError.ts
export type DomainErrorType = "NotFound" | "Conflict" | "Forbidden" | "BadRequest" | "InternalError";

export interface DomainError {
  type: DomainErrorType;
  message: string;
}

export const notFound = (message: string): DomainError => ({ type: "NotFound", message });
export const conflict = (message: string): DomainError => ({ type: "Conflict", message });
export const forbidden = (message: string): DomainError => ({ type: "Forbidden", message });
export const badRequest = (message: string): DomainError => ({ type: "BadRequest", message });
export const internalError = (message: string): DomainError => ({ type: "InternalError", message });
```

### ルート層での HTTP 写像

```typescript
// server/src/utils/resultToResponse.ts
export function resultToResponse(res: Response, result: Result<unknown, DomainError>): boolean {
  if (isOk(result)) return false; // 呼び出し元が成功レスポンスを担当
  
  const statusMap: Record<DomainErrorType, number> = {
    NotFound: 404,
    Conflict: 409,
    Forbidden: 403,
    BadRequest: 400,
    InternalError: 500,
  };
  res.status(statusMap[result.error.type]).json({ error: result.error.message });
  return true; // エラーレスポンス送信済み
}
```

### 想定内 / 想定外の境界

- **想定内（Result で表現）**: ドメインルールの違反（存在しないリソース・権限不足・重複登録等）
  - `NotFoundError` → `notFound(...)`
  - `ForbiddenError` → `forbidden(...)`
  - `ConflictError` → `conflict(...)`
  - `BadRequestError` → `badRequest(...)`
- **想定外（throw のまま）**: プログラミングエラー・インフラ障害（DB 接続失敗等）
  - `InternalServerError` は `internalError(...)` にマッピングも可能だが、throw を基本とする
  - Express の `errorHandler` が最終防壁として維持される

### 移行スコープ（段階適用）

規模が大きいため、代表経路に絞って移行する。全 throw の機械的撲滅は目的としない。

**移行対象**（代表的なドメインエラー経路）:
1. `channels.ts` ルート内の `NotFoundError` throw
2. `employees.ts` ルート内の `ForbiddenError` / `NotFoundError` throw
3. `planning-issues.ts` ルート内の `NotFoundError` throw

**移行対象外**（想定外例外・インフラ層の throw）:
- `requireAuth` / `requireAdmin` ミドルウェアの `UnauthorizedError` / `ForbiddenError`（ミドルウェア層の責務）
- `app.ts` の環境変数チェック throw
- `crypto.ts` の `InvalidCiphertext` throw
- Prisma エラー（DB 障害等）

### AppError 階層の扱い

既存の `AppError` 階層（`NotFoundError` 等）は **削除しない**（`errorHandler` が想定外例外を処理する際に依存している可能性があるため）。ただし、ユースケース経路では Result に移行するため、新規コードでは Result を使う。

## ファイル構成

```
common/src/
  result/
    result.ts          # Result<T, E> 型定義
    domainError.ts     # DomainError 型とファクトリ関数
    index.ts           # re-export
  errors/
    appError.ts        # 既存（変更なし）
    index.ts           # 既存（変更なし）
  index.ts             # result/ を追加

server/src/
  utils/
    resultToResponse.ts  # Result → HTTP レスポンス写像ユーティリティ
  routes/
    channels.ts          # Result を使った ChannelNotFound 処理
    employees.ts         # Result を使った EmployeeNotFound / Forbidden 処理
    planning-issues.ts   # Result を使った MessageNotFound 処理
```

## TDD 計画

1. `common/src/result/result.test.ts` — Result 型ファクトリ・型ガードのテスト
2. `common/src/result/domainError.test.ts` — DomainError ファクトリのテスト
3. `server/src/utils/resultToResponse.test.ts` — HTTP 写像ユーティリティのテスト
4. 既存ルートテスト（`channels.test.ts` / `employees.test.ts` 等）が緑のまま維持されることを確認

## ADR との関係

- **ADR-0005**: `common` に Result 型・DomainError を置くことで依存方向（server → common）を維持
- **ADR-0012**: DI パターンに変更なし
- **#288** (関数ファクトリ化): 同じ関数型志向の方向性。本 Issue は #288 と並行可能

## 外部契約（HTTP 振る舞い）

既存のルートテストがすべて緑であることをもって外部契約維持を確認する。ステータスコード・エラーボディ構造は変更しない。
