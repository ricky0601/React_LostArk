import { describe, expect, it } from 'vitest';
import type { MaterialType } from '../../../data/enhancement';
import {
  addRecognitionFrame,
  createRecognitionSessionResults,
  summarizeRecognitionSession,
} from './sessionResults';
import type { MaterialObservation } from './types';

const observation = (
  material: MaterialType,
  quantity: number,
  x: number,
  y: number,
  confidence = 0.9,
): MaterialObservation => ({
  material,
  quantity,
  x,
  y,
  confidence,
  slotSize: 46,
  needsReview: confidence < 0.8,
});

describe('material recognition session results', () => {
  it('does not count a stack again when the same screen is scanned repeatedly', () => {
    const frame = [observation('수호석', 1200, 100, 200)];
    let session = addRecognitionFrame(createRecognitionSessionResults(), frame);
    session = addRecognitionFrame(session, frame);

    expect(summarizeRecognitionSession(session)).toEqual([
      expect.objectContaining({ material: '수호석', quantity: 1200 }),
    ]);
  });

  it('does not add the same tooltip again when its screen position changes', () => {
    let session = addRecognitionFrame(createRecognitionSessionResults(), [
      observation('파괴석', 7501, 100, 200),
    ]);
    session = addRecognitionFrame(session, [
      observation('파괴석', 7501, 300, 400),
    ]);

    expect(summarizeRecognitionSession(session)[0]).toEqual(
      expect.objectContaining({ material: '파괴석', quantity: 7501 }),
    );
  });

  it('keeps the more confident reading for the same slot', () => {
    let session = addRecognitionFrame(createRecognitionSessionResults(), [
      observation('돌파석', 41, 100, 200, 0.6),
    ]);
    session = addRecognitionFrame(session, [
      observation('돌파석', 47, 102, 201, 0.95),
    ]);

    expect(summarizeRecognitionSession(session)[0]).toEqual(
      expect.objectContaining({ quantity: 47, confidence: 0.95, needsReview: false }),
    );
  });

  it('does not let a capped honing value replace a confirmed quantity', () => {
    let session = addRecognitionFrame(createRecognitionSessionResults(), [{
      ...observation('파괴석', 12_345, 100, 200, 0.9),
      source: 'honing',
    }]);
    session = addRecognitionFrame(session, [{
      ...observation('파괴석', 9999, 100, 200, 0.99),
      source: 'honing',
      needsTooltip: true,
      needsReview: true,
    }]);

    expect(summarizeRecognitionSession(session)[0].quantity).toBe(12_345);
  });

  it('replaces a capped honing value with the tooltip quantity without summing frames', () => {
    let session = addRecognitionFrame(createRecognitionSessionResults(), [{
      ...observation('수호석', 9999, 100, 200, 0.95),
      source: 'honing',
      needsTooltip: true,
      needsReview: true,
    }]);
    session = addRecognitionFrame(session, [{
      ...observation('수호석', 950_870, 300, 400, 0.8),
      source: 'tooltip',
    }]);
    session = addRecognitionFrame(session, [{
      ...observation('수호석', 950_870, 300, 400, 0.8),
      source: 'tooltip',
    }]);

    expect(summarizeRecognitionSession(session)[0]).toEqual(expect.objectContaining({
      quantity: 950_870,
      needsTooltip: undefined,
      source: 'tooltip',
    }));
  });
});
