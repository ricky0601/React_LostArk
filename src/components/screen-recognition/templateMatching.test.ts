import type { Mat } from '@techstark/opencv-js';
import type { OpenCv } from './openCvLoader';
import {
  addTemplateMatch,
  getTemplateCropCandidates,
  getTemplateCropRatios,
  matchMultiScaleTemplate,
  type TemplateMatch,
} from './templateMatching';

describe('template matching helpers', () => {
  it('uses the opaque artwork as a reusable crop candidate', () => {
    const rgba = new Uint8Array(8 * 8 * 4);
    for (let y = 2; y <= 5; y += 1) {
      for (let x = 3; x <= 4; x += 1) rgba[(y * 8 + x) * 4 + 3] = 255;
    }
    const opaqueCrop = { x: 3 / 8, y: 2 / 8, width: 2 / 8, height: 4 / 8 };

    expect(getTemplateCropRatios(rgba, 8, 8)).toEqual(opaqueCrop);
    expect(getTemplateCropCandidates(rgba, 8, 8)).toEqual([
      opaqueCrop,
      { x: 0.05, y: 0.2, width: 0.68, height: 0.68 },
    ]);
  });

  it('returns coordinates and confidence while suppressing overlapping scales', () => {
    const matches: TemplateMatch[] = [];
    addTemplateMatch(matches, { x: 100, y: 200, size: 64, confidence: 0.75 });
    addTemplateMatch(matches, { x: 105, y: 204, size: 80, confidence: 0.91 });
    addTemplateMatch(matches, { x: 300, y: 400, size: 64, confidence: 0.8 });

    expect(matches).toEqual([
      { x: 105, y: 204, size: 80, confidence: 0.91 },
      { x: 300, y: 400, size: 64, confidence: 0.8 },
    ]);
  });

  it('deletes every initialized Mat when preprocessing fails', () => {
    const mats = Array.from({ length: 4 }, () => ({
      cols: 8,
      rows: 8,
      data: new Uint8Array(8 * 8 * 4),
      delete: vi.fn(),
    }));
    let nextMat = 1;
    const cv = {
      imread: vi.fn(() => mats[0]),
      Mat: vi.fn(function createMat() { return mats[nextMat++]; }),
      Size: vi.fn(function createSize(width: number, height: number) { return { width, height }; }),
      cvtColor: vi.fn(),
      resize: vi.fn(() => { throw new Error('resize failed'); }),
      COLOR_RGBA2RGB: 0,
      INTER_AREA: 0,
    } as unknown as OpenCv;
    const source = { cols: 1920, rows: 1080 } as Mat;
    const template = document.createElement('canvas');

    expect(() => matchMultiScaleTemplate(cv, source, template, { sizes: [64] }))
      .toThrow('resize failed');
    mats.forEach((mat) => expect(mat.delete).toHaveBeenCalledOnce());
  });
});
