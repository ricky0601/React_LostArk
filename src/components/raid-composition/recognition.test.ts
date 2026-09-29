import { describe, expect, it } from 'vitest';
import {
  countRecognizedSlots,
  mapMatchesToSlots,
  normalizeRaidNickname,
  slotIndexForPoint,
  type RaidSlotOccupancy,
} from './recognition';

describe('normalizeRaidNickname', () => {
  it('removes OCR separators while preserving valid nickname characters', () => {
    expect(normalizeRaidNickname(' 모코코-123\n')).toBe('모코코123');
  });

  it('rejects implausible nickname lengths', () => {
    expect(normalizeRaidNickname('가')).toBeNull();
    expect(normalizeRaidNickname('abcdefghijklmnop')).toBeNull();
  });
});

describe('slotIndexForPoint', () => {
  it('finds party-major slots in the joined-raid participant panel', () => {
    expect(slotIndexForPoint(0.7, 0.31)).toBe(0);
    expect(slotIndexForPoint(0.7, 0.394)).toBe(3);
    expect(slotIndexForPoint(0.85, 0.31)).toBe(4);
    expect(slotIndexForPoint(0.85, 0.394)).toBe(7);
  });

  it('returns null outside the joined-raid participant panel', () => {
    expect(slotIndexForPoint(0.3, 0.3)).toBeNull();
  });
});

describe('mapMatchesToSlots', () => {
  it('keeps the highest-confidence match per slot and flags low confidence for review', () => {
    const observations = mapMatchesToSlots([
      { className: '바드', x: 0.7, y: 0.31, confidence: 0.95 },
      { className: '도화가', x: 0.7, y: 0.31, confidence: 0.6 },
      { className: '데빌헌터', x: 0.7, y: 0.338, confidence: 0.5 },
    ]);

    expect(observations).toHaveLength(8);
    expect(observations[0]).toMatchObject({
      slot: 0,
      party: 1,
      className: '바드',
      needsReview: false,
    });
    expect(observations[1]).toMatchObject({ slot: 1, className: null, needsReview: true });
    expect(countRecognizedSlots(observations)).toBe(1);
  });

  it('accepts a clear class match at the validated lower confidence boundary', () => {
    const observations = mapMatchesToSlots([
      { className: '인파이터', x: 0.85, y: 0.338, confidence: 0.525 },
    ]);

    expect(observations[5]).toMatchObject({
      className: '인파이터',
      confidence: 0.525,
      needsReview: false,
    });
  });

  it('requires a clear margin over the runner-up before confirming a class', () => {
    const observations = mapMatchesToSlots([
      { className: '바드', x: 0.7, y: 0.31, confidence: 0.91 },
      { className: '도화가', x: 0.7, y: 0.31, confidence: 0.9 },
    ]);

    expect(observations[0]).toMatchObject({ className: null, confidence: 0.91, needsReview: true });
  });

  it('requires review when the two best class candidates are too close', () => {
    const observations = mapMatchesToSlots([
      { className: '바드', x: 0.7, y: 0.31, confidence: 0.82 },
      { className: '도화가', x: 0.7, y: 0.31, confidence: 0.81 },
    ]);

    expect(observations[0]).toMatchObject({ className: null, confidence: 0.82, needsReview: true });
  });

  it('distinguishes a template miss in an occupied slot from a true vacancy', () => {
    const occupancies: RaidSlotOccupancy[] = Array.from({ length: 8 }, () => 'vacant');
    occupancies[0] = 'occupied';
    occupancies[1] = 'occupied';
    const observations = mapMatchesToSlots([
      { className: '바드', x: 0.7, y: 0.31, confidence: 0.9 },
    ], [], occupancies);

    expect(observations[0]).toMatchObject({ className: '바드', occupancy: 'occupied' });
    expect(observations[1]).toMatchObject({ className: null, occupancy: 'occupied', confidence: 0 });
    expect(observations[4]).toMatchObject({ className: null, occupancy: 'vacant', needsReview: true, confidence: 0 });
  });

  it('attaches nicknames as auxiliary results without affecting class recognition', () => {
    const withoutNickname = mapMatchesToSlots([
      { className: '바드', x: 0.7, y: 0.31, confidence: 0.9 },
    ]);
    const withNickname = mapMatchesToSlots(
      [{ className: '바드', x: 0.7, y: 0.31, confidence: 0.9 }],
      [{
        slot: 0,
        text: '모집글방장',
        candidates: ['모집글방장', '모집글방장후보'],
        confidence: 0.4,
      }],
    );

    expect(withNickname[0].nickname).toBe('모집글방장');
    expect(withNickname[0].nicknameCandidates).toEqual(['모집글방장', '모집글방장후보']);
    expect(withNickname[0].className).toBe(withoutNickname[0].className);
    expect(withNickname[0].needsReview).toBe(withoutNickname[0].needsReview);
  });
});
