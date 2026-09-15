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

  it('replaces a confirmed same-class participant after two stable nickname observations', () => {
    const roster = createInitialRoster().map((slot) => (slot.slot === 0 ? {
      ...slot,
      className: '기공사',
      nickname: '기존닉네임',
      nicknameCandidates: ['기존닉네임'],
      combatPower: 123456,
      arkPassiveTitle: '세맥타통',
      resolvedRole: 'dealer' as const,
      resolvedPosition: 'hit-master' as const,
      arkPassiveStatus: 'confirmed' as const,
      arkPassiveMessage: '아크패시브 확인됨',
      needsReview: false,
    } : slot));

    const once = applyRecognitionToRoster(
      roster,
      [observation(0, '기공사', false, '새닉네임')],
      { preserveConfirmedNicknames: true },
    );
    expect(once[0]).toMatchObject({
      nickname: '기존닉네임', pendingNickname: '새닉네임', pendingNicknameFrames: 1,
      arkPassiveStatus: 'confirmed', combatPower: 123456,
    });

    const twice = applyRecognitionToRoster(
      once,
      [observation(0, '기공사', false, '새닉네임')],
      { preserveConfirmedNicknames: true },
    );
    expect(twice[0]).toMatchObject({
      nickname: '새닉네임', nicknameCandidates: ['새닉네임'], pendingNickname: '', pendingNicknameFrames: 0,
      arkPassiveTitle: '', resolvedRole: null, resolvedPosition: null, arkPassiveStatus: 'idle',
      arkPassiveMessage: '', combatPower: null,
    });
  });

  it('moves participant-owned state when two stably named participants swap physical slots', () => {
    const roster = createInitialRoster().map((slot) => {
      if (slot.slot === 0) return {
        ...slot,
        className: '바드',
        nickname: '첫번째참가자',
        nicknameCandidates: ['첫번째참가자'],
        currentParty: 2 as const,
        fixed: true,
        arkPassiveTitle: '절실한 구원',
        combatPower: 111111,
        resolvedRole: 'support' as const,
        resolvedPosition: 'unknown' as const,
        arkPassiveStatus: 'confirmed' as const,
        needsReview: false,
      };
      if (slot.slot === 4) return {
        ...slot,
        className: '기상술사',
        nickname: '두번째참가자',
        nicknameCandidates: ['두번째참가자'],
        currentParty: 1 as const,
        arkPassiveTitle: '질풍노도',
        combatPower: 222222,
        resolvedRole: 'dealer' as const,
        resolvedPosition: 'hit-master' as const,
        arkPassiveStatus: 'confirmed' as const,
        needsReview: false,
      };
      return slot;
    });

    const next = applyRecognitionToRoster(roster, [
      observation(0, '기상술사', false, '두번째참가자'),
      observation(4, '바드', false, '첫번째참가자'),
    ], { preserveConfirmedNicknames: true });

    expect(next[0]).toMatchObject({
      id: 'slot-4', slot: 0, currentParty: 1, nickname: '두번째참가자', fixed: false,
      arkPassiveTitle: '질풍노도', combatPower: 222222, resolvedRole: 'dealer', resolvedPosition: 'hit-master',
    });
    expect(next[4]).toMatchObject({
      id: 'slot-0', slot: 4, currentParty: 2, nickname: '첫번째참가자', fixed: true,
      arkPassiveTitle: '절실한 구원', combatPower: 111111, resolvedRole: 'support', resolvedPosition: 'unknown',
    });
  });

  it('keeps a pending recommended party while the participant remains in the same physical slot', () => {
    const roster = createInitialRoster().map((slot) => (slot.slot === 0 ? {
      ...slot,
      className: '바드',
      nickname: '이동대기자',
      nicknameCandidates: ['이동대기자'],
      currentParty: 2 as const,
    } : slot));

    const next = applyRecognitionToRoster(roster, [observation(0, '바드', false, '이동대기자')]);

    expect(next[0]).toMatchObject({ id: 'slot-0', slot: 0, currentParty: 2 });
  });

  it('does not move participant state when the displaced participant has no stable nickname observation', () => {
    const roster = createInitialRoster().map((slot) => {
      if (slot.slot === 0) return {
        ...slot, className: '바드', nickname: '확정참가자', fixed: true,
      };
      if (slot.slot === 4) return {
        ...slot, className: '기상술사', nickname: '관측불안정', combatPower: 222222,
      };
      return slot;
    });

    const next = applyRecognitionToRoster(roster, [observation(4, '바드', false, '확정참가자')]);

    expect(next[0]).toMatchObject({ id: 'slot-0', slot: 0, nickname: '확정참가자', fixed: true });
    expect(next[4]).toMatchObject({
      id: 'slot-4', slot: 4, className: '기상술사', nickname: '관측불안정', combatPower: 222222,
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

  it('clears a recognition-derived build when a recognized nickname leaves a manually selected class', () => {
    const withManualClass = updateRosterSlot(createInitialRoster(), 'slot-0', { className: '바드' });
    const recognized = applyRecognitionToRoster(withManualClass, [observation(0, '바드', false, '자동닉')]);
    const withRecognitionBuild = recognized.map((slot) => (slot.slot === 0 ? {
      ...slot,
      arkPassiveTitle: '절실한 구원',
      buildSource: 'recognition' as const,
      resolvedRole: 'support' as const,
      resolvedPosition: 'unknown' as const,
      arkPassiveStatus: 'confirmed' as const,
      arkPassiveMessage: '아크패시브 확인됨',
      needsReview: false,
    } : slot));

    const vacant = applyRecognitionToRoster(
      applyRecognitionToRoster(withRecognitionBuild, [observation(0, null, true)]),
      [observation(0, null, true)],
    );

    expect(vacant[0]).toMatchObject({
      className: '바드', classNameSource: 'manual', nickname: '', nicknameSource: 'recognition',
      arkPassiveTitle: '', buildSource: 'recognition', resolvedRole: null, resolvedPosition: null,
      arkPassiveStatus: 'idle', arkPassiveMessage: '', needsReview: true,
    });
    expect(toCompositionMembers(vacant)[0]).toMatchObject({ role: 'unknown', position: 'unknown', synergies: [] });
  });

  it('preserves a manual class and build when its recognized nickname becomes vacant', () => {
    const withManualClass = updateRosterSlot(createInitialRoster(), 'slot-0', { className: '바드' });
    const recognized = applyRecognitionToRoster(withManualClass, [observation(0, '바드', false, '자동닉')]);
    const withManualBuild = updateRosterBuild(recognized, 'slot-0', '절실한 구원');

    const vacant = applyRecognitionToRoster(
      applyRecognitionToRoster(withManualBuild, [observation(0, null, true)]),
      [observation(0, null, true)],
    );

    expect(vacant[0]).toMatchObject({
      className: '바드', classNameSource: 'manual', nickname: '', nicknameSource: 'recognition',
      arkPassiveTitle: '절실한 구원', buildSource: 'manual', resolvedRole: 'support', resolvedPosition: 'unknown',
      arkPassiveStatus: 'confirmed', arkPassiveMessage: '수동 빌드 선택', needsReview: false,
    });
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
  it('passes combat power to evaluation and clears it when identity changes', () => {
    const withPower = updateRosterSlot(createInitialRoster(), 'slot-0', {
      className: '기상술사', nickname: '기상닉', combatPower: 123456,
    });

    expect(toCompositionMembers(withPower)[0].combatPower).toBe(123456);
    expect(updateRosterSlot(withPower, 'slot-0', { nickname: '다른닉' })[0].combatPower).toBeNull();
  });

  it('clears the review flag once a position-stable class is selected manually', () => {
    const roster = updateRosterSlot(createInitialRoster(), 'slot-0', { className: '기상술사' });

    expect(roster[0]).toMatchObject({ needsReview: false });
  });

  it('restores the review flag when only the nickname of a resolved build changes', () => {
    const withClass = updateRosterSlot(createInitialRoster(), 'slot-0', { className: '바드' });
    const resolved = updateRosterBuild(withClass, 'slot-0', '절실한 구원');
    const renamed = updateRosterSlot(resolved, 'slot-0', { nickname: '수정닉' });

    expect(renamed[0]).toMatchObject({
      nickname: '수정닉', arkPassiveStatus: 'idle', resolvedRole: null, needsReview: true,
    });
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
