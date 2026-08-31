import type { MaterialType } from '../../../data/enhancement';

export type CaptureStatus = 'idle' | 'requesting' | 'sharing' | 'review' | 'error';

export type RecognitionSource = 'honing' | 'tooltip' | 'fate-shard';

export interface MaterialObservation {
  material: MaterialType;
  quantity: number;
  confidence: number;
  x: number;
  y: number;
  slotSize: number;
  needsReview: boolean;
  needsTooltip?: boolean;
  source?: RecognitionSource;
}

export interface RecognizedMaterial {
  material: MaterialType;
  quantity: number;
  confidence: number;
  needsReview: boolean;
  needsTooltip?: boolean;
  source?: RecognitionSource;
}

export interface RecognitionMetrics {
  honingCandidateMs: number;
  slotDetectionMs: number;
  iconClassificationMs: number;
  slotOcrMs: number;
  fateShardOcrMs: number;
  tooltipOcrMs: number;
  slotCount: number;
  targetCount: number;
  totalMs: number;
}

export interface RecognitionFrame {
  observations: MaterialObservation[];
  frameWidth: number;
  frameHeight: number;
  metrics?: RecognitionMetrics;
}

export type MaterialIconMap = Partial<Record<MaterialType, string>>;
