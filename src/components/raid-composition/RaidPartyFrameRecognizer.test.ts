import { describe, expect, it } from 'vitest';
import { expandRaidOcrCandidates, normalizeClassIconPixels } from './RaidPartyFrameRecognizer';

describe('expandRaidOcrCandidates', () => {
  it('adds locally validated alternatives for frequent tiny-font OCR confusions', () => {
    expect(expandRaidOcrCandidates('데스트테스트')).toContain('레스트레스트');
    expect(expandRaidOcrCandidates('한웅샘플')).toContain('환웅샘플');
    expect(expandRaidOcrCandidates('내콤샘플')).toContain('새콤샘플');
    expect(expandRaidOcrCandidates('5U')).toContain('80');
  });
});

describe('normalizeClassIconPixels', () => {
  it('uses SVG alpha as a white silhouette regardless of source fill color', () => {
    const pixels = {
      data: new Uint8ClampedArray([
        12, 34, 56, 0,
        0, 0, 0, 200,
        120, 80, 40, 255,
      ]),
      width: 3,
      height: 1,
    } as ImageData;

    normalizeClassIconPixels(pixels);

    expect(Array.from(pixels.data)).toEqual([
      0, 0, 0, 0,
      255, 255, 255, 255,
      255, 255, 255, 255,
    ]);
  });
});
