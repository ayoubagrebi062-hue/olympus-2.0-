/**
 * OLYMPUS 2.0 - Agent Schema Registry
 *
 * Maps agent IDs to their Zod output schemas.
 * Used by validated-executor to dynamically look up schemas.
 */
import { ZodType } from 'zod';
import type { AgentId } from '../types/core';

// Lazy import map to avoid circular dependencies
const schemaMap: Record<string, () => Promise<ZodType>> = {
  oracle: () => import('./oracle').then(m => m.OracleOutputSchema),
  empathy: () => import('./empathy').then(m => m.EmpathyOutputSchema),
  venture: () => import('./venture').then(m => m.VentureOutputSchema),
  strategos: () => import('./strategos').then(m => m.StrategosOutputSchema),
  scope: () => import('./scope').then(m => m.ScopeOutputSchema),
  psyche: () => import('./psyche').then(m => m.PsycheOutputSchema),
  scribe: () => import('./scribe').then(m => m.ScribeOutputSchema),
  'architect-conversion': () =>
    import('./architect-conversion').then(m => m.ArchitectConversionOutputSchema),
  architect_conversion: () =>
    import('./architect-conversion').then(m => m.ArchitectConversionOutputSchema),
  'conversion-judge': () => import('./conversion-judge').then(m => m.ConversionJudgeOutputSchema),
  conversion_judge: () => import('./conversion-judge').then(m => m.ConversionJudgeOutputSchema),
  archon: () => import('./archon').then(m => m.ArchonOutputSchema),
  datum: () => import('./datum').then(m => m.DatumOutputSchema),
  nexus: () => import('./nexus').then(m => m.NexusOutputSchema),
  sentinel: () => import('./sentinel').then(m => m.SentinelOutputSchema),
  atlas: () => import('./atlas').then(m => m.AtlasOutputSchema),
  forge: () => import('./forge').then(m => m.ForgeOutputSchema),
  palette: () => import('./palette').then(m => m.PaletteOutputSchema),
  grid: () => import('./grid').then(m => m.GridOutputSchema),
  blocks: () => import('./blocks').then(m => m.BlocksOutputSchema),
  cartographer: () => import('./cartographer').then(m => m.CartographerOutputSchema),
  flow: () => import('./flow').then(m => m.FlowOutputSchema),
  artist: () => import('./artist').then(m => m.ArtistOutputSchema),
  pixel: () => import('./pixel').then(m => m.PixelOutputSchema),
  wire: () => import('./wire').then(m => m.WireOutputSchema),
  polish: () => import('./polish').then(m => m.PolishOutputSchema),
  engine: () => import('./engine').then(m => m.EngineOutputSchema),
  gateway: () => import('./gateway').then(m => m.GatewayOutputSchema),
  keeper: () => import('./keeper').then(m => m.KeeperOutputSchema),
  cron: () => import('./cron').then(m => m.CronOutputSchema),
  bridge: () => import('./bridge').then(m => m.BridgeOutputSchema),
  sync: () => import('./sync').then(m => m.SyncOutputSchema),
  notify: () => import('./notify').then(m => m.NotifyOutputSchema),
  search: () => import('./search').then(m => m.SearchOutputSchema),
  junit: () => import('./junit').then(m => m.JunitOutputSchema),
  cypress: () => import('./cypress').then(m => m.CypressOutputSchema),
  load: () => import('./load').then(m => m.LoadOutputSchema),
  a11y: () => import('./a11y').then(m => m.A11yOutputSchema),
  docker: () => import('./docker').then(m => m.DockerOutputSchema),
  pipeline: () => import('./pipeline').then(m => m.PipelineOutputSchema),
  monitor: () => import('./monitor').then(m => m.MonitorOutputSchema),
  scale: () => import('./scale').then(m => m.ScaleOutputSchema),
};

// Cache resolved schemas
const resolvedSchemas = new Map<string, ZodType>();

/**
 * Get the Zod output schema for an agent by ID.
 * Returns undefined if no schema is registered.
 *
 * Note: This returns a synchronous result from cache, or undefined.
 * For first access, use getAgentSchemaAsync.
 */
export function getAgentSchema(agentId: string): ZodType | undefined {
  return resolvedSchemas.get(agentId);
}

/**
 * Get the Zod output schema for an agent (async, with lazy loading).
 */
export async function getAgentSchemaAsync(agentId: string): Promise<ZodType | undefined> {
  const cached = resolvedSchemas.get(agentId);
  if (cached) return cached;

  const loader = schemaMap[agentId];
  if (!loader) return undefined;

  const schema = await loader();
  resolvedSchemas.set(agentId, schema);
  return schema;
}

/**
 * Preload all schemas into cache.
 */
export async function preloadAllSchemas(): Promise<void> {
  await Promise.all(
    Object.entries(schemaMap).map(async ([id, loader]) => {
      if (!resolvedSchemas.has(id)) {
        const schema = await loader();
        resolvedSchemas.set(id, schema);
      }
    })
  );
}
