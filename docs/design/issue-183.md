# 設計書: チャンネル投稿をトリガに AI 社員の会話を生成し posted_at で予約表示する (#183)

## 1. 目的 / 背景

ユーザーがチャンネルにメッセージを投稿したとき、AI 社員の掛け合いを非同期に生成し、
`postedAt` フィールドによる遅延表示で「投げた → 少し待つと社員が反応する」体験を作る。

## 2. スコープ（やること / やらないこと）

**やること:**
- `Message` モデルに `postedAt DateTime` フィールドを追加し、マイグレーションを作成する
- `listByChannel` を `postedAt <= now()` 絞り込み + `postedAt` 昇順に変更する
- ユーザー投稿の `postedAt` は投稿時刻（即時表示）
- ユーザー投稿後、非同期で AI 社員の掛け合いを生成し、未来の `postedAt` で保存する
- `postedAt` オフセット計算を common の純粋関数として実装・TDD する
- エラー時はユーザー投稿は成功させ、AI 生成のみ握りつぶしてログを残す

**やらないこと:**
- AI 生成のリトライ・レート制御の作り込み
- プロンプトのキャラクター性高度化
- #53 定時バッチの変更（既存バッチは触れない）
- トークン使用量記録 (#153)

## 3. 受け入れ条件（テストに落とせる粒度）

1. `postedAt DateTime @default(now())` が Message モデルに追加され、マイグレーションが作成される
2. `listByChannel` が `postedAt <= now()` の message のみ返す（未来分は返さない）
3. `listByChannel` の並び順は `postedAt` 昇順 → `order` 昇順
4. ユーザー投稿時の `postedAt` は保存時刻（即時表示）
5. ユーザー投稿に対して非同期で AI 会話が生成・保存される（未来の `postedAt` 付き）
6. AI 生成失敗時もユーザー投稿は 201 成功し、エラーは握りつぶされてログを残す
7. `calcPostedAtOffsets` 純粋関数が common に TDD 済みで存在する
8. `MessageRecordSchema` に `postedAt: z.date()` が追加される

## 4. 設計方針

### 4.1 postedAt フィールド

- `Message` モデルに `postedAt DateTime @default(now())` を追加
- インデックス: `@@index([channel, postedAt])` を追加（`@@index([channel, createdAt])` は維持）
- `MessageRecordSchema` に `postedAt: z.date()` を追加
- 既存行マイグレーション: `UPDATE "Message" SET "postedAt" = "createdAt"`

### 4.2 createMany 入力型

`MessageCreateInput` (server-local type) = `{ speaker, channel, text, postedAt?: Date }`
- `postedAt` 省略時は `new Date()` (now) をデフォルトとする
- `Message` 型（common）は変更しない（postedAt なし）
- 既存の `createMany(Message[])` 呼び出し側（バッチ等）は変更不要（Message が MessageCreateInput に代入可能）

### 4.3 calcPostedAtOffsets（common 純粋関数）

```typescript
calcPostedAtOffsets(
  baseTime: Date,
  count: number,
  options?: { baseDelayMs?: number; intervalMs?: number }
): Date[]
```

- `baseDelayMs` (default: 60_000 ms = 1 min): 1 番目の AI メッセージまでの遅延
- `intervalMs` (default: 30_000 ms = 30 sec): AI メッセージ間の間隔
- 例: count=3, base=T → [T+1min, T+1min30sec, T+2min]

### 4.4 generateAiResponsesForChannel（server usecase）

非同期ユースケース。チャンネル情報・所属 Employee・直近ログを使って Claude に 1 コールし、
生成された AI メッセージを未来の `postedAt` で DB に保存する。

```typescript
interface GenerateAiResponsesDeps {
  membershipRepo: ChannelMembershipRepository;
  employeeRepo: EmployeeRepository;
  messageRepo: MessageRepository;
  appSettingRepo: AppSettingRepository;
  generate?: ConversationGenerator;
}

async function generateAiResponsesForChannel(
  channelId: string,
  channelLabel: string,
  now: Date,
  deps: GenerateAiResponsesDeps,
): Promise<void>
```

エラー（API キー未設定・生成失敗・検証失敗）は全て内部で catch してログを残し、void を返す。

### 4.5 channels.ts 更新

- POST `/:channelId/messages` に `employeeRepo` と `appSettingRepo`（`aiDeps`）を渡す
- ユーザー message 保存 → 201 返却 → `void` で非同期に `generateAiResponsesForChannel` を呼ぶ
- `aiDeps` が未指定（テスト・旧インターフェース）の場合は AI 生成をスキップ

### 4.6 app.ts 更新

- `createChannelsRouter` に `employeeRepository` と `appSettingRepository` を渡す

## 5. 影響範囲

- **common**: `message.ts`（MessageRecordSchema）、新規 `calcPostedAtOffsets.ts`、`index.ts`（export追加）
- **server**: `schema.prisma`、新マイグレーション、`messageRepository.ts`、`prismaMessageRepository.ts`、`channels.ts`、新規 `usecases/generateAiResponsesForChannel.ts`、`app.ts`
- **client**: `postedAt` フィールドが `MessageRecord` に追加される（openapi-typescript 再生成で自動反映）

## 6. テスト計画（TDD）

1. `calcPostedAtOffsets.test.ts` (common): count=0/1/3 のオフセット計算を検証
2. `generateAiResponsesForChannel.test.ts` (server): 
   - AI 生成成功 → 未来の postedAt で保存されること
   - AI キー未設定 → void（保存なし・エラーなし）
   - AI 生成失敗 → void（ユーザー投稿は保存済み・エラー握りつぶし）
3. `channels.test.ts` / `messages.test.ts` (server): listByChannel が postedAt フィルタを適用すること

## 7. リスク・未決事項

- 非同期生成はリクエストハンドラ外で実行するため、Node.js プロセスが終了すると途中で止まる可能性がある（MVP では許容）
- `postedAt` のデフォルト遅延・間隔は MVP 固定値（1 min / 30 sec）。将来調整できるよう定数として定義する
