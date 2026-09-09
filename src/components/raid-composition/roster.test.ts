import { describe, expect, it } from 'vitest';
import {
  applyRecognitionToRoster,
  createInitialRoster,
  getRaidClassBadges,
  getRaidClassDisplayLabel,
  toCompositionMembers,
  updateRosterSlot,
} from './roster';
import type { RaidSlotObservation } from './recognition';

const observation = (
  slot: number,
  className: string | null,
  needsReview: boolean,
  nickname: string | null = null,
): RaidSlotObservation => ({
  slot,
  party: slot < 4 ? 1 : 2,
  className,
  confidence: className == null ? 0 : 0.92,
  needsReview,
  nickname,
  nicknameCandidates: nickname ? [nickname] : [],
});

describe('getRaidClassDisplayLabel and getRaidClassBadges', () => {
  it('formats dealer position and synergy with compact labels', () => {
    expect(getRaidClassDisplayLabel('기상술사')).toBe('기상술사 · 타대 · 치적');
    expect(getRaidClassDisplayLabel('워로드')).toBe('워로드 · 포지션 확인 · 방깎+백헤드');
    expect(getRaidClassDisplayLabel('워로드', { role: 'dealer', position: 'entropy-head' }))
      .toBe('워로드 · 헤드 · 방깎+백헤드');
  });

  it('shows the support role only after its ark passive is resolved', () => {
    expect(getRaidClassDisplayLabel('바드')).toBe('바드 · 포지션 확인 · 시너지 확인');
    expect(getRaidClassBadges('바드')).toEqual([{ label: '역할 확인', tone: 'review' }]);
    expect(getRaidClassDisplayLabel('바드', { role: 'support', position: 'unknown' }))
      .toBe('바드 · 서포터');
    expect(getRaidClassBadges('바드', { role: 'support', position: 'unknown' }))
      .toEqual([{ label: '서포터', tone: 'support' }]);
    expect(getRaidClassBadges('바드', {
      role: 'dealer', position: 'hit-master', arkPassiveTitle: '진실된 용맹',
    })).toEqual([
      { label: '타대', tone: 'position' },
      { label: '방깎', tone: 'synergy' },
    ]);
  });

  it('separates dealer position and synergy badges', () => {
    expect(getRaidClassBadges('워로드', { role: 'dealer', position: 'entropy-head' })).toEqual([
      { label: '헤드', tone: 'position' },
      { label: '방깎', tone: 'synergy' },
      { label: '백헤드', tone: 'synergy' },
    ]);
  });
});

describe('createInitialRoster', () => {
  it('creates 8 review-needed slots split into two parties', () => {
    const roster = createInitialRoster();

    expect(roster).toHaveLength(8);
    expect(roster.slice(0, 4).every((slot) => slot.currentParty === 1)).toBe(true);
    expect(roster.slice(4).every((slot) => slot.currentParty === 2)).toBe(true);
    expect(roster.every((slot) => slot.needsReview)).toBe(true);
  });
});

describe('applyRecognitionToRoster', () => {
  it('keeps manual input for slots missing from a partial observation', () => {
    const roster = updateRosterSlot(createInitialRoster(), 'slot-7', { className: '바드' });

    const next = applyRecognitionToRoster(roster, [observation(0, '도화가', false, '방장')]);

    expect(next[0]).toMatchObject({ className: '도화가', nickname: '방장', needsReview: true });
    expect(next[7]).toMatchObject({ className: '바드' });
  });

  it('keeps the fixed flag set by the user', () => {
    const roster = updateRosterSlot(createInitialRoster(), 'slot-0', { fixed: true });

    const next = applyRecognitionToRoster(roster, [observation(0, '바드', false)]);

    expect(next[0].fixed).toBe(true);
  });
});

describe('updateRosterSlot and toCompositionMembers', () => {
  it('clears the review flag once a position-stable class is selected manually', () => {
    const roster = updateRosterSlot(createInitialRoster(), 'slot-0', { className: '기상술사' });

    expect(roster[0]).toMatchObject({ needsReview: false });
  });

  it('excludes empty slots from composition members', () => {
    const roster = updateRosterSlot(createInitialRoster(), 'slot-0', { className: '바드' });

    const members = toCompositionMembers(roster);

    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ id: 'slot-0', role: 'unknown', currentParty: 1 });

    const resolvedMembers = toCompositionMembers([{ ...roster[0], resolvedRole: 'support', resolvedPosition: 'unknown' }]);
    expect(resolvedMembers[0]).toMatchObject({ role: 'support', position: 'unknown' });

    const dealerMembers = toCompositionMembers([{
      ...roster[0],
      arkPassiveTitle: '진실된 용맹',
      resolvedRole: 'dealer',
      resolvedPosition: 'hit-master',
    }]);
    expect(dealerMembers[0]).toMatchObject({
      role: 'dealer',
      synergies: [{ name: '방어력 감소', stackingGroup: 'bard:방어력 감소' }],
    });
  });
});
