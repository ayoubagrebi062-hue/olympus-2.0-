/**
 * QUALITY MODULE
 *
 * Quality scoring and validation for agent outputs.
 *
 * @module quality
 */

export {
  ConversionScorer,
  createConversionScorer,
  scoreConversionContent,
  quickConversionCheck,
  type ConversionScoreResult,
  type ConversionContent,
  type ConversionScorerConfig,
  type ScoreDetail,
  type WIIFMScoreDetail,
  type ClarityScoreDetail,
  type EmotionalScoreDetail,
  type CTAScoreDetail,
  type ObjectionScoreDetail,
  type AntiPlaceholderScoreDetail,
} from './conversion-scorer';
