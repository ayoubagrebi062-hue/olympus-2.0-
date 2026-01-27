// Types (interface re-exports require 'export type' with isolatedModules)
export type {
  IEpochManager,
  EpochState,
  EpochConfig,
  EpochMetrics,
  EpochTransition,
  ViolationRecord,
} from './epoch-manager';

// Values (class, enum, function)
export { EpochManager, EpochPhase, EpochType, createEpochManager } from './epoch-manager';
