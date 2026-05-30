import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryChannelMembershipRepository } from "./channelMembershipRepository.js";

describe("InMemoryChannelMembershipRepository", () => {
  let repo: InMemoryChannelMembershipRepository;

  beforeEach(() => {
    repo = new InMemoryChannelMembershipRepository();
  });

  it("追加した所属を listEmployeeIdsByChannel で取得できる", async () => {
    await repo.addMember("zatsudan", "haru");
    expect(await repo.listEmployeeIdsByChannel("zatsudan")).toEqual(["haru"]);
  });

  it("1 つのチャンネルに複数 Employee が所属できる", async () => {
    await repo.addMember("zatsudan", "haru");
    await repo.addMember("zatsudan", "ken");
    expect(new Set(await repo.listEmployeeIdsByChannel("zatsudan"))).toEqual(
      new Set(["haru", "ken"]),
    );
  });

  it("1 人の Employee が複数チャンネルに所属できる（多対多）", async () => {
    await repo.addMember("zatsudan", "haru");
    await repo.addMember("shigoto", "haru");
    expect(new Set(await repo.listChannelIdsByEmployee("haru"))).toEqual(
      new Set(["zatsudan", "shigoto"]),
    );
  });

  it("同じ所属の重複追加は冪等（1 件のまま）", async () => {
    await repo.addMember("zatsudan", "haru");
    await repo.addMember("zatsudan", "haru");
    expect(await repo.listEmployeeIdsByChannel("zatsudan")).toEqual(["haru"]);
  });

  it("removeMember で所属を除外できる", async () => {
    await repo.addMember("zatsudan", "haru");
    await repo.addMember("zatsudan", "ken");
    await repo.removeMember("zatsudan", "haru");
    expect(await repo.listEmployeeIdsByChannel("zatsudan")).toEqual(["ken"]);
  });

  it("存在しない所属の除外はエラーにならない", async () => {
    await expect(repo.removeMember("zatsudan", "nobody")).resolves.toBeUndefined();
  });

  it("listMembershipByChannel はチャンネル→Employee id 配列のマップを返す", async () => {
    await repo.addMember("zatsudan", "haru");
    await repo.addMember("zatsudan", "ken");
    await repo.addMember("shigoto", "mei");
    const map = await repo.listMembershipByChannel();
    expect(new Set(map.zatsudan)).toEqual(new Set(["haru", "ken"]));
    expect(map.shigoto).toEqual(["mei"]);
  });
});
