import { describe, expect, it } from 'vitest';
import {
  APPLICANT_NICKNAME_BOXES,
  generateApplicantNicknameCandidates,
  getApplicantSpecializedConsensus,
  hasApplicantRowPixels,
  preprocessApplicantNicknamePixels,
  stabilizeApplicantNickname,
} from './ApplicantFrameRecognizer';

const pixels = (width: number, height: number, foreground = 0): ImageData => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 3; index < data.length; index += 4) data[index] = 255;
  for (let pixel = 0; pixel < foreground; pixel += 1) {
    data[pixel * 4] = 210;
    data[pixel * 4 + 1] = 180;
    data[pixel * 4 + 2] = 120;
  }
  return { data, width, height } as ImageData;
};

describe('applicant nickname recognition helpers', () => {
  it('binarizes the applicant nickname crop without participant geometry', () => {
    const image = {
      data: new Uint8ClampedArray([170, 120, 80, 255, 40, 50, 60, 255]),
      width: 2,
      height: 1,
    } as ImageData;

    preprocessApplicantNicknamePixels(image, 130);

    expect(Array.from(image.data)).toEqual([255, 255, 255, 255, 0, 0, 0, 255]);
  });

  it('normalizes OCR text and ranks reusable nickname candidates', () => {
    const candidates = generateApplicantNicknameCandidates([
      { text: ' 이 겜 질 린 다!\n', confidence: 91 },
      { text: '이겜질린다', confidence: 80 },
    ]);

    expect(candidates[0]).toBe('이겜질린다');
  });

  it('prioritizes agreement from the Lost Ark specialized OCR passes', () => {
    const specialized = [
      { text: '뒤 에 서 때 립 니 다', confidence: 89 },
      { text: '뒤에서때립니다', confidence: 88 },
    ];
    const candidates = generateApplicantNicknameCandidates(
      [{ text: '뒤에서때림니다', confidence: 94 }],
      specialized,
    );

    expect(getApplicantSpecializedConsensus(specialized)).toBe('뒤에서때립니다');
    expect(candidates[0]).toBe('뒤에서때립니다');
  });

  it('does not let one weak specialized result override a strong generic result', () => {
    const candidates = generateApplicantNicknameCandidates(
      [{ text: '정확한인식', confidence: 60 }],
      [{ text: '약한오인식', confidence: 45 }],
    );

    expect(getApplicantSpecializedConsensus([{ text: '약한오인식', confidence: 45 }])).toBeNull();
    expect(candidates[0]).toBe('정확한인식');
  });

  it('resets candidate stability when an OCR frame has an empty signature', () => {
    const first = stabilizeApplicantNickname(undefined, ['신청자']);
    expect(first?.count).toBe(1);
    expect(stabilizeApplicantNickname(first ?? undefined, [])).toBeNull();
    expect(stabilizeApplicantNickname(undefined, ['신청자'])?.count).toBe(1);
  });

  it('uses the supplied 1920x1080 applicant nickname coordinates', () => {
    expect(APPLICANT_NICKNAME_BOXES[0]).toEqual({
      x: 1360 / 1920,
      y: 333 / 1080,
      width: 220 / 1920,
      height: 27 / 1080,
    });
  });
});

describe('applicant rows', () => {
  it('distinguishes a row containing bright icon/text pixels from an empty panel row', () => {
    expect(hasApplicantRowPixels(pixels(100, 40, 20))).toBe(true);
    expect(hasApplicantRowPixels(pixels(100, 40))).toBe(false);
  });
});
