/**
 * API 呼び出し失敗（mutation reject）から、ユーザーに提示するエラーメッセージを取り出す（#476）。
 *
 * サーバ（`server/src/middleware/errorHandler.ts`）はエラーを `{ error: string }` 形のボディで返す。
 * client の API ヘルパはそれを `Error.message` に乗せて throw するが、openapi-fetch の生 error
 * オブジェクト（`{ error: string }`）が直接渡るケースにも備えて両形を扱う。
 *
 * @param error mutation/Promise の reject 値（unknown）
 * @param fallback 抽出できないときに表示する既定文言
 * @returns ユーザー向けエラーメッセージ
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "保存に失敗しました。時間をおいて再度お試しください。",
): string {
  if (error instanceof Error) {
    const msg = error.message.trim();
    return msg.length > 0 ? msg : fallback;
  }
  // openapi-fetch は非 2xx 時にパース済みボディを `error` として返す。サーバは `{ error: string }`。
  if (error !== null && typeof error === "object" && "error" in error) {
    const inner = (error as { error: unknown }).error;
    if (typeof inner === "string" && inner.trim().length > 0) {
      return inner.trim();
    }
  }
  return fallback;
}
