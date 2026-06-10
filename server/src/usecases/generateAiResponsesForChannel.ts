import {
  buildChannelConversationPrompt,
  calcPostedAtOffsets,
  formatRecentLog,
  parseConversationMessages,
} from "@hatchery/common";

import type { ConversationGenerator } from "../batch/aiMessageGenerator.js";
import { generateConversationWithClaude } from "../batch/aiMessageGenerator.js";
import type { AppSettingRepository } from "../persistence/appSettingRepository.js";
import type { ChannelMembershipRepository } from "../persistence/channelMembershipRepository.js";
import type { WorkerRepository } from "../persistence/workerRepository.js";
import type { MessageRepository } from "../persistence/messageRepository.js";
import { getApiKey } from "../utils/apiKey.js";

/** プロンプトに載せる直近メッセージ件数（#183）。 */
const RECENT_LIMIT = 30;

export interface GenerateAiResponsesDeps {
  membershipRepo: ChannelMembershipRepository;
  workerRepo: WorkerRepository;
  messageRepo: MessageRepository;
  appSettingRepo: AppSettingRepository;
  /** テスト用注入可能な会話生成関数。省略時は Claude を使う。 */
  generate?: ConversationGenerator;
}

/**
 * ユーザー投稿をトリガに AI 社員の掛け合いを非同期生成する（#183）。
 */
export async function generateAiResponsesForChannel(
  channelId: string,
  channelLabel: string,
  now: Date,
  deps: GenerateAiResponsesDeps,
): Promise<void> {
  try {
    const apiKey = await getApiKey(deps.appSettingRepo);
    if (!apiKey) {
      console.info(`[generateAiResponses] API キー未設定のためスキップ (channel=${channelId})`);
      return;
    }

    const memberIds = await deps.membershipRepo.listEmployeeIdsByChannel(channelId);
    const members = await deps.workerRepo.listByIds(memberIds);
    const bots = members.filter((e) => e.isBot);
    if (bots.length === 0) {
      return;
    }

    const recentDesc = await deps.messageRepo.listRecentByChannel(channelId, RECENT_LIMIT);
    const recentAsc = [...recentDesc].reverse();
    const recentLog = formatRecentLog(
      recentAsc.map((m) => ({
        community_id: m.channel,
        author: m.createdEmployeeId,
        text: m.text,
      })),
      RECENT_LIMIT,
    );

    const prompt = buildChannelConversationPrompt({
      channelLabel,
      workers: bots.map((e) => ({
        id: e.id,
        displayName: e.displayName,
        role: e.role,
        personality: e.personality,
      })),
      recentLog,
      summary: null,
    });

    const generate = deps.generate ?? generateConversationWithClaude;
    const raw = await generate(prompt, apiKey);
    const messages = parseConversationMessages(
      raw,
      channelId,
      bots.map((e) => e.id),
    );
    if (messages.length === 0) return;

    const postedAts = calcPostedAtOffsets(now, messages.length);
    await deps.messageRepo.createMany(
      messages.map((m, i) => ({ ...m, postedAt: postedAts[i] })),
    );
  } catch (err) {
    console.error(`[generateAiResponses] AI 会話生成に失敗しました (channel=${channelId}):`, err);
  }
}
