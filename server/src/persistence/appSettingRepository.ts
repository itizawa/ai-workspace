import type { AppSetting } from "@hatchery/common";

export interface AppSettingRepository {
  /** 全設定エントリを返す。 */
  findAll(): Promise<AppSetting[]>;
  /** key で 1 件取得する。存在しない場合は null。 */
  findByKey(key: string): Promise<AppSetting | null>;
  /** 設定を upsert する（key が存在すれば更新・なければ作成）。 */
  upsert(key: string, value: string): Promise<AppSetting>;
}

export class InMemoryAppSettingRepository implements AppSettingRepository {
  private readonly settings: AppSetting[];

  constructor(settings: AppSetting[] = []) {
    this.settings = settings.map((s) => ({ ...s }));
  }

  async findAll(): Promise<AppSetting[]> {
    return this.settings.map((s) => ({ ...s }));
  }

  async findByKey(key: string): Promise<AppSetting | null> {
    return this.settings.find((s) => s.key === key) ?? null;
  }

  async upsert(key: string, value: string): Promise<AppSetting> {
    const now = new Date();
    const existing = this.settings.find((s) => s.key === key);
    if (existing) {
      existing.value = value;
      existing.updatedAt = now;
      return { ...existing };
    }
    const entry: AppSetting = { key, value, updatedAt: now };
    this.settings.push(entry);
    return { ...entry };
  }
}
