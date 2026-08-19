import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable, singleton } from 'tsyringe';
import { randomUUID } from 'crypto';
import { SERVICES } from '../../common/constants';

export interface AreaPreset {
  id: string;
  name: string;
  description?: string;
  minZoom: number;
  maxZoom: number;
  priority?: number;
  area: [number, number, number, number] | Record<string, any>;
  createdAt: string;
}

@singleton()
@injectable()
export class PresetService {
  private presets: AreaPreset[] = [
    {
      id: 'default-israel',
      name: 'Israel Region (Default)',
      description: 'Standard operational bounding box covering the central region',
      minZoom: 0,
      maxZoom: 10,
      priority: 1,
      area: [34.17, 29.45, 35.9, 33.35],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-tel-aviv',
      name: 'Tel Aviv Metropolitan',
      description: 'High-density urban bounds for zoom levels 10-18',
      minZoom: 10,
      maxZoom: 16,
      priority: 2,
      area: [34.74, 32.02, 34.86, 32.14],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-jerusalem',
      name: 'Jerusalem District',
      description: 'Municipal boundary area for zoom levels 8-15',
      minZoom: 8,
      maxZoom: 15,
      priority: 2,
      area: [35.15, 31.72, 35.26, 31.83],
      createdAt: new Date().toISOString(),
    },
  ];

  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger) {}

  public getPresets(): AreaPreset[] {
    return this.presets;
  }

  public getPresetById(id: string): AreaPreset | undefined {
    return this.presets.find((p) => p.id === id);
  }

  public createPreset(data: Omit<AreaPreset, 'id' | 'createdAt'>): AreaPreset {
    const newPreset: AreaPreset = {
      id: randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    this.presets.unshift(newPreset);
    this.logger.info({ msg: 'Created area preset', presetId: newPreset.id, name: newPreset.name });
    return newPreset;
  }

  public deletePreset(id: string): boolean {
    const initialLen = this.presets.length;
    this.presets = this.presets.filter((p) => p.id !== id);
    const removed = this.presets.length < initialLen;
    if (removed) {
      this.logger.info({ msg: 'Deleted preset', presetId: id });
    }
    return removed;
  }
}
