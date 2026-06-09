# 設計書: チャンネル詳細のヘッダをスクロール方向に応じて表示／非表示する (#302)

## 1. 目的 / 背景

チャンネル詳細画面のヘッダ（チャンネル名 + 編集ボタン）が現在スクロールコンテナ内に置かれており、メッセージと一緒に流れてしまう。モバイルアプリで一般的な「下スクロールでヘッダを隠して本文を広く・上スクロールで即ヘッダを出す」挙動を実装し、フェードアニメーションで快適な観察体験を提供する。

## 2. スコープ（やること / やらないこと）

**やること**
- チャンネルヘッダを sticky 化（スクロールコンテナ上部に固定）
- スクロール方向判定の純粋関数 `computeHeaderVisibility` の実装
- `useHideOnScroll` カスタムフックの実装
- フェード + 上方向スライドのアニメーション
- `prefers-reduced-motion` 対応（常時表示・アニメーション無効化）

**やらないこと**
- サーバ / OpenAPI / common への変更
- メッセージドリップ表示（#282）、モバイルドロワー（#190）

## 3. 受け入れ条件（テストに落とせる粒度で箇条書き）

1. `computeHeaderVisibility(prevScrollTop, currentScrollTop, threshold, currentVisible)` が正しく判定する
   - 下スクロール（delta > threshold）→ false
   - 上スクロール（delta < -threshold）→ true
   - currentScrollTop <= 0（最上部）→ true
   - |delta| < threshold（微小スクロール）→ currentVisible を維持
2. `useHideOnScroll` フックがスクロールイベントを受けて `visible` 状態を更新する
3. `ChannelView` の `headerVisible={false}` でヘッダに `data-visible="false"` が付く
4. `ChannelView` の `headerVisible={true}`（デフォルト）でヘッダに `data-visible="true"` が付く
5. `prefers-reduced-motion` 時は `headerVisible={false}` でも `data-visible="true"`
6. 既存の `ChannelView.test.tsx` テスト群がすべて通る

## 4. 設計方針

### ファイル構成（変更ファイル）

| ファイル | 変更種別 |
|----------|----------|
| `client/src/utils/scrollHeader.ts` | 新規（純粋関数） |
| `client/src/utils/scrollHeader.test.ts` | 新規（単体テスト） |
| `client/src/hooks/useHideOnScroll.ts` | 新規（カスタムフック） |
| `client/src/hooks/useHideOnScroll.test.ts` | 新規（フックテスト） |
| `client/src/components/ChannelView.tsx` | 変更（`headerVisible` prop 追加 + sticky + animation） |
| `client/src/components/ChannelView.test.tsx` | 変更（テスト追加） |
| `client/src/routes/ChannelScene.tsx` | 変更（`useHideOnScroll` 適用） |

### 純粋関数 `computeHeaderVisibility`

```typescript
// client/src/utils/scrollHeader.ts
export const HEADER_SCROLL_THRESHOLD = 5;  // px

export function computeHeaderVisibility(
  prevScrollTop: number,
  currentScrollTop: number,
  threshold: number,
  currentVisible: boolean,
): boolean {
  if (currentScrollTop <= 0) return true;
  const delta = currentScrollTop - prevScrollTop;
  if (Math.abs(delta) < threshold) return currentVisible;
  return delta < 0;
}
```

### カスタムフック `useHideOnScroll`

`ChannelScene` のスクロールコンテナに `onScroll` を渡して検知。フック内で `prevScrollTopRef` を保持し副作用をカプセル化する。

### `ChannelView` の変更

- `headerVisible?: boolean`（デフォルト `true`）を追加
- `prefersReducedMotion` 時は強制的に `true`（既存の `useMediaQuery` を流用）
- ヘッダ Stack を `position: sticky; top: 0; z-index: 1; bgcolor: background.paper` で sticky 化
- `data-visible={effectiveVisible ? "true" : "false"}` 属性を付与（テスタビリティ）
- `opacity` + `transform: translateY` トランジション（`HEADER_TRANSITION_MS = 200` ms）

## 5. 影響範囲 / 既存への変更

- **client のみ**（common / server / OpenAPI 不変）
- `ChannelView.tsx`: 後方互換性あり（`headerVisible` は省略可、デフォルト true）
- `ChannelScene.tsx`: `useHideOnScroll` を組み込む

## 6. テスト計画

| テストファイル | テスト内容 |
|----------------|------------|
| `scrollHeader.test.ts` | 下スクロール→false / 上スクロール→true / 最上部→true / 微小→維持（2パターン） |
| `useHideOnScroll.test.ts` | 初期 visible=true / 下スクロールで false / 上スクロールで true に戻る |
| `ChannelView.test.tsx` | headerVisible=false → data-visible="false" / デフォルト → "true" / reduced-motion → 常時 "true" |

## 7. リスク・未決事項

- sticky 効果は `overflow: auto` の親スコープ内に限定される（既存の `ChannelScene` 構造で問題なし）
- ヘッダが非表示中は `opacity: 0` + `pointer-events: none` にしてクリック誤操作を防ぐ
