/**
 * Result<T, E> — 失敗を値として表現する判別共用体型（ADR-0021）。
 *
 * 想定内のドメインエラー（NotFound / Conflict / Forbidden 等）を Ok / Err の値として扱い、
 * 型安全なエラーハンドリングを実現する。想定外の例外（インフラ障害等）は従来通り throw する。
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

/** 成功値をラップした Ok を返す。 */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/** エラー値をラップした Err を返す。 */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** Result が Ok かどうかを型ガードで判定する。 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

/** Result が Err かどうかを型ガードで判定する。 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;
