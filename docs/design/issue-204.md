# Issue #204 設計書: ワーカー画像の admin アップロード（GCS 保存）

## 目的

admin が管理画面からワーカー（Employee）の画像をアップロードし、フィード（投稿・コメントのアバター）や管理画面に反映する。GCS を外部ストレージとして採用する（ADR-0021）。

## 保存方式の決定

**サーバ経由アップロード**を採用する（ADR-0021 参照）。

- client → server（multipart/form-data）→ GCS（Google Cloud Storage）
- 理由: Cloud Run の Workload Identity Federation（ADR-0011）をそのまま流用でき、クライアントに GCS 認証情報を渡す署名付き URL 方式より管理が簡素。
- 命名規約: `workers/{employeeId}/{uuid}.{ext}`
- 公開方式: bucket を uniform access + allUsers の objectViewer で公開。URL は `https://storage.googleapis.com/{BUCKET}/{key}`
- 権限: admin ロールのみ。member は 403 / 未認証は 401。

## ローカル開発の代替手段

GCS 認証が取れないローカル環境では `GCS_BUCKET_NAME` 環境変数が未設定の場合に **InMemory モック**に切り替える（本番は必須設定）。InMemory モックはアップロードを受け付け `https://example.com/mock-{uuid}.jpg` 形式の URL を返す。

## データモデル変更

### common

`EmployeeSchema` に `avatarUrl` フィールドを追加（null 許容）:

```ts
avatarUrl: z.string().url().max(2048).optional()
```

`UpdateEmployeeSchema` からは除外（admin 専用 API で更新するため）。

### Prisma (server)

`Employee` モデルに `avatarUrl` カラムを追加:

```prisma
avatarUrl String?
```

migration ファイルで `ALTER TABLE "Employee" ADD COLUMN "avatarUrl" TEXT;`

## API 設計

### POST /api/admin/workers/:id/avatar

- 認証: admin ロール必須（requireAuth + requireAdmin）
- Content-Type: `multipart/form-data`
- フィールド: `file`（画像ファイル）
- 検証:
  - MIME: `image/png`, `image/jpeg`, `image/webp`, `image/gif` のみ許可。それ以外は 400
  - サイズ: 5MB 以下。超過は 400
- レスポンス: `{ avatarUrl: string }`（GCS URL）
- 404: worker が存在しない
- 401: 未認証
- 403: admin 以外

OpenAPI レジストリに登録する。

## EmployeeRepository 変更

`EmployeeRecord` に `avatarUrl: string | null` を追加。

メソッド追加:
- `updateAvatarUrl(id: string, avatarUrl: string): Promise<EmployeeRecord | null>`

## GCS アップロード基盤

```ts
// server/src/utils/gcsStorage.ts
interface StorageClient {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>; // public URL
}
```

- `GcsStorageClient`: `@google-cloud/storage` を使用。Workload Identity で認証。
- `InMemoryStorageClient`: ローカル開発・テスト用モック。

## client 変更

### WorkerAvatarUpload コンポーネント

`client/src/components/WorkerAvatarUpload.tsx` を新設。

- MUI Avatar + hidden input[type="file"] による UI
- `accept="image/png,image/jpeg,image/webp,image/gif"` を設定
- 選択時に即時プレビュー → upload → TanStack Query invalidate

### Admin API クライアント追加

`client/src/api/admin.ts` に `uploadWorkerAvatar` 関数を追加。

```ts
async function uploadWorkerAvatar(workerId: string, file: File): Promise<string>
```

openApiClient は `multipart/form-data` に対応しているため使用する。

### SettingsScene の EmployeeTable

`EmployeeTable` コンポーネントに `onAvatarUpload` コールバック prop を追加し、各行にアバター表示 + アップロードボタンを組み込む。

## アバター表示反映

- `EmployeeTable`: アバター列に MUI Avatar を表示。`avatarUrl` が null なら displayName の頭文字をイニシャルとして表示。
- フィード（将来の Post/Comment 表示）: Worker モデルに `avatarUrl` があるため、フィード実装時に使用可能。

## TDD 計画

### common テスト

`common/src/domain/employee/employee.test.ts` に追加:
- `avatarUrl` フィールドが任意で parse できる
- 2048 文字超の URL が reject される

### server テスト

`server/src/routes/admin.test.ts` に追加:
- POST /api/admin/workers/:id/avatar
  - 未認証 → 401
  - member ロール → 403
  - 不正 MIME → 400
  - サイズ超過 → 400
  - admin + 有効ファイル → 200 + avatarUrl
  - 存在しない workerId → 404

### client テスト

`client/src/components/WorkerAvatarUpload.test.tsx` を新設:
- ファイル選択時にプレビューが更新される
- アップロード成功時に invalidate が呼ばれる

## 受け入れ条件チェックリスト

1. [x] 設計書 + ADR-0021（GCS 採用）
2. [x] common: avatarUrl フィールド追加・.max() 設定
3. [x] server: GCS 基盤・migration・API・OpenAPI 登録
4. [x] client: WorkerAvatarUpload コンポーネント・openApiClient 経由
5. [x] 表示反映: EmployeeTable にアバター表示（未設定時はイニシャル）
6. [x] TDD カバレッジ
7. [x] pnpm turbo run build|test|lint 緑
