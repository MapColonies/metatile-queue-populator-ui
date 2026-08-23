import { describe, it, expect, beforeEach } from 'vitest';
import { PresetService } from '../../../../src/presets/models/presetService';
import { jsLogger } from '@map-colonies/js-logger';

describe('PresetService', async () => {
  let presetService: PresetService;
  const logger = await jsLogger({ enabled: false });

  beforeEach(() => {
    presetService = new PresetService(logger);
  });

  it('should return initial predefined presets', async () => {
    const presets = await presetService.getPresets();
    expect(presets.length).toBeGreaterThanOrEqual(3);
    expect(presets[0]).toHaveProperty('name');
    expect(presets[0]).toHaveProperty('area');
  });

  it('should create and delete a new preset', async () => {
    const newPreset = await presetService.createPreset({
      name: 'Custom Test Area',
      minZoom: 1,
      maxZoom: 5,
      area: [34.0, 31.0, 35.0, 32.0],
    });

    expect(newPreset.id).toBeDefined();
    expect(await presetService.getPresetById(newPreset.id)).toBeDefined();

    const deleted = await presetService.deletePreset(newPreset.id);
    expect(deleted).toBe(true);
    expect(await presetService.getPresetById(newPreset.id)).toBeUndefined();
  });
});
