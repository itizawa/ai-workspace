# ADR-0014: 認可モデル（ABAC: 属性ベースアクセス制御）

- ステータス: Accepted
- 日付: 2026-06-07
- 関連 Issue: #169
- 関連 ADR: ADR-0010

## コンテキスト（背景）

現行の権限管理は **RBAC**（ロールベース: `admin` / `member` の 2 ロール）で実装されている:

- `common/src/domain/auth/auth.ts`: `UserRoleSchema = z.enum(["admin", "member"])` および純粋関数 `isAdmin(user)`
- `server/src/middleware/requireAdmin.ts`: `isAdmin` で管理操作をガード
- `server/src/middleware/requireAuth.ts`: 認証ガード（ADR-0010）

RBAC はシンプルだが、今後次のようなアクセス制御の要求が増える見込みである:

- **チャンネル単位のアクセス**: チャンネルへの閲覧・投稿可否（ロールだけでは判定不能）
- **本人限定の操作**: `ownerId` 一致による自分のリソースのみ操作（例: 自分の Employee プロフィール編集）
- **リソース属性との組み合わせ**: あるユーザーが特定チャンネルに所属しているかどうか、など

これらは「誰のロールが何か」だけでは判定できず、「subject・resource・action・environment の属性の組み合わせ」で決まる。ABAC（Attribute-Based Access Control）はその柔軟性を提供する。

認可モデルを ABAC に定めることはアーキテクチャ上の重要な決定であり、ADR として正本を確定する。

## 決定

**認可モデルを ABAC（属性ベースアクセス制御）とする。** ポリシー評価ロジックは `common` の純粋関数として実装し、server の middleware と client のガードがそれを呼ぶ。

具体的な方針:

### 属性モデル（4 要素）

| 要素 | 内容 | 代表的な属性 |
|------|------|------------|
| **subject** | 操作者（認証済みユーザー） | `id`, `role` (`admin`/`member`), `employeeId`, 所属チャンネル |
| **resource** | 操作対象のリソース | 種別 (`channel`/`employee`/`message` 等), `id`, `ownerId`, `channelId` |
| **action** | 操作の種類 | `read`, `post`, `update`, `delete`, `manage` |
| **environment** | 環境情報（必要な場合のみ） | リクエスト時刻、IP 等（MVP では未使用） |

### ポリシー評価の置き場

- **`common` の純粋関数**（DOM / Express / Prisma 非依存）としてポリシー評価関数を実装する
- 依存方向 `client → common` / `server → common` の一方向を厳守する（ADR-0005）
- server の middleware および client のガードは common のポリシー関数を呼ぶ（ロジックを持たない）
- TDD 可能（UI/DB 不要）

### 現行 RBAC からの移行方針

| 現行 | ABAC での再表現 |
|------|----------------|
| `isAdmin(user)` | `checkPolicy({ subject: user, resource: { type: 'admin-panel' }, action: 'manage' })` で吸収 |
| `requireAdmin` middleware | `requirePolicy('manage', { type: 'admin-panel' })` のような共通 middleware に置き換え |
| `admin`/`member` ロール | subject の属性 `role` として継続保持（UserRoleSchema は変更しない） |

移行は段階的に行う: 既存の `isAdmin` / `requireAdmin` は後続 Issue で ABAC ポリシー評価へ置き換える。

### 代表ポリシー例（3 ユースケース）

**(a) 管理操作（admin 画面 / ユーザー管理）**

```
allow if:
  subject.role == "admin"
  AND action in ["manage", "delete", "update"]
  AND resource.type in ["admin-panel", "user-management"]
```

**(b) チャンネル単位のアクセス（閲覧・投稿可否）**

```
allow read if:
  subject.channelIds includes resource.channelId
  OR subject.role == "admin"

allow post if:
  subject.channelIds includes resource.channelId
  AND action == "post"
```

**(c) 本人限定の操作（`ownerId` 一致による本人限定）**

```
allow update/delete if:
  subject.id == resource.ownerId
  OR subject.role == "admin"
```

## 理由

### ABAC を選んだ理由

- **RBAC の限界**: 2 ロールでは「チャンネル単位」「本人限定」などの属性ベース判定を表現できない
- **拡張性**: 今後増える複合的な権限要件（チャンネル所属・ownerId 一致等）に、ポリシーを追加するだけで対応できる
- **`common` への集約**: ドメインロジックを common に置く ADR-0005 の方針と整合。UIとサーバの両方から同じポリシーを呼べる
- **TDD 可能性**: 純粋関数のため、DB や HTTP なしで全ポリシーをユニットテストできる

### `common` 純粋関数の根拠

- ADR-0005 の原則: common はアプリ固有パッケージに依存しない実行環境非依存の純粋 TypeScript
- ポリシー評価は「入力（属性オブジェクト）→ 出力（allow/deny）」の純粋変換に収まる
- server middleware と client ガードの両方が同じロジックを参照できる（二重実装の排除）

## 検討した代替案

- **RBAC 継続（ロール追加で対応）**: 現行の `admin`/`member` にロールを増やす案。チャンネル単位や本人限定などの「リソース属性との組み合わせ」はロール追加だけでは表現できないため不採用。
- **ACL（アクセス制御リスト）直接管理**: リソースごとにユーザーの許可リストを持つ案。柔軟だが管理コストが高く、ポリシーの一元化が難しい。ABAC の方が汎用的に表現できるため不採用。
- **OPA（Open Policy Agent）等の外部ポリシーエンジン**: 強力だがインフラ依存が増える。MVP 規模では overkill。`common` の純粋関数として実装すれば十分なため不採用。
- **server のみでポリシー評価**: client でも事前に表示制御（ボタン非表示等）したいケースがあり、`common` に置く方が DRY になる。client → common の依存方向は許容されているため `common` 採用。

## 影響（結果）

**良い影響:**

- 今後の複合権限要件（チャンネル単位・本人限定等）に一貫したパターンで対応できる
- `common` 純粋関数による TDD が容易
- server と client で同じポリシーロジックを共有できる

**トレードオフ / 注意点:**

- 現行 `isAdmin` / `requireAdmin` の置き換えは後続 Issue で段階的に行う（本 ADR では実装しない）
- ABAC はシンプルな RBAC より概念的なオーバーヘッドがある（subject/resource/action の設計を丁寧に行う必要がある）
- environment 属性（時刻 / IP 等）は MVP では不要だが、ポリシーインターフェースとして予約する

**フォローアップが必要なこと（後続 Issue に分割）:**

1. `common` に ABAC ポリシー評価関数を TDD 実装（`isAdmin` を policy で再表現）
2. `server/src/middleware/requireAdmin.ts` を ABAC ポリシー評価へ置換
3. チャンネル単位アクセス / `ownerId` 本人限定ポリシーの適用
