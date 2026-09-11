import { describe, expect, it } from 'vitest';
import {
  applyRecognitionToRoster,
  createInitialRoster,
  getRaidClassBadges,
  enableRosterAutoRecognition,
  getRaidClassDisplayLabel,
  toCompositionMembers,
  updateRosterBuild,
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

  it('preserves an API-confirmed nickname while automatic lookup is disabled', () => {
    const roster = createInitialRoster().map((slot) => (slot.slot === 0 ? {
      ...slot,
      className: '기공사',
      nickname: '맑음깃',
      nicknameCandidates: ['맑음깃'],
      arkPassiveStatus: 'confirmed' as const,
      arkPassiveMessage: '아크패시브 확인됨',
      needsReview: false,
    } : slot));

    const next = applyRecognitionToRoster(
      roster,
      [observation(0, '기공사', false, 'ASN')],
      { preserveConfirmedNicknames: true },
    );

    expect(next[0]).toMatchObject({
      nickname: '맑음깃',
      nicknameCandidates: ['맑음깃'],
      arkPassiveStatus: 'confirmed',
      arkPassiveMessage: '아크패시브 확인됨',
      needsReview: false,
    });
  });

  it('clears recognition identity and build only after two consecutive true vacancies', () => {
    const recognized = applyRecognitionToRoster(createInitialRoster(), [observation(0, '바드', false, '자동닉')]);
    const withBuild = recognized.map((slot) => (slot.slot === 0 ? {
      ...slot,
      arkPassiveTitle: '절실한 구원',
      resolvedRole: 'support' as const,
      resolvedPosition: 'unknown' as const,
    } : slot));

    const once = applyRecognitionToRoster(withBuild, [observation(0, null, true)]);
    expect(once[0]).toMatchObject({ className: '바드', nickname: '자동닉', vacancyFrames: 1 });

    const lowConfidence = applyRecognitionToRoster(once, [{ ...observation(0, null, true), confidence: 0.3 }]);
    expect(lowConfidence[0]).toMatchObject({ className: '바드', nickname: '자동닉', vacancyFrames: 0 });

    const twice = applyRecognitionToRoster(
      applyRecognitionToRoster(lowConfidence, [observation(0, null, true)]),
      [observation(0, null, true)],
    );
    expect(twice[0]).toMatchObject({ className: '', nickname: '', arkPassiveTitle: '', vacancyFrames: 2 });
  });

  it('clears a manually selected build when its recognized occupant becomes vacant', () => {
    const recognized = applyRecognitionToRoster(createInitialRoster(), [observation(0, '바드', false, '자동닉')]);
    const withManualBuild = updateRosterBuild(recognized, 'slot-0', '절실한 구원');

    const vacant = applyRecognitionToRoster(
      applyRecognitionToRoster(withManualBuild, [observation(0, null, true)]),
      [observation(0, null, true)],
    );

    expect(vacant[0]).toMatchObject({
      className: '', nickname: '', arkPassiveTitle: '', buildSource: 'recognition', arkPassiveStatus: 'idle',
    });
  });

  it('does not overwrite or vacancy-clear manual class and nickname values until auto recognition is enabled', () => {
    const manual = updateRosterSlot(createInitialRoster(), 'slot-0', { className: '바드', nickname: '수동닉' });
    const observed = applyRecognitionToRoster(manual, [observation(0, '도화가', false, '자동닉')]);
    const vacant = applyRecognitionToRoster(
      applyRecognitionToRoster(observed, [observation(0, null, true)]),
      [observation(0, null, true)],
    );
    expect(vacant[0]).toMatchObject({
      className: '바드', nickname: '수동닉', classNameSource: 'manual', nicknameSource: 'manual',
    });

    const automatic = enableRosterAutoRecognition(vacant, 'slot-0');
    const replaced = applyRecognitionToRoster(automatic, [observation(0, '도화가', false, '자동닉')]);
    expect(replaced[0]).toMatchObject({
      className: '도화가', nickname: '자동닉', classNameSource: 'recognition', nicknameSource: 'recognition',
    });
  });

  it('accepts a new nickname when the recognized class changes', () => {
    const roster = createInitialRoster().map((slot) => (slot.slot === 0 ? {
      ...slot,
      className: '기공사',
      nickname: '맑음깃',
      nicknameCandidates: ['맑음깃'],
      arkPassiveStatus: 'confirmed' as const,
    } : slot));

    const next = applyRecognitionToRoster(
      roster,
      [observation(0, '소서리스', false, '새닉네임')],
      { preserveConfirmedNicknames: true },
    );

    expect(next[0]).toMatchObject({
      className: '소서리스',
      nickname: '새닉네임',
      arkPassiveStatus: 'idle',
    });
  });
});

describe('updateRosterSlot and toCompositionMembers', () => {
  it('clears the review flag once a position-stable class is selected manually', () => {
    const roster = updateRosterSlot(createInitialRoster(), 'slot-0', { className: '기상술사' });

    expect(roster[0]).toMatchObject({ needsReview: false });
  });

  it('resolves a manually selected build into role, position, and synergy', () => {
    const withClass = updateRosterSlot(createInitialRoster(), 'slot-0', { className: '바드' });
    const roster = updateRosterBuild(withClass, 'slot-0', '진실된 용맹');

    expect(roster[0]).toMatchObject({
      buildSource: 'manual', resolvedRole: 'dealer', resolvedPosition: 'hit-master', needsReview: false,
    });
    expect(toCompositionMembers(roster)[0]).toMatchObject({
      role: 'dealer', position: 'hit-master',
      synergies: [{ name: '방어력 감소', stackingGroup: 'bard:방어력 감소' }],
    });
  });

  it('re-enables automatic lookup when a manual build selection is cleared', () => {
    const withClass = updateRosterSlot(createInitialRoster(), 'slot-0', { className: '바드' });
    const selected = updateRosterBuild(withClass, 'slot-0', '절실한 구원');
    const cleared = updateRosterBuild(selected, 'slot-0', '');

    expect(cleared[0]).toMatchObject({
      arkPassiveTitle: '', buildSource: 'recognition', arkPassiveStatus: 'idle', resolvedRole: null,
    });
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
