import { describe, expect, it } from 'vitest';
import {
  detectRaidViewportTransform,
  expandRaidOcrCandidates,
  getRaidOcrEditDistance,
  getRaidOcrSequenceCandidates,
  getRaidOcrStableSignature,
  getRaidOcrTransformationCost,
  getRaidPixelBox,
  hasRaidClassIconPixels,
  invertMonochromePixels,
  mergeRaidOcrCandidates,
  normalizeClassIconPixels,
  normalizeClassIconSourcePixels,
  prioritizeSpecializedRaidOcrCandidate,
  rankRaidOcrCandidates,
} from './RaidPartyFrameRecognizer';

describe('expandRaidOcrCandidates', () => {
  it('expands character-level alternatives without encoding complete nicknames', () => {
    expect(expandRaidOcrCandidates('이미회희')).toEqual(expect.arrayContaining([
      '미미회희',
      '이이회희',
      '이미희희',
      '이미회회',
    ]));
    expect(expandRaidOcrCandidates('기펀')).toContain('기껀');
    expect(expandRaidOcrCandidates('두치형바닥')).toContain('두치혓바닥');
    expect(expandRaidOcrCandidates('뉴슬비')).toContain('뜌슬비');
    expect(expandRaidOcrCandidates('서애기')).toContain('서애긔');
    expect(expandRaidOcrCandidates('옹예나아기진규')).toContain('응애나아기진규');
    expect(expandRaidOcrCandidates('깃으도사양패여')).toContain('낫으로사람패여');
    expect(expandRaidOcrCandidates('5U')).toContain('80');
    expect(expandRaidOcrCandidates('병동')).toContain('병둥');
    expect(expandRaidOcrCandidates('끼웃')).toContain('끼욧');
    expect(expandRaidOcrCandidates('머기쿠')).toContain('머기큐');
    expect(expandRaidOcrCandidates('잇모코코앤')).toContain('이깟모코코맨');
    expect(expandRaidOcrCandidates('이깡모코코')).toContain('이깟모코코');
    expect(expandRaidOcrCandidates('이깡호구아이로팡앤행'))
      .toContain('이깟호구아이로팡맨행');
  });

  it('keeps the observed text first when a glyph is inherently ambiguous', () => {
    expect(expandRaidOcrCandidates('사회')[0]).toBe('사회');
    expect(expandRaidOcrCandidates('사회')).toContain('사희');
  });
});

describe('getRaidOcrSequenceCandidates', () => {
  it('prioritizes direct sequence-glyph alternatives from specialized observations', () => {
    expect(getRaidOcrSequenceCandidates([
      { text: '잇호구아이로팡맨행', confidence: 73 },
      { text: '잇호구아이로팡앤행', confidence: 72 },
    ])).toEqual([
      '이깟호구아이로팡맨행',
      '이깟호구아이로팡앤행',
    ]);
  });
});

describe('getRaidOcrEditDistance', () => {
  it('scores a collapsed two-syllable glyph without shifting the unchanged suffix', () => {
    expect(getRaidOcrEditDistance('잇호구', '이깟호구')).toBe(2);
    expect(getRaidOcrTransformationCost('잇호구', '이깟호구')).toBe(1);
    expect(getRaidOcrTransformationCost('잇호구앤', '이깟호구맨')).toBe(2);
  });
});

describe('rankRaidOcrCandidates', () => {
  it('uses agreement between threshold passes to resolve numeric glyphs', () => {
    expect(rankRaidOcrCandidates([
      { text: '50', confidence: 87 },
      { text: '30', confidence: 94 },
    ])[0]).toBe('80');
  });

  it('does not force an unobserved glyph alternative above a confident OCR result', () => {
    const candidates = rankRaidOcrCandidates([{ text: '일세', confidence: 82 }]);

    expect(candidates[0]).toBe('일세');
    expect(candidates).toContain('실계');
  });

  it('recombines agreeing characters from equal-length OCR observations', () => {
    const candidates = rankRaidOcrCandidates([
      { text: '깃으토사람패여', confidence: 66 },
      { text: '낮으로사람패며', confidence: 65 },
      { text: '것으토사람패며', confidence: 85 },
    ]);

    expect(candidates).toContain('낫으로사람패여');
  });

  it('does not let one sequence alternative receive duplicate evidence from one observation', () => {
    expect(rankRaidOcrCandidates([{ text: '잇호구', confidence: 90 }])[0]).toBe('잇호구');
    expect(rankRaidOcrCandidates([{ text: '이깟호구', confidence: 90 }])[0]).toBe('이깟호구');
  });

  it('uses independent joined-panel observations to promote a reconstructed candidate', () => {
    const candidates = rankRaidOcrCandidates([
      { text: '잇호구아이로팡맨행', confidence: 109.5 },
      { text: '이깡호구아이로팡앤행', confidence: 108 },
      { text: '잇호구아이로팡앤행', confidence: 109.5 },
      { text: '잇호구아이로팡앤행', confidence: 109.5 },
    ]);

    expect(candidates.indexOf('이깟호구아이로팡맨행')).toBeGreaterThanOrEqual(0);
    expect(candidates.indexOf('이깟호구아이로팡맨행')).toBeLessThan(24);
  });

  it('keeps additional low-resolution syllable confusions inside the API lookup window', () => {
    const longNicknameCandidates = rankRaidOcrCandidates([
      { text: '깃으도사양패여', confidence: 70 },
      { text: '낮으로사람패며', confidence: 62 },
    ]);
    const shortNicknameCandidates = rankRaidOcrCandidates([
      { text: '옹예나아기진규', confidence: 91 },
    ]);

    expect(longNicknameCandidates.indexOf('낫으로사람패여')).toBeLessThan(72);
    expect(shortNicknameCandidates.indexOf('응애나아기진규')).toBeLessThan(72);
  });
});

describe('prioritizeSpecializedRaidOcrCandidate', () => {
  it('prefers agreement across specialized preprocessing passes', () => {
    expect(prioritizeSpecializedRaidOcrCandidate([
      { text: '뜌슬비', confidence: 56 },
      { text: '뜌슬비', confidence: 57 },
      { text: '뉴슬비', confidence: 64 },
    ])).toBe('뜌슬비');
  });

  it('uses a clearly stronger specialized result without forcing a close decision', () => {
    expect(prioritizeSpecializedRaidOcrCandidate([
      { text: '서애긔', confidence: 92 },
      { text: '서애기', confidence: 84 },
    ])).toBe('서애긔');
    expect(prioritizeSpecializedRaidOcrCandidate([
      { text: '응애나아기진규', confidence: 91 },
      { text: '옹애나아기진규', confidence: 91 },
    ])).toBeNull();
  });
});

describe('getRaidOcrStableSignature', () => {
  it('retains a useful alternative observed in an earlier stable frame', () => {
    expect(mergeRaidOcrCandidates(
      ['대표오답', '이전정답후보'],
      ['대표오답', '새후보'],
    )).toEqual(['대표오답', '새후보', '이전정답후보']);
  });

  it('retains new alternatives after the previous list reaches its limit', () => {
    const previous = ['대표오답', ...Array.from({ length: 127 }, (_, index) => `이전${index}`)];
    const merged = mergeRaidOcrCandidates(previous, ['대표오답', '최신정답후보']);

    expect(merged).toHaveLength(128);
    expect(merged[1]).toBe('최신정답후보');
  });

  it('stays stable when only lower-ranked OCR alternatives fluctuate', () => {
    expect(getRaidOcrStableSignature(['뜌슬비', '뉴슬비']))
      .toBe(getRaidOcrStableSignature(['뜌슬비', '듀을비', '류슬비']));
  });
});

describe('detectRaidViewportTransform', () => {
  it('finds a 1920x1080 game viewport placed at (200, 100) in a 2560x1440 frame', () => {
    const width = 2560;
    const height = 1440;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 3; index < data.length; index += 4) data[index] = 255;
    for (let y = 100; y < 1180; y += 1) {
      for (let x = 200; x < 2120; x += 1) {
        const index = (y * width + x) * 4;
        data[index] = 40 + ((x + y) % 80);
        data[index + 1] = 50;
        data[index + 2] = 60;
      }
    }

    const viewport = detectRaidViewportTransform({ data, width, height } as ImageData);
    expect(viewport).toEqual({ x: 200, y: 100, width: 1920, height: 1080 });
    expect(getRaidPixelBox(
      { x: 0.686, y: 0.282, width: 0.035, height: 0.057 },
      width,
      height,
      viewport,
    )).toEqual({ x: 1517, y: 404, width: 68, height: 63 });
  });
});

describe('normalizeClassIconPixels', () => {
  it('inverts binary nickname pixels for the synthetic model input polarity', () => {
    const pixels = {
      data: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]),
      width: 2,
      height: 1,
    } as ImageData;

    invertMonochromePixels(pixels);

    expect(Array.from(pixels.data)).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });

  it('distinguishes an occupied icon ROI from an empty slot background', () => {
    const occupied = new Uint8ClampedArray(10 * 10 * 4);
    for (let pixel = 0; pixel < 4; pixel += 1) {
      occupied[pixel * 4] = 180;
      occupied[pixel * 4 + 1] = 140;
      occupied[pixel * 4 + 2] = 70;
      occupied[pixel * 4 + 3] = 255;
    }

    expect(hasRaidClassIconPixels({ data: occupied, width: 10, height: 10 } as ImageData)).toBe(true);
    expect(hasRaidClassIconPixels({
      data: new Uint8ClampedArray(10 * 10 * 4),
      width: 10,
      height: 10,
    } as ImageData)).toBe(false);
  });

  it('normalizes gold and white in-game icon pixels to grayscale brightness', () => {
    const pixels = {
      data: new Uint8ClampedArray([
        180, 140, 70, 255,
        210, 220, 200, 255,
      ]),
      width: 2,
      height: 1,
    } as ImageData;

    normalizeClassIconSourcePixels(pixels);

    expect(Array.from(pixels.data)).toEqual([
      180, 180, 180, 255,
      220, 220, 220, 255,
    ]);
  });

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
