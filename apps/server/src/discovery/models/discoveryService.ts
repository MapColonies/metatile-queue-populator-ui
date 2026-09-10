import fs from 'node:fs';
import https from 'node:https';
import type { Logger } from '@map-colonies/js-logger';
import { inject, singleton } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import type { ConfigType } from '../../common/config';

export interface PopulatorTarget {
  id: string;
  name: string;
  projectName: string;
  url: string;
  partOf: string;
  dbName: string;
  source: 'auto' | 'static';
  isDefault: boolean;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  emoji: string;
}

export const PIPELINE_EMOJIS: readonly string[] = [
  '🗺️', // World map / GIS
  '🏢', // Buildings / Architecture
  '🧭', // Compass / Navigation
  '🛰️', // Satellite / Earth Observation
  '⛰️', // Mountain / Topography / Elevation
  '🛣️', // Motorway / Highways / Roads
  '🌐', // Globe / Network / Web mapping
  '🏗️', // Construction / Urban development
  '🌍', // Planet / Global coverage
  '📐', // Ruler / Geometry / Spatial vector
  '🏙️', // Cityscape / Skyline
  '🗾', // Silhouette / Islands / Cartography
  '🌲', // Forest / Nature / Landcover
  '🚂', // Railway / Transportation
  '⚓', // Maritime / Hydrography / Ports
];

export function getEmojiForTarget(nameOrId: string): string {
  let hash = 0;
  const str = nameOrId.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return PIPELINE_EMOJIS[Math.abs(hash) % PIPELINE_EMOJIS.length]!;
}

export function attachEmojis(targets: PopulatorTarget[]): PopulatorTarget[] {
  const usedEmojis = new Set<string>();
  return targets.map((target) => {
    let emoji = getEmojiForTarget(target.projectName || target.id);
    if (usedEmojis.has(emoji)) {
      const baseIndex = PIPELINE_EMOJIS.indexOf(emoji);
      for (let offset = 1; offset < PIPELINE_EMOJIS.length; offset++) {
        const candidate = PIPELINE_EMOJIS[(baseIndex + offset) % PIPELINE_EMOJIS.length]!;
        if (!usedEmojis.has(candidate)) {
          emoji = candidate;
          break;
        }
      }
    }
    usedEmojis.add(emoji);
    return {
      ...target,
      emoji,
    };
  });
}

const TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token';
const NAMESPACE_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/namespace';
const CA_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt';

@singleton()
export class DiscoveryService {
  private cachedTargets: PopulatorTarget[] = [];
  private lastFetchTime = 0;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger
  ) {}

  public async getTargets(forceRefresh = false): Promise<PopulatorTarget[]> {
    const isDiscoveryEnabled = ((this.config.get as any)('discovery.enabled') as boolean | undefined) ?? false;
    const cacheTtlMs = ((this.config.get as any)('discovery.cacheTtlMs') as number | undefined) ?? 30000;
    const now = Date.now();

    if (!isDiscoveryEnabled) {
      return [this.getStaticTarget()];
    }

    if (!forceRefresh && this.cachedTargets.length > 0 && now - this.lastFetchTime < cacheTtlMs) {
      return this.cachedTargets;
    }

    try {
      const discovered = await this.queryKubernetesServices();
      if (discovered.length > 0) {
        this.cachedTargets = discovered;
        this.lastFetchTime = now;
        return this.cachedTargets;
      }
      this.logger.warn({ msg: 'Kubernetes discovery returned 0 matching services, falling back to static target' });
      const fallback = [this.getStaticTarget()];
      this.cachedTargets = fallback;
      this.lastFetchTime = now;
      return fallback;
    } catch (err) {
      this.logger.error({
        msg: 'Failed to discover services from Kubernetes, falling back to static target',
        err: (err as Error).message,
      });
      if (this.cachedTargets.length > 0) {
        return this.cachedTargets;
      }
      return [this.getStaticTarget()];
    }
  }

  public async getTarget(targetId?: string): Promise<PopulatorTarget> {
    const targets = await this.getTargets();
    if (!targetId) {
      return targets.find((t) => t.isDefault) ?? targets[0] ?? this.getStaticTarget();
    }
    const found = targets.find((t) => t.id === targetId || t.projectName.toLowerCase() === targetId.toLowerCase());
    if (found) {
      return found;
    }
    this.logger.warn({ msg: 'Requested targetId not found, falling back to default target', targetId });
    return targets.find((t) => t.isDefault) ?? targets[0] ?? this.getStaticTarget();
  }

  public getStaticTarget(): PopulatorTarget {
    const url = (this.config.get as any)('populator.url') ?? 'http://localhost:8081';
    const projectName = (this.config.get as any)('app.projectName') ?? 'buildings';
    const dbName = this.resolveDbName(projectName);

    return {
      id: projectName,
      name: this.formatFriendlyName(projectName),
      projectName,
      url,
      partOf: `rendering-${projectName}`,
      dbName,
      source: 'static',
      isDefault: true,
      status: 'UP',
      emoji: getEmojiForTarget(projectName),
    };
  }

  public resolveDbName(projectName: string): string {
    const mapping = (this.config.get as any)('discovery.dbNameMapping') as Record<string, string> | undefined;
    if (mapping && mapping[projectName.toLowerCase()]) {
      return mapping[projectName.toLowerCase()]!;
    }
    const pattern = ((this.config.get as any)('discovery.dbNamePattern') as string | undefined) ?? 'vector-rendering-{project}';
    return pattern.replace('{project}', projectName.toLowerCase());
  }

  public extractTargetInfo(rawName: string): { projectName: string; displayName: string; isMatched: boolean } {
    // Look for render-{}- or rendering-{}-
    // 1. render-{}-metatile-queue-populator or rendering-{}-metatile-queue-populator
    let m = rawName.match(/^(?:render|rendering)-(.*?)-(?:metatile-queue-populator.*|queue-populator.*|populator.*)$/);
    if (m && m[1]) {
      return {
        projectName: m[1],
        displayName: this.formatFriendlyName(m[1]),
        isMatched: true,
      };
    }

    // 2. render-{}-something or rendering-{}-something (with delimiter)
    m = rawName.match(/^(?:render|rendering)-([^-]+)-(?:.+)$/);
    if (m && m[1]) {
      return {
        projectName: m[1],
        displayName: this.formatFriendlyName(m[1]),
        isMatched: true,
      };
    }

    // 3. render-{} or rendering-{} (exact match without trailing delimiter)
    m = rawName.match(/^(?:render|rendering)-(.*)$/);
    if (m && m[1]) {
      return {
        projectName: m[1],
        displayName: this.formatFriendlyName(m[1]),
        isMatched: true,
      };
    }

    // If they don't match, just put the name of the deployment
    return {
      projectName: rawName,
      displayName: rawName,
      isMatched: false,
    };
  }

  public formatFriendlyName(raw: string): string {
    const cleaned = raw
      .replace(/^rendering-/, '')
      .replace(/^render-/, '')
      .replace(/-metatile-queue-populator$/, '');
    if (cleaned.length <= 4) {
      return cleaned.toUpperCase();
    }
    return cleaned
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('-');
  }

  private async executeK8sRequest(host: string, port: string, path: string, token: string, agent: https.Agent): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const req = https.request(
        {
          host,
          port,
          path,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          agent,
          timeout: 5000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`K8s API responded with status ${res.statusCode}: ${data}`));
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy(new Error('K8s API request timed out'));
      });
      req.end();
    });
  }

  private async queryKubernetesServices(): Promise<PopulatorTarget[]> {
    const token = process.env.KUBERNETES_SERVICE_ACCOUNT_TOKEN ?? (fs.existsSync(TOKEN_PATH) ? fs.readFileSync(TOKEN_PATH, 'utf-8') : null);
    const namespace = process.env.KUBERNETES_NAMESPACE ?? (fs.existsSync(NAMESPACE_PATH) ? fs.readFileSync(NAMESPACE_PATH, 'utf-8').trim() : null);
    const host = process.env.KUBERNETES_SERVICE_HOST;
    const port = process.env.KUBERNETES_SERVICE_PORT ?? '443';

    if (!token || !namespace || !host) {
      this.logger.info({
        msg: 'In-cluster credentials or environment not present, using static configuration fallback',
        hasToken: Boolean(token),
        hasNamespace: Boolean(namespace),
        hasHost: Boolean(host),
      });
      return [this.getStaticTarget()];
    }

    const labelSelector = (this.config.get as any)('discovery.labelSelector') ?? 'app.kubernetes.io/name=metatile-queue-populator';

    const agentOptions: https.AgentOptions = {};
    if (fs.existsSync(CA_PATH)) {
      agentOptions.ca = fs.readFileSync(CA_PATH);
    } else {
      agentOptions.rejectUnauthorized = false;
    }

    const agent = new https.Agent(agentOptions);
    let items: Array<{
      metadata?: {
        name?: string;
        labels?: Record<string, string>;
      };
      spec?: {
        ports?: Array<{ port: number; name?: string }>;
      };
    }> = [];

    // Try discovering Deployments first to target active deployments
    const deploymentsPath = `/apis/apps/v1/namespaces/${namespace}/deployments?labelSelector=${encodeURIComponent(labelSelector)}`;
    try {
      const deploymentsBody = await this.executeK8sRequest(host, port, deploymentsPath, token, agent);
      const parsedDeployments = JSON.parse(deploymentsBody) as { items?: typeof items };
      if (parsedDeployments.items && Array.isArray(parsedDeployments.items) && parsedDeployments.items.length > 0) {
        items = parsedDeployments.items;
        this.logger.debug({ msg: 'Discovered target deployments from Kubernetes', count: items.length });
      }
    } catch (err) {
      this.logger.warn({ msg: 'Failed to query deployments, falling back to services query', err: (err as Error).message });
    }

    // If no deployments found or query failed, fallback to services
    if (items.length === 0) {
      const servicesPath = `/api/v1/namespaces/${namespace}/services?labelSelector=${encodeURIComponent(labelSelector)}`;
      const servicesBody = await this.executeK8sRequest(host, port, servicesPath, token, agent);
      const parsedServices = JSON.parse(servicesBody) as { items?: typeof items };
      if (parsedServices.items && Array.isArray(parsedServices.items)) {
        items = parsedServices.items;
        this.logger.debug({ msg: 'Discovered target services from Kubernetes', count: items.length });
      }
    }

    if (items.length === 0) {
      return [];
    }

    const defaultProjectName = (this.config.get as any)('app.projectName') as string | undefined;
    const targets: PopulatorTarget[] = [];

    for (const item of items) {
      const resourceName = item.metadata?.name;
      if (!resourceName) {
        continue;
      }

      const labels = item.metadata?.labels ?? {};
      const { projectName, displayName } = this.extractTargetInfo(resourceName);

      const portNumber = item.spec?.ports?.[0]?.port ?? 8080;
      // In-cluster DNS URL for the corresponding Service
      const svcUrl = `http://${resourceName}.${namespace}.svc.cluster.local:${portNumber}`;
      const dbName = this.resolveDbName(projectName);
      const isDefault = defaultProjectName ? projectName.toLowerCase() === defaultProjectName.toLowerCase() : targets.length === 0;

      targets.push({
        id: resourceName,
        name: displayName,
        projectName,
        url: svcUrl,
        partOf: labels['mapcolonies.io/part-of'] || `rendering-${projectName}`,
        dbName,
        source: 'auto',
        isDefault,
        status: 'UP',
        emoji: getEmojiForTarget(projectName),
      });
    }

    // Ensure at least one target is flagged as default
    if (targets.length > 0 && !targets.some((t) => t.isDefault) && targets[0]) {
      targets[0].isDefault = true;
    }

    const finalTargets = attachEmojis(targets);

    this.logger.info({
      msg: 'Discovered MQP targets from Kubernetes',
      count: finalTargets.length,
      targets: finalTargets.map((t) => ({ id: t.id, name: t.name, projectName: t.projectName, emoji: t.emoji, url: t.url })),
    });

    return finalTargets;
  }
}
