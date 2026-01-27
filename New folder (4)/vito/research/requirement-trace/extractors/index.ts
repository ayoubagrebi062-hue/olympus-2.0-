/**
 * Extractors Module - Index
 */

export { StrategosExtractor } from './strategos-extractor';
export { ScopeExtractor } from './scope-extractor';
export { CartographerExtractor } from './cartographer-extractor';
export { BlocksExtractor } from './blocks-extractor';
export { WireExtractor } from './wire-extractor';
export { ContextExtractor } from './context-extractor';

import type { TracedAgentId, ExtractionResult } from '../types';
import { StrategosExtractor } from './strategos-extractor';
import { ScopeExtractor } from './scope-extractor';
import { CartographerExtractor } from './cartographer-extractor';
import { BlocksExtractor } from './blocks-extractor';
import { WireExtractor } from './wire-extractor';

export interface ExtractorInterface {
  extract(agentOutput: unknown, sourcePath: string): ExtractionResult;
}

export const EXTRACTOR_REGISTRY: Record<TracedAgentId, ExtractorInterface> = {
  strategos: new StrategosExtractor(),
  scope: new ScopeExtractor(),
  cartographer: new CartographerExtractor(),
  blocks: new BlocksExtractor(),
  wire: new WireExtractor(),
  pixel: new WireExtractor() // Pixel uses same structure as Wire
};

export function getExtractor(agentId: TracedAgentId): ExtractorInterface {
  return EXTRACTOR_REGISTRY[agentId];
}
