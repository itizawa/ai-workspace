# 設計書 #282 — チャンネル新着メッセージのドリップ表示

## 目的

1 回の生成でまとまって増えた複数メッセージを、一括同時描画ではなく **時間差 + タイピングインジケータ付きで 1 件ずつ** タイムラインに現すことで、AI 社員の会話が「いま立ち上がっている」観戦感を出す。サーバ・生成・API・OpenAPI は一切変更せず、client 内に閉じる（追加 API コールゼロ）。

## 受け入れ条件 → 実装方針の対応

| AC | 実装方針 |
|----|----------|
| 1. 新規増加分のみ時間差で 1 件ずつ表示（時系列維持） | `useMessageDrip` フックで「既に表示済みの id 集合」を ref 保持し、新規 id を末尾から順に `DRIP_INTERVAL_MS` 間隔で 1 件ずつ可視化。元配列の順序をそのまま使う。 |
| 2. 各メッセージ出現直前に発言者のタイピングインジケータを短時間表示 | 専用 `TypingIndicator` コンポーネント（`●●●` アニメ）。次に出すメッセージの発言者名で `TYPING_DURATION_MS` 表示してから本文へ切替。 |
| 3. 初回ロードは即時表示、以降の新着のみドリップ、リロードで再生しない | フック初回 commit 時点の全 id を「表示済み」として即マーク（ドリップ対象 0 件）。リロードでも初回扱いになるため過去ログは再生されない。 |
| 4. 間隔・表示時間を定数化、`prefers-reduced-motion` で即時表示 | `DRIP_INTERVAL_MS` / `TYPING_DURATION_MS` を module 定数化。`useMediaQuery("(prefers-reduced-motion: reduce)")` が true ならドリップ／タイピングを無効化し全件即時表示（`OfficeView` と整合）。 |
| 5. 表示制御ロジックを副作用から分離しテスト可能に | 純粋関数 `computeDrip`（`src/utils/messageDrip.ts`）で「表示済み id 集合 + 現メッセージ列」から「可視 id 集合・次にドリップする id」を算出。RTL + fake timers でフック挙動を検証。 |
| 6. サーバ・生成・API・OpenAPI 不変、追加コールなし | client コンポーネント／フック／util のみ追加・変更。API 呼び出しは増やさない。 |
| 7. `build test lint` 緑・一方向 import 維持 | 追加ファイルは `@hatchery/common` のみ参照（server 非依存）。 |

## 設計判断

### (a) 新着検出: メッセージ id 集合の diff

`useChannelMessages` は `MessageRecord[]`（永続化形・**安定 `id` 付き**）を返す。ID 集合の diff を採用する（件数差分だと先頭挿入・並び替えに弱い）。`ChannelView` の `messages` prop を `Message & { id?: string }` 相当に広げ、`id` があればそれを、無ければ index ベースのフォールバックキーを用いる（Storybook fixture は id 無しでも従来どおり即時全件表示される）。

- 初回 commit: 観測した全 id を `displayedIds` ref に投入 → ドリップ対象なし（即時表示）。
- 再 render で未知の id が出現 → それらを「新着キュー」とし、配列順のまま 1 件ずつ可視化していく。

### (b) タイピングインジケータ: 専用コンポーネント化

`TypingIndicator`（presentational・props: `name`）として切り出す。`ChannelView` 内のドリップ最中、次メッセージの直前に挿入表示する。Storybook / 単体テストで再利用・検証しやすい。

### 状態の置き場所

ドリップ進行状態（可視 id 集合・タイピング中の発言者・タイマー）はすべて `ChannelView` 内の `useMessageDrip` ローカル state に閉じる。サーバ状態は引き続き TanStack Query（`useChannelMessages`）に集約し、グローバル状態管理は導入しない（ADR-0003）。

## 追加・変更ファイル

- `client/src/utils/messageDrip.ts`（新規・純粋ロジック `computeDrip` と定数）
- `client/src/utils/messageDrip.test.ts`（新規・純粋ロジックのテスト）
- `client/src/hooks/useMessageDrip.ts`（新規・タイマー副作用を持つフック）
- `client/src/components/TypingIndicator.tsx`（新規・presentational）
- `client/src/components/ChannelView.tsx`（変更・ドリップ描画へ）
- `client/src/components/ChannelView.test.tsx`（追記・ドリップ／初回即時／reduced-motion）

## スコープ外

スレッドグルーピング表示（#250）、SSE/WebSocket による逐次ストリーミング、効果音。本 Issue はクライアント側表示アニメーションに限定。
