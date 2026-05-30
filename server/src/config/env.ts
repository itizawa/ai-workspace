/** server プロセスの実行設定。環境変数から読み出す（テスト容易性のため source を注入可能にする）。 */
export interface ServerEnv {
  /** Express API プロセスの待受ポート。未指定なら 3000。 */
  port: number;
  /** Prisma / PostgreSQL の接続先。バッチ・API の永続化で使う。未設定なら undefined。 */
  databaseUrl: string | undefined;
}

const DEFAULT_PORT = 3000;

/** 環境変数から ServerEnv を構築する。 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const rawPort = source.PORT;
  return {
    port: rawPort ? Number(rawPort) : DEFAULT_PORT,
    databaseUrl: source.DATABASE_URL,
  };
}
