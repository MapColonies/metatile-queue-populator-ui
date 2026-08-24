import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable, singleton } from 'tsyringe';
import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { Repository, DataSource } from 'typeorm';
import { SERVICES } from '../../common/constants';
import { DATA_SOURCE_SYMBOL } from '../../common/db/dataSource';
import { PresetEntity } from './presetEntity';

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

@injectable()
export class PresetService {
  private inMemoryPresets: AreaPreset[] = [];
  private presetRepository: Repository<PresetEntity> | null = null;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.DATA_SOURCE) private readonly dataSourceWrapper: any
  ) {
    const ds = this.dataSourceWrapper?.instance ?? (this.dataSourceWrapper?.isInitialized ? this.dataSourceWrapper : null);
    if (ds?.isInitialized) {
      this.presetRepository = ds.getRepository(PresetEntity);
    }
    void this.initializePresets();
  }

  private async initializePresets(): Promise<void> {
    const rawPresets = this.loadBundlePresets();

    if (this.presetRepository) {
      try {
        const count = await this.presetRepository.count();
        if (rawPresets.length > 0) {
          // Deduplicate presets by id
          const seenIds = new Set<string>();
          const uniquePresets = rawPresets.filter((p) => {
            if (seenIds.has(p.id)) return false;
            seenIds.add(p.id);
            return true;
          });

          if (count === 0) {
            this.logger.info({ msg: 'Seeding presets into PostgreSQL database', count: uniquePresets.length });
            const entities = uniquePresets.map((p) => this.presetRepository!.create(p));
            // Batch insert in chunks of 50
            for (let i = 0; i < entities.length; i += 50) {
              await this.presetRepository.save(entities.slice(i, i + 50));
            }
            this.logger.info({ msg: 'Successfully seeded global presets into PostgreSQL' });
          } else {
            // Upsert any missing presets from bundle (e.g. newly added Middle East subregion)
            for (const p of uniquePresets) {
              const existing = await this.presetRepository.findOne({ where: { id: p.id } });
              if (!existing) {
                const entity = this.presetRepository.create(p);
                await this.presetRepository.save(entity);
                this.logger.info({ msg: 'Inserted missing bundle preset into database', presetId: p.id, name: p.name });
              }
            }
          }
        }
        return;
      } catch (err: any) {
        this.logger.warn({ msg: 'Error accessing presets table, falling back to in-memory store', error: err.message });
      }
    }

    this.inMemoryPresets = rawPresets;
  }

  private loadBundlePresets(): AreaPreset[] {
    const possiblePaths = [
      resolve(__dirname, '../../../../assets/globe_presets.json'),
      resolve(__dirname, '../../../assets/globe_presets.json'),
      resolve(process.cwd(), 'assets/globe_presets.json'),
      resolve(process.cwd(), 'dist/assets/globe_presets.json'),
      '/home/danielh3/repos/metatile-queue-poplator-ui/apps/server/assets/globe_presets.json',
    ];

    for (const p of possiblePaths) {
      if (existsSync(p)) {
        try {
          const raw = readFileSync(p, 'utf8');
          const parsed = JSON.parse(raw);
          return parsed;
        } catch (err: any) {
          this.logger.warn({ msg: 'Failed to read globe presets from path', path: p, error: err.message });
        }
      }
    }

    return [
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

  public async getPresets(): Promise<AreaPreset[]> {
    if (this.presetRepository) {
      try {
        const entities = await this.presetRepository.find({
          order: { createdAt: 'DESC' },
        });
        return entities as AreaPreset[];
      } catch (err: any) {
        this.logger.warn({ msg: 'Error querying presets from database, using memory fallback', error: err.message });
      }
    }
    return this.inMemoryPresets;
  }

  public async getPresetById(id: string): Promise<AreaPreset | undefined> {
    if (this.presetRepository) {
      try {
        const entity = await this.presetRepository.findOneBy({ id });
        return (entity as AreaPreset) ?? undefined;
      } catch (err: any) {
        this.logger.warn({ msg: 'Error querying preset by ID from database', error: err.message });
      }
    }
    return this.inMemoryPresets.find((p) => p.id === id);
  }

  public async createPreset(data: Omit<AreaPreset, 'id' | 'createdAt'>): Promise<AreaPreset> {
    const newPreset: AreaPreset = {
      id: randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    if (this.presetRepository) {
      try {
        const entity = this.presetRepository.create(newPreset);
        await this.presetRepository.save(entity);
        this.logger.info({ msg: 'Created and persisted area preset in PostgreSQL', presetId: newPreset.id, name: newPreset.name });
        return entity as AreaPreset;
      } catch (err: any) {
        this.logger.warn({ msg: 'Failed to persist preset in database, storing in memory', error: err.message });
      }
    }

    this.inMemoryPresets.unshift(newPreset);
    this.logger.info({ msg: 'Created area preset in memory', presetId: newPreset.id, name: newPreset.name });
    return newPreset;
  }

  public async deletePreset(id: string): Promise<boolean> {
    if (this.presetRepository) {
      try {
        const result = await this.presetRepository.delete({ id });
        const removed = (result.affected ?? 0) > 0;
        if (removed) {
          this.logger.info({ msg: 'Deleted preset from PostgreSQL', presetId: id });
        }
        return removed;
      } catch (err: any) {
        this.logger.warn({ msg: 'Failed to delete preset from database, trying memory', error: err.message });
      }
    }

    const initialLen = this.inMemoryPresets.length;
    this.inMemoryPresets = this.inMemoryPresets.filter((p) => p.id !== id);
    const removed = this.inMemoryPresets.length < initialLen;
    if (removed) {
      this.logger.info({ msg: 'Deleted preset from memory', presetId: id });
    }
    return removed;
  }
}
