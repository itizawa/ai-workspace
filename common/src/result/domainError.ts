/**
 * DomainError — 判別可能なドメインエラー型（ADR-0021）。
 *
 * 想定内のエラー（NotFound / Conflict / Forbidden / BadRequest / InternalError）を
 * 判別共用体として表現する。Result<T, DomainError> で使用する。
 */
export type DomainErrorType =
  | "NotFound"
  | "Conflict"
  | "Forbidden"
  | "BadRequest"
  | "InternalError";

export interface DomainError {
  readonly type: DomainErrorType;
  readonly message: string;
}

/** リソースが見つからない場合のエラー（HTTP 404 相当）。 */
export const notFound = (message: string): DomainError => ({ type: "NotFound", message });

/** リソースが重複・競合する場合のエラー（HTTP 409 相当）。 */
export const conflict = (message: string): DomainError => ({ type: "Conflict", message });

/** 権限不足の場合のエラー（HTTP 403 相当）。 */
export const forbidden = (message: string): DomainError => ({ type: "Forbidden", message });

/** リクエストが不正な場合のエラー（HTTP 400 相当）。 */
export const badRequest = (message: string): DomainError => ({ type: "BadRequest", message });

/** 内部エラー（HTTP 500 相当）。想定内の処理でエラーとして扱いたい場合に使用する。 */
export const internalError = (message: string): DomainError => ({ type: "InternalError", message });
