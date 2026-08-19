import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable, singleton } from 'tsyringe';
import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { SERVICES } from '../../common/constants';

export interface AreaPreset {
  id: string;
  name: string;
  category?: 'Continent' | 'Subregion' | 'Country' | 'Custom';
  continent?: string;
  subregion?: string;
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
  private presets: AreaPreset[] = [];

  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger) {
    this.initializeDefaultPresets();
  }

  private initializeDefaultPresets(): void {
    // 1. Check for bundled global presets file
    const possiblePaths = [
      resolve(__dirname, '../../../../assets/globe_presets.json'),
      resolve(__dirname, '../../../assets/globe_presets.json'),
      resolve(process.cwd(), 'assets/globe_presets.json'),
      resolve(process.cwd(), 'dist/assets/globe_presets.json'),
      '/home/danielh3/repos/metatile-queue-poplator-ui/apps/server/assets/globe_presets.json',
    ];

    let loaded = false;
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        try {
          const raw = readFileSync(p, 'utf8');
          this.presets = JSON.parse(raw);
          this.logger.info({ msg: 'Loaded hierarchical global presets', count: this.presets.length, path: p });
          loaded = true;
          break;
        } catch (err: any) {
          this.logger.warn({ msg: 'Failed to read globe presets from path', path: p, error: err.message });
        }
      }
    }

    if (!loaded || this.presets.length === 0) {
      this.presets = [
        {
          id: 'default-israel',
          name: 'Israel Region',
          category: 'Country',
          continent: 'Asia',
          subregion: 'Western Asia',
          description: 'Standard operational bounding box covering the central region',
          minZoom: 0,
          maxZoom: 10,
          priority: 1,
          area: [34.17, 29.45, 35.9, 33.35],
          createdAt: new Date().toISOString(),
        },
      ];
    }
  }

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
