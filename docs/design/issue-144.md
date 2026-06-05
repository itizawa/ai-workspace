# 設計書: .dockerignore が client/docs を全除外し server の Docker build が失敗する (#144)

## 1. 目的 / 背景

`Deploy Server (dev)` の WIF 認証通過後、Docker build ステップが失敗する:

```
#17 [stage-1 7/14] COPY client/package.json ./client/
#17 ERROR: failed to calculate checksum ... "/client/package.json": not found
#19 [stage-1 8/14] COPY docs/package.json ./docs/
#19 ERROR: ... "/docs/package.json": not found
```

root の `.dockerignore` が `client` / `docs` ディレクトリを丸ごと除外しているのに、`server/Dockerfile` は pnpm workspace 解決のため両ディレクトリの `package.json` を COPY する（builder/本番の両ステージ）。除外によりコンテキストから消えた `package.json` が not found になる。#78 由来の潜在バグで、これまで WIF 認証で手前で落ちていたため未顕在だった。

## 2. スコープ（やること / やらないこと）

### やること
- `.dockerignore` で `client/` `docs/` の中身は除外したまま、`client/package.json` / `docs/package.json` だけを再include する。
- Dockerfile が COPY する各ワークスペースの `package.json` がコンテキストに残ることを保証する回帰防止テストを追加する。

### やらないこと
- `server/Dockerfile` の構成変更（COPY 構造は維持）。
- Cloud Run / GCP の設定変更（スコープ外）。
- client 側デプロイ（#141 で対応済み）。

## 3. 受け入れ条件（テストに落とせる粒度）

1. `.dockerignore` が `client/package.json` と `docs/package.json` を再include する（除外行の後に `!client/package.json` / `!docs/package.json` がある）。
2. `client/` `docs/` 配下の `package.json` 以外（ソース等）は引き続き除外される（再include は `package.json` に限定）。
3. 回帰防止の不変条件: `server/Dockerfile` が `COPY <dir>/package.json ./<dir>/` で参照する各 `<dir>`（common / server / client / docs）について、その `<dir>/package.json` が `.dockerignore` 適用後に **net で include される**（=除外されない）ことをテストで検証する。
4. `pnpm test:repo` / `pnpm lint` が緑。

## 4. 設計方針

- `.dockerignore` の「開発・ドキュメント」ブロックを次の形にする。`!` 再include は最後に評価され、ディレクトリ除外後でも個別ファイルを呼び戻せる（docker BuildKit の挙動。ローカル検証済み）:
  ```
  client
  !client/package.json
  docs
  !docs/package.json
  ```
- テストは `tests/` のリポジトリ規約テストとして実装する（vitest, `test:repo`）。docker を実行せず、`.dockerignore` のルールと `server/Dockerfile` の `COPY` 行を静的に突き合わせる:
  - `server/Dockerfile` から `COPY <dir>/package.json` 行を抽出し、各 `<dir>/package.json` を取り出す。
  - `.dockerignore` のパターン列を順に評価する単純なマッチャ（後勝ち。`!` で再include）を実装し、各 `package.json` パスが最終的に include されることを assert する。
  - 併せて `client/src/...` のようなサンプルパスが除外されたままであることも assert（再include の限定性）。

## 5. 影響範囲 / 既存への変更

- `.dockerignore`（再include 行 2 つを追加）
- `tests/dockerignore-workspace.test.ts`（新規・回帰防止テスト）
- 対象ワークスペース: ルート（Docker ビルド設定）/ CI（server デプロイ）

## 6. テスト計画（TDD で書くテスト）

`tests/dockerignore-workspace.test.ts`:
- `.dockerignore` 適用後、`server/Dockerfile` が COPY する全ワークスペースの `package.json`（common/server/client/docs）が include される。
- `client/package.json` / `docs/package.json` が明示的に再include される。
- `client/src/index.tsx` 等の非 package.json パスは除外されたまま（再include の限定性）。

## 7. リスク・未決事項

- `.dockerignore` マッチャはテスト用に最小実装（docker の全仕様の再現ではなく、本ケースに必要な「ディレクトリ除外 + ファイル再include + 後勝ち」を表現）。docker 実機検証はローカルで別途実施済み（COPY 成功・非対象ファイルは除外維持）。
- 本修正後、Docker build → Cloud Run deploy まで到達する見込み（実到達はマージ後の develop push で確認）。
