import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createHoningObservation,
  fetchMaterialIcon,
  getTemplateCropCandidates,
  getTemplateCropRatios,
  materialIconRequestUrl,
  parseHoningFateShardQuantity,
  parseHoningOwnedQuantity,
  parseTooltipQuantity,
  parseTooltipTitleQuantity,
  parseTopBarFateShardQuantity,
} from './recognizeMaterialFrame';

describe('materialIconRequestUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads Lost Ark CDN icons through the same-origin proxy', () => {
    expect(materialIconRequestUrl(
      'https://cdn-lostark.game.onstove.com/efui_iconatlas/use/use_6_104.png?cache=1',
    )).toBe('/api/material-icon/efui_iconatlas/use/use_6_104.png?cache=1');
  });

  it('includes same-origin credentials for protected preview deployments', async () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal('fetch', fetchMock);

    await fetchMaterialIcon(
      'https://cdn-lostark.game.onstove.com/efui_iconatlas/use/use_6_104.png?cache=1',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/material-icon/efui_iconatlas/use/use_6_104.png?cache=1',
      { credentials: 'same-origin' },
    );
  });

  it('does not rewrite other icon origins', () => {
    expect(materialIconRequestUrl('https://example.com/icon.png')).toBe('https://example.com/icon.png');
  });
});

describe('getTemplateCropRatios', () => {
  it('matches compact icons by their opaque artwork instead of transparent padding', () => {
    const rgba = new Uint8Array(8 * 8 * 4);
    for (let y = 2; y <= 5; y += 1) {
      for (let x = 3; x <= 4; x += 1) rgba[(y * 8 + x) * 4 + 3] = 255;
    }

    const opaqueCrop = {
      x: 3 / 8,
      y: 2 / 8,
      width: 2 / 8,
      height: 4 / 8,
    };

    expect(getTemplateCropRatios(rgba, 8, 8)).toEqual(opaqueCrop);
    expect(getTemplateCropCandidates(rgba, 8, 8)).toEqual([
      opaqueCrop,
      { x: 0.05, y: 0.2, width: 0.68, height: 0.68 },
    ]);
  });

  it('keeps the standard inner crop for full-size icons', () => {
    const rgba = new Uint8Array(8 * 8 * 4).fill(255);

    expect(getTemplateCropRatios(rgba, 8, 8)).toEqual({
      x: 0.05,
      y: 0.2,
      width: 0.68,
      height: 0.68,
    });
  });
});

describe('parseTooltipTitleQuantity', () => {
  it.each([
    ['[X 7440)', 7440],
    ['[X 950870]', 950_870],
    ['[ 5400]', 5400],
  ])('reads tooltip title OCR variations from %s', (text, expected) => {
    expect(parseTooltipTitleQuantity(text)).toBe(expected);
  });
});

describe('honing material quantity parsing', () => {
  it.each([
    ['879 / 44', { quantity: 879, needsTooltip: false }],
    ['659 / 47', { quantity: 659, needsTooltip: false }],
    ['0 / 16', { quantity: 0, needsTooltip: false }],
    ['1745 22', { quantity: 1745, needsTooltip: false }],
    ['9999 / 4260', { quantity: 9999, needsTooltip: true }],
  ])('reads only the owned value from %s', (text, expected) => {
    expect(parseHoningOwnedQuantity(text)).toEqual(expected);
  });

  it('processes every visible weapon, armor, and armlet material without a fixed slot count', () => {
    const weapon = ['파괴석', '돌파석', '아비도스 융화 재료'];
    const armor = ['수호석', '돌파석', '아비도스 융화 재료'];
    const armletSlots = ['파괴석', '수호석', '돌파석', '아비도스 융화 재료'];
    const observe = (materials: string[]) => materials.map((material, index) => (
      createHoningObservation(material as Parameters<typeof createHoningObservation>[0], {
        quantity: index + 1,
        needsTooltip: false,
      })
    ));

    expect(observe(weapon).map(({ material }) => material)).toEqual(weapon);
    expect(observe(armor).map(({ material }) => material)).toEqual(armor);
    expect([...observe(armletSlots).map(({ material }) => material), '운명의 파편']).toEqual([
      '파괴석', '수호석', '돌파석', '아비도스 융화 재료', '운명의 파편',
    ]);
  });
});

describe('fate shard quantity parsing', () => {
  it('reads the first owned currency from the honing window', () => {
    expect(parseHoningFateShardQuantity(
      '소지 금액 10,977,353 # 83,359,124 @ 13,655 @',
    )).toBe(10_977_353);
  });

  it('uses the first grouped amount on the owned-amount row when OCR misses the label', () => {
    expect(parseHoningFateShardQuantity(
      '39.840 # 60.000 @ 10,150\n3.068.727 # 17,610,805 @ 413615 @',
    )).toBe(3_068_727);
  });

  it('reads the last grouped quantity from the top-bar crop', () => {
    expect(parseTopBarFateShardQuantity('121,365 1,226,295')).toBe(1_226_295);
  });

  it('does not use capped material counts from the honing window', () => {
    expect(parseHoningFateShardQuantity('9999 / 780 1745 / 22 0 / 16')).toBeNull();
  });
});

describe('parseTooltipQuantity', () => {
  it('prefers the total owned quantity in a tooltip', () => {
    expect(parseTooltipQuantity('겹침 수량: 100개\n전체 보유 수량: 950,870개', 100)).toBe(950_870);
  });

  it('uses the title quantity when the tooltip has no total', () => {
    expect(parseTooltipQuantity('거래 불가\n분해불가', 7440)).toBe(7440);
  });

  it('caps an abnormally large quantity', () => {
    expect(parseTooltipQuantity('전체 보유 수량: 1,000,000,000개', 1)).toBe(999_999_999);
  });
});
