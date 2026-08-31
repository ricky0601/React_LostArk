import type { MaterialType } from '../../../data/enhancement';
import type { MaterialObservation, RecognizedMaterial } from './types';

interface StoredObservation extends MaterialObservation {
  key: string;
}

export interface RecognitionSessionResults {
  observations: Map<string, StoredObservation>;
}

export const createRecognitionSessionResults = (): RecognitionSessionResults => ({
  observations: new Map(),
});

const observationKey = (observation: MaterialObservation): string => observation.material;

const sourcePriority = (observation: MaterialObservation): number => {
  if (observation.source === 'tooltip' || observation.source === 'fate-shard') return 3;
  if (observation.source === 'honing' && !observation.needsTooltip) return 2;
  return 1;
};

export const addRecognitionFrame = (
  session: RecognitionSessionResults,
  observations: MaterialObservation[],
): RecognitionSessionResults => {
  if (observations.length === 0) return session;

  const stored = new Map(session.observations);
  observations.forEach((observation) => {
    const key = observationKey(observation);
    const current = stored.get(key);
    const incomingPriority = sourcePriority(observation);
    const currentPriority = current ? sourcePriority(current) : -1;
    if (!current
      || incomingPriority > currentPriority
      || (incomingPriority === currentPriority && observation.confidence >= current.confidence)) {
      stored.set(key, { ...observation, key });
    }
  });
  return { observations: stored };
};

export const summarizeRecognitionSession = (
  session: RecognitionSessionResults,
): RecognizedMaterial[] => {
  const totals = new Map<MaterialType, RecognizedMaterial>();

  session.observations.forEach((observation) => {
    const current = totals.get(observation.material);
    if (!current) {
      totals.set(observation.material, {
        material: observation.material,
        quantity: observation.quantity,
        confidence: observation.confidence,
        needsReview: observation.needsReview,
        needsTooltip: observation.needsTooltip,
        source: observation.source,
      });
      return;
    }

    totals.set(observation.material, {
      material: observation.material,
      quantity: current.quantity + observation.quantity,
      confidence: Math.min(current.confidence, observation.confidence),
      needsReview: current.needsReview || observation.needsReview,
      needsTooltip: current.needsTooltip || observation.needsTooltip,
      source: current.source,
    });
  });

  return Array.from(totals.values());
};
