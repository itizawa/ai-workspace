import type { Scene } from "@hatchery/common";
import type { PrismaClient } from "@prisma/client";

import type { SceneRecord, SceneRepository } from "./sceneRepository.js";

/** SceneRepository の Prisma / PostgreSQL 実装。 */
export class PrismaSceneRepository implements SceneRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<SceneRecord[]> {
    const scenes = await this.prisma.scene.findMany({
      include: { messages: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    return scenes.map((s) => ({
      id: s.id,
      scene: s.summary,
      createdAt: s.createdAt,
      messages: s.messages.map((m) => ({ speaker: m.speaker, channel: m.channel, text: m.text })),
    }));
  }

  async create(input: Scene): Promise<SceneRecord> {
    const created = await this.prisma.scene.create({
      data: {
        summary: input.scene,
        messages: {
          create: input.messages.map((m, index) => ({
            speaker: m.speaker,
            channel: m.channel,
            text: m.text,
            order: index,
          })),
        },
      },
      include: { messages: { orderBy: { order: "asc" } } },
    });
    return {
      id: created.id,
      scene: created.summary,
      createdAt: created.createdAt,
      messages: created.messages.map((m) => ({
        speaker: m.speaker,
        channel: m.channel,
        text: m.text,
      })),
    };
  }
}
