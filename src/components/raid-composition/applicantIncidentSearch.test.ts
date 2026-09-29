import { describe, expect, it } from 'vitest';
import {
  createApplicantReview,
  editApplicantNickname,
} from './applicantIncidentSearch';

describe('applicant review editing', () => {
  it('keeps a manual nickname and clears results that belong to the old OCR value', () => {
    const recognized = {
      ...createApplicantReview(0, '오인식', ['오인식', '정답']),
      searchStatus: 'review' as const,
      results: [{ title: 'old', url: 'https://www.inven.co.kr/board/lostark/5355/1' }],
    };

    expect(editApplicantNickname(recognized, '정답')).toEqual(expect.objectContaining({
      nickname: '정답',
      nicknameCandidates: ['정답'],
      source: 'manual',
      needsReview: false,
      searchStatus: 'idle',
      results: [],
    }));
  });

  it('marks a valid manual correction as reviewed without another confirmation step', () => {
    expect(editApplicantNickname(createApplicantReview(0, '오인식'), '정상닉')).toEqual(expect.objectContaining({
      source: 'manual',
      needsReview: false,
    }));
    expect(editApplicantNickname(createApplicantReview(0, '오인식'), '!')).toEqual(expect.objectContaining({
      source: 'manual',
      needsReview: true,
    }));
  });
});
