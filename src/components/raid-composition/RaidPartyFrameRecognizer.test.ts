import { describe, expect, it } from 'vitest';
import {
  expandRaidOcrCandidates,
  getRaidOcrStableSignature,
  normalizeClassIconPixels,
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
  });

  it('keeps the observed text first when a glyph is inherently ambiguous', () => {
    expect(expandRaidOcrCandidates('사회')[0]).toBe('사회');
    expect(expandRaidOcrCandidates('사회')).toContain('사희');
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
  it('stays stable when only lower-ranked OCR alternatives fluctuate', () => {
    expect(getRaidOcrStableSignature(['뜌슬비', '뉴슬비']))
      .toBe(getRaidOcrStableSignature(['뜌슬비', '듀을비', '류슬비']));
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
