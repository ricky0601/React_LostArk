import { describe, expect, it } from 'vitest';
import {
  RAID_CLASS_DATA,
  RAID_CLASS_DATA_BY_NAME,
  RAID_COMPOSITION_DATA_METADATA,
} from './raidComposition';

describe('raid composition static data', () => {
  it('records a version, check date, and resolvable sources for every class', () => {
    const sourceIds = new Set(RAID_COMPOSITION_DATA_METADATA.sources.map(({ id }) => id));

    expect(RAID_COMPOSITION_DATA_METADATA.version).toBeTruthy();
    expect(RAID_COMPOSITION_DATA_METADATA.gameVersion).toBeTruthy();
    expect(RAID_COMPOSITION_DATA_METADATA.lastCheckedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(RAID_CLASS_DATA).toHaveLength(30);
    RAID_CLASS_DATA.forEach((classData) => {
      expect(classData.sourceIds.length).toBeGreaterThan(0);
      classData.sourceIds.forEach((sourceId) => expect(sourceIds.has(sourceId)).toBe(true));
    });
  });

  it('uses class-specific stacking groups when equivalent effects can stack', () => {
    const destroyer = RAID_CLASS_DATA_BY_NAME.get('디스트로이어');
    const dimensionmaster = RAID_CLASS_DATA_BY_NAME.get('차원술사');

    expect(destroyer?.synergies[0].name).toBe('방어력 감소');
    expect(dimensionmaster?.synergies[0].name).toBe('방어력 감소');
    expect(destroyer?.synergies[0].stackingGroup)
      .not.toBe(dimensionmaster?.synergies[0].stackingGroup);
  });

  it('does not guess roles or positions that depend on an unrecognized build', () => {
    expect(RAID_CLASS_DATA_BY_NAME.get('발키리')).toEqual(expect.objectContaining({
      role: 'unknown',
      position: 'unknown',
      needsReview: true,
    }));
    expect(RAID_CLASS_DATA_BY_NAME.get('데빌헌터')).toEqual(expect.objectContaining({
      position: 'unknown',
      needsReview: true,
    }));
  });

  it('contains all four requested position classifications', () => {
    expect(new Set(RAID_CLASS_DATA.map(({ position }) => position))).toEqual(new Set([
      'entropy-head',
      'entropy-back',
      'hit-master',
      'unknown',
    ]));
  });
});
