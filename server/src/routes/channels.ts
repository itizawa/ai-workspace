import {
  AddChannelMemberSchema,
  CreateChannelMessageSchema,
  CreateChannelSchema,
  UpdateChannelSchema,
  err,
  isErr,
  notFound,
  ok,
  type CreateChannelInput,
  type UpdateChannelInput,
} from "@hatchery/common";
import { Router } from "express";

import type { ConversationGenerator } from "../batch/aiMessageGenerator.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateBody } from "../middleware/validateBody.js";
import type { AppSettingRepository } from "../persistence/appSettingRepository.js";
import type { ChannelRepository } from "../persistence/channelRepository.js";
import type { ChannelMembershipRepository } from "../persistence/channelMembershipRepository.js";
import type { WorkerRepository } from "../persistence/workerRepository.js";
import type { MessageRepository } from "../persistence/messageRepository.js";
import { addChannelMember, removeChannelMember } from "../usecases/channelMembers.js";
import { generateAiResponsesForChannel } from "../usecases/generateAiResponsesForChannel.js";
import { resultToResponse } from "../utils/resultToResponse.js";

/** AI 会話生成に必要な追加依存（#183）。未指定時は AI 生成をスキップ。 */
export interface AiGenerationDeps {
  workerRepo: WorkerRepository;
  appSettingRepo: AppSettingRepository;
  /** テスト用注入可能な会話生成関数。省略時は Claude を使う。 */
  generate?: ConversationGenerator;
}

/**
 * /channels ルータ。チャンネル更新（#37）と Employee 所属管理（#33）、メッセージ投稿（#48）を担う。
 */
export function createChannelsRouter(
  membershipRepo: ChannelMembershipRepository,
  channelRepo: ChannelRepository,
  messageRepo: MessageRepository,
  aiDeps?: AiGenerationDeps,
): Router {
  const router = Router();

  router.get("/", (_req, res, next) => {
    channelRepo
      .list()
      .then((channels) => res.status(200).json(channels))
      .catch(next);
  });

  router.post("/", requireAuth, validateBody(CreateChannelSchema), (req, res, next) => {
    const { label, type, goal } = req.body as CreateChannelInput;
    channelRepo
      .create({ label, type, goal })
      .then((channel) => res.status(201).json(channel))
      .catch(next);
  });

  router.patch("/:id", requireAuth, validateBody(UpdateChannelSchema), (req, res, next) => {
    const { id } = req.params as { id: string };
    const input = req.body as UpdateChannelInput;
    channelRepo
      .update(id, input)
      .then((channel) => {
        const result = channel ? ok(channel) : err(notFound("ChannelNotFound"));
        if (isErr(result)) { resultToResponse(res, result); return; }
        res.status(200).json(result.value);
      })
      .catch(next);
  });

  router.get("/:channelId/messages", (req, res, next) => {
    const { channelId } = req.params as { channelId: string };
    messageRepo
      .listByChannel(channelId)
      .then((messages) => res.status(200).json(messages))
      .catch(next);
  });

  router.post(
    "/:channelId/messages",
    requireAuth,
    validateBody(CreateChannelMessageSchema),
    (req, res, next) => {
      const { channelId } = req.params as { channelId: string };
      const user = req.user!;
      if (!user.employeeId) {
        res.status(400).json({ error: "EmployeeNotLinked" });
        return;
      }
      const { text } = req.body as { text: string };
      channelRepo
        .findById(channelId)
        .then((channel) => {
          const channelResult = channel ? ok(channel) : err(notFound("ChannelNotFound"));
          if (isErr(channelResult)) { resultToResponse(res, channelResult); return; }
          const foundChannel = channelResult.value;
          const now = new Date();
          return messageRepo
            .createMany([{ createdEmployeeId: user.employeeId!, channel: channelId, text, postedAt: now }])
            .then(([created]) => {
              res.status(201).json(created);
              if (aiDeps) {
                void generateAiResponsesForChannel(channelId, foundChannel.label, now, {
                  membershipRepo,
                  workerRepo: aiDeps.workerRepo,
                  messageRepo,
                  appSettingRepo: aiDeps.appSettingRepo,
                  generate: aiDeps.generate,
                });
              }
            });
        })
        .catch(next);
    },
  );

  router.get("/:channelId/employees", (req, res, next) => {
    membershipRepo
      .listEmployeeIdsByChannel(req.params.channelId)
      .then((ids) => res.status(200).json(ids))
      .catch(next);
  });

  router.post(
    "/:channelId/employees",
    requireAuth,
    validateBody(AddChannelMemberSchema),
    (req, res, next) => {
      const { channelId } = req.params as { channelId: string };
      const { employeeId } = req.body as { employeeId: string };
      addChannelMember(membershipRepo, channelId, employeeId)
        .then(() => res.status(201).json({ channelId, employeeId }))
        .catch(next);
    },
  );

  router.delete("/:channelId/employees/:employeeId", requireAuth, (req, res, next) => {
    const { channelId, employeeId } = req.params as { channelId: string; employeeId: string };
    removeChannelMember(membershipRepo, channelId, employeeId)
      .then(() => res.status(204).end())
      .catch(next);
  });

  return router;
}
