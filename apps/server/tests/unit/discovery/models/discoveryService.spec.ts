import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jsLogger } from '@map-colonies/js-logger';
import { DiscoveryService, PIPELINE_EMOJIS, getEmojiForTarget, attachEmojis } from '../../../../src/discovery/models/discoveryService';

describe('DiscoveryService', async () => {
  let discoveryService: DiscoveryService;
  const logger = await jsLogger({ enabled: false });

  const mockConfig: Record<string, any> = {
    'discovery.enabled': false,
    'discovery.labelSelector': 'app.kubernetes.io/name=metatile-queue-populator',
    'discovery.partOfPrefix': 'rendering-',
    'discovery.cacheTtlMs': 30000,
    'discovery.dbNamePattern': 'vector-rendering-{project}',
    'discovery.dbNameMapping': {
      buildings: 'vector-rendering-buildings',
      osm: 'vector-rendering-osm',
    },
    'populator.url': 'http://localhost:8081',
    'app.projectName': 'buildings',
  };

  const configMock = {
    get: vi.fn((key: string) => mockConfig[key]),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    discoveryService = new DiscoveryService(configMock as any, logger);
  });

  describe('Static fallback mode', () => {
    it('should return static target when discovery is disabled', async () => {
      mockConfig['discovery.enabled'] = false;

      const targets = await discoveryService.getTargets();

      expect(targets).toHaveLength(1);
      expect(targets[0]).toEqual({
        id: 'buildings',
        name: 'Buildings',
        projectName: 'buildings',
        url: 'http://localhost:8081',
        partOf: 'rendering-buildings',
        dbName: 'vector-rendering-buildings',
        source: 'static',
        isDefault: true,
        status: 'UP',
        emoji: '🌲',
      });
    });

    it('should resolve specific target or fallback to default', async () => {
      const target = await discoveryService.getTarget('buildings');
      expect(target.id).toBe('buildings');

      const nonExistent = await discoveryService.getTarget('non-existent');
      expect(nonExistent.id).toBe('buildings');
    });
  });

  describe('Name and Database Resolution', () => {
    it('should format friendly names correctly', () => {
      expect(discoveryService.formatFriendlyName('rendering-buildings')).toBe('Buildings');
      expect(discoveryService.formatFriendlyName('rendering-osm')).toBe('OSM');
      expect(discoveryService.formatFriendlyName('osm')).toBe('OSM');
      expect(discoveryService.formatFriendlyName('roads')).toBe('Roads');
    });

    it('should resolve database names via mapping or fallback pattern', () => {
      expect(discoveryService.resolveDbName('buildings')).toBe('vector-rendering-buildings');
      expect(discoveryService.resolveDbName('osm')).toBe('vector-rendering-osm');
      expect(discoveryService.resolveDbName('cadastre')).toBe('vector-rendering-cadastre');
    });

    it('should extract projectName and displayName for render-{}- and rendering-{}- patterns', () => {
      const buildings = discoveryService.extractTargetInfo('render-buildings-metatile-queue-populator');
      expect(buildings.projectName).toBe('buildings');
      expect(buildings.displayName).toBe('Buildings');
      expect(buildings.isMatched).toBe(true);

      const osm = discoveryService.extractTargetInfo('rendering-osm-metatile-queue-populator');
      expect(osm.projectName).toBe('osm');
      expect(osm.displayName).toBe('OSM');
      expect(osm.isMatched).toBe(true);

      const highRes = discoveryService.extractTargetInfo('render-high-res-metatile-queue-populator');
      expect(highRes.projectName).toBe('high-res');
      expect(highRes.displayName).toBe('High-Res');
      expect(highRes.isMatched).toBe(true);
    });

    it('should fallback to the exact deployment name when pattern does not match', () => {
      const unmatched = discoveryService.extractTargetInfo('mqp-osm-metatile-queue-populator');
      expect(unmatched.projectName).toBe('mqp-osm-metatile-queue-populator');
      expect(unmatched.displayName).toBe('mqp-osm-metatile-queue-populator');
      expect(unmatched.isMatched).toBe(false);
    });
  });

  describe('Emoji Assignment', () => {
    it('should contain a curated list of exactly 15 emojis', () => {
      expect(PIPELINE_EMOJIS).toHaveLength(15);
      const unique = new Set(PIPELINE_EMOJIS);
      expect(unique.size).toBe(15);
    });

    it('should deterministically assign emojis based on target name', () => {
      const emoji1 = getEmojiForTarget('buildings');
      const emoji2 = getEmojiForTarget('buildings');
      expect(emoji1).toBe(emoji2);
      expect(PIPELINE_EMOJIS).toContain(emoji1);
    });

    it('should avoid emoji collisions when multiple targets are discovered', () => {
      const targets = [
        {
          id: 'target-1',
          name: 'Target 1',
          projectName: 'project-a',
          url: 'http://a',
          partOf: 'rendering-a',
          dbName: 'db-a',
          source: 'auto' as const,
          isDefault: true,
          status: 'UP' as const,
          emoji: '',
        },
        {
          id: 'target-2',
          name: 'Target 2',
          projectName: 'project-b',
          url: 'http://b',
          partOf: 'rendering-b',
          dbName: 'db-b',
          source: 'auto' as const,
          isDefault: false,
          status: 'UP' as const,
          emoji: '',
        },
      ];

      const withEmojis = attachEmojis(targets);
      expect(withEmojis[0]?.emoji).toBe(true);
      expect(withEmojis[1]?.emoji).toBe(true);
      expect(withEmojis[0]?.emoji).not.toBe(withEmojis[1]?.emoji);
    });
  });
});
