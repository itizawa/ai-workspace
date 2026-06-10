import {
  DEFAULT_CHANNELS,
  DEFAULT_WORKERS,
  WORKER_MESSAGE_TEMPLATES,
  buildRosterMessages,
  type Worker,
  type Channel,
  type Message,
} from "@hatchery/common";

import type { MessageGenerator } from "./runMessageBatch.js";

/** createRosterMessageGenerator のオプション。既定は MVP のワーカー・チャンネル・テンプレート。 */
export interface RosterMessageGeneratorOptions {
  channels?: readonly Channel[];
  workers?: readonly Worker[];
  templates?: Readonly<Record<string, readonly string[]>>;
  /** 1 チャンネルあたり発言させるワーカー数（既定 2）。 */
  perChannel?: number;
  /** 乱数源（既定 Math.random）。テストで決定的にするため注入可能。 */
  rng?: () => number;
  /**
   * チャンネル id → 所属 Worker id 群（#33）。
   * 指定すると、各チャンネルで所属する Worker のみを発言候補にする。
   * 未指定なら全 workers が候補（後方互換）。
   */
  membershipByChannel?: Readonly<Record<string, readonly string[]>>;
}

/**
 * MVP の定時バッチ用メッセージ生成器（#32）。
 * common の純粋ロジック buildRosterMessages を、既定のワーカー・チャンネル・静的テンプレートで束ねる。
 * AI 生成への差し替えは別 Issue（#53）。それまでは静的テンプレートからランダムに選ぶ。
 */
export function createRosterMessageGenerator(
  options: RosterMessageGeneratorOptions = {},
): MessageGenerator {
  const channels = options.channels ?? DEFAULT_CHANNELS;
  const workers = options.workers ?? DEFAULT_WORKERS;
  const templates = options.templates ?? WORKER_MESSAGE_TEMPLATES;
  const perChannel = options.perChannel ?? 2;
  const rng = options.rng ?? Math.random;
  const membershipByChannel = options.membershipByChannel;

  return (): Message[] =>
    buildRosterMessages({
      channels: channels.map((c) => c.id),
      workers,
      templates,
      perChannel,
      rng,
      membershipByChannel,
    });
}
