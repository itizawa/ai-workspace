# 設計書: docs: URL 一覧（画面ルーティング表）の設計書を作成し、各画面の設計書へリンクする (#105)

## 1. 目的 / 背景

アプリの URL（クライアント画面ルート）は各 Issue の設計書（`docs/design/issue-<N>.md`）や ADR に断片的に散らばっており、全 URL を一覧できる単一の場所がない。新しい画面を追加・変更するたびに「どの URL が存在し、どの画面・設計書に対応するか」を把握するのが難しい。

そこで、アプリの全クライアント画面 URL を 1 枚のテーブルで俯瞰でき、各行から対応する画面の設計書へリンクで辿れる「目次」ドキュメント `docs/design/url-list.md` を新規作成する。今後 URL を追加する際の単一の置き場所（単一情報源）を定める。

## 2. スコープ（やること / やらないこと）

### やること

- `docs/design/url-list.md` を新規作成する。
- 全クライアント画面 URL を 1 つの Markdown テーブルにまとめる（列: URL / パス・画面名・概要・認証・設計書）。
- パス表記を TanStack Router の実体（`$param` 形式）に統一する。
- 各行の「設計書」列を、対応する画面設計書への有効な相対リンクにする（リンク先ファイルが実在すること）。
- ドキュメント冒頭に運用方針（この表が URL の単一情報源であり画面追加時はここに 1 行追加する旨）を明記する。
- URL を洗い出した根拠（参照元: `client/src/router.tsx` および各設計書）を辿れるようにする。

### やらないこと

- 新しい画面・ルートの実装（本 Issue はドキュメント整備のみ）。
- サーバ API エンドポイント（`POST /communities` 等）の一覧化。

## 3. 受け入れ条件（テストに落とせる粒度で箇条書き）

- [ ] `docs/design/url-list.md` が新規作成されている。
- [ ] 全クライアント画面 URL が 1 つの Markdown テーブルにまとまっている（URL / パス・画面名・概要・認証・設計書 の 5 列を持つ）。
- [ ] パス表記が `$param` 形式に統一されており、表記ゆれ（`:param` / `{param}`）が文書内（テーブル）に混在していない。
- [ ] 各行の「設計書」列に書かれた相対リンク（`./issue-<N>.md`）のリンク先ファイルが `docs/design/` に実在する。
- [ ] `client/src/router.tsx` で定義された全ルート（`/`・`/communities`・`/communities/$slug`・`/posts/$postId`・`/login`・`/admin`・`/account`・`/invite/$token`）がテーブルに 1 行ずつ存在する。
- [ ] ドキュメント冒頭に「URL の単一情報源（目次）であり画面追加時はここに 1 行追加する」旨の運用方針が記載されている。

## 4. 設計方針（アーキ・データ構造・主要モジュール）

- **正本は実コード `client/src/router.tsx`。** Issue 本文は旧ルート（`/channels/:channelId`・`/settings` 等）を例示しているが、Reddit 風 UI への移行（#307）でルーティングは刷新済みのため、実装済みの実コードを正とする（Issue 備考「実装済みの場合は実コードと突き合わせる」に従う）。
- パス表記は TanStack Router の実体である `$param` 形式に統一する。
- テーブルの各行の「設計書」列は `docs/design/` 内の実在ファイルへの相対リンク（`./issue-<N>.md`）にする。複数関連する場合は併記する。
- 検証は「テーブルから抽出した相対リンク先がすべて `docs/design/` に実在するか」「`router.tsx` の全ルートパスがテーブルに含まれるか」を確認するテスト（Node スクリプト）で機械的に担保する。

### ルートと設計書の対応（`client/src/router.tsx` 由来）

| パス | 画面 | 主な設計書 |
|------|------|-----------|
| `/` | HomeFeedScene | issue-341 / issue-307 |
| `/communities` | CommunityBrowseScene | issue-307 |
| `/communities/$slug` | CommunityScene | issue-307 / issue-257 |
| `/posts/$postId` | PostThreadScene | issue-307 |
| `/login` | LoginScene | issue-26 / issue-108 |
| `/admin` | SettingsScene（管理画面） | issue-25 / issue-136 |
| `/account` | AccountScene | issue-50 / issue-51 |
| `/invite/$token` | AcceptInvitationScene | issue-134 / issue-132 |

## 5. 影響範囲 / 既存への変更（対象ワークスペース: client / server / common / docs）

- **docs**: `docs/design/url-list.md`（新規）・`docs/design/issue-105.md`（本設計書）。
- 検証テストの置き場所は `tests/`（リポジトリ規約テスト・`pnpm test:repo`）。クライアントコードや実行コードには一切変更を加えない。

## 6. テスト計画（TDDで書くテスト一覧）

`tests/url-list.test.ts`（Vitest・`pnpm test:repo`）:

1. `docs/design/url-list.md` が存在する。
2. ドキュメント内に Markdown テーブルが 1 つ存在し、ヘッダに「URL / パス」「画面名」「概要」「認証」「設計書」の 5 列を持つ。
3. テーブルの URL 列に表記ゆれ（`:param` / `{param}`）が含まれない（`$param` 形式に統一されている）。
4. テーブルの「設計書」列から抽出した相対リンク（`./issue-<N>.md`）がすべて `docs/design/` に実在する。
5. `client/src/router.tsx` の全ルートパスがテーブルの URL 列に含まれている。
6. 冒頭に運用方針（単一情報源・1 行追加）を示す文言が含まれる。

## 7. リスク・未決事項

- Issue 本文の例示ルート（`/channels/:channelId` 等）は廃止済みのため採用しない。判断は Reddit 風 UI 移行 ADR（ADR-0018〜0020）と #307 設計書に基づく。
- 今後ルートが増えた際にテーブルと `router.tsx` がずれるリスクは、受け入れ条件 5（router.tsx の全ルートがテーブルに含まれること）を検証するテストで継続的に検知できる。
