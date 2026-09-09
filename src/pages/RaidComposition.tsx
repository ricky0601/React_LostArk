import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import NavBar from '../components/NavBar';
import RaidClassBadges from '../components/raid-composition/RaidClassBadges';
import RaidCompositionMini from '../components/raid-composition/RaidCompositionMini';
import { RAID_COMPOSITION_DATA_METADATA } from '../data/raidComposition';
import {
  evaluateRaidComposition,
  recommendRaidComposition,
  type CompositionStrategy,
  type PartyAssignment,
  type PartyNumber,
} from '../components/raid-composition/evaluateComposition';
import {
  CLASS_OPTIONS,
  getRaidClassDisplayLabel,
  toCompositionMembers,
  updateRosterSlot,
  type RaidRosterSlot,
} from '../components/raid-composition/roster';
import { countRecognizedSlots } from '../components/raid-composition/recognition';
import { useRaidScreenCapture } from '../components/raid-composition/useRaidScreenCapture';
import { useDocumentPictureInPicture } from '../hooks/useDocumentPictureInPicture';

const STRATEGY_LABEL: Record<CompositionStrategy, string> = {
  balanced: '균형형 (각 파티 타대 2 + 헤드/백 1)',
  'position-focused': '포지션 집중형 (헤드/백 파티 + 타대 파티)',
};

const PARTY_LABEL: Record<PartyNumber, string> = { 1: '1파티', 2: '2파티' };

const formatPositionSummary = (entropyHead: number, entropyBack: number, hitMaster: number, unknown: number): string => (
  `헤드 ${entropyHead} · 백 ${entropyBack} · 타대 ${hitMaster} · 판정 불가 ${unknown}`
);

const SlotRow: React.FC<{
  slot: RaidRosterSlot;
  party: PartyNumber;
  dragging: boolean;
  onChange: (id: string, patch: Partial<Pick<RaidRosterSlot, 'className' | 'nickname' | 'currentParty' | 'fixed'>>) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onMoveParty: (id: string, party: PartyNumber) => void;
}> = ({ slot, party, dragging, onChange, onDragStart, onDragEnd, onMoveParty }) => {
  const slotLabel = `${party}파티 · 인식 ${slot.slot + 1}`;
  return (
  <li
    draggable
    onDragStart={(event) => {
      event.dataTransfer.setData('text/plain', slot.id);
      event.dataTransfer.effectAllowed = 'move';
      onDragStart(slot.id);
    }}
    onDragEnd={onDragEnd}
    className={`flex flex-col gap-1.5 rounded-md border border-gray-200 p-2 dark:border-white/10 ${dragging ? 'opacity-50' : ''}`}
  >
    <div className="flex flex-wrap items-center gap-2">
    <span className="flex w-14 shrink-0 cursor-grab flex-col text-xs font-semibold text-gray-600 active:cursor-grabbing dark:text-gray-300" title="드래그해서 파티 이동">
      <span>{party}파티</span>
      <span className="font-normal text-gray-400">인식 {slot.slot + 1}</span>
    </span>
      <select
        aria-label={`${slotLabel} 직업`}
        value={slot.className}
        onChange={(event) => onChange(slot.id, { className: event.target.value })}
        className="min-h-9 w-fit max-w-full shrink-0 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/5"
      >
        <option value="">직업 선택</option>
        {CLASS_OPTIONS.map((className) => (
          <option key={className} value={className}>{className}</option>
        ))}
      </select>
    <input
      aria-label={`${slotLabel} 닉네임`}
      value={slot.nickname}
      onChange={(event) => onChange(slot.id, { nickname: event.target.value })}
      placeholder="닉네임 (선택)"
      maxLength={24}
      className="min-h-9 w-28 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/5"
    />
    <button
      type="button"
      onClick={() => onMoveParty(slot.id, party === 1 ? 2 : 1)}
      aria-label={`${slotLabel}를 ${party === 1 ? 2 : 1}파티로 이동`}
      title="드래그하거나 클릭해서 파티 이동"
      className="min-h-9 rounded-md border border-gray-300 px-2 text-xs text-gray-600 dark:border-white/10 dark:text-gray-300"
    >
      {party === 1 ? '2파티로' : '1파티로'}
    </button>
    <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
      <input
        type="checkbox"
        checked={slot.fixed}
        onChange={(event) => onChange(slot.id, { fixed: event.target.checked })}
      />
      고정
    </label>
      <span className={`ml-auto shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${slot.needsReview ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>
        {slot.needsReview ? '검토 필요' : '확인됨'}
      </span>
    </div>
    <div className="flex flex-wrap items-center gap-1.5">
      <RaidClassBadges slot={slot} />
      {slot.arkPassiveMessage && (
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {slot.arkPassiveTitle && `${slot.arkPassiveTitle} · `}{slot.arkPassiveMessage}
        </span>
      )}
    </div>
  </li>
  );
};

const RaidCompositionPage: React.FC = () => {
  const {
    roster,
    setRoster,
    framesScanned,
    status,
    error,
    start,
    stop,
    reset,
    autoArkPassiveLookup,
    setAutoArkPassiveLookup,
  } = useRaidScreenCapture();
  const [strategy, setStrategy] = useState<CompositionStrategy>('balanced');
  const miniWindow = useDocumentPictureInPicture();

  const members = useMemo(() => toCompositionMembers(roster), [roster]);
  const filledCount = members.length;
  const recognizedCount = useMemo(
    () => countRecognizedSlots(roster.map((slot, index) => ({
      slot: index,
      party: slot.currentParty,
      className: slot.className === '' ? null : slot.className,
      confidence: slot.confidence,
      needsReview: slot.needsReview,
      nickname: slot.nickname === '' ? null : slot.nickname,
      nicknameCandidates: slot.nicknameCandidates,
    }))),
    [roster],
  );

  const currentAssignment = useMemo<PartyAssignment | null>(() => {
    if (filledCount !== 8) return null;
    return {
      1: members.filter((member) => member.currentParty === 1),
      2: members.filter((member) => member.currentParty === 2),
    };
  }, [filledCount, members]);

  const currentEvaluation = useMemo(
    () => (currentAssignment ? evaluateRaidComposition(currentAssignment, strategy) : null),
    [currentAssignment, strategy],
  );
  const recommendation = useMemo(
    () => (filledCount === 8
      ? recommendRaidComposition(members, strategy, RAID_COMPOSITION_DATA_METADATA.version)
      : null),
    [filledCount, members, strategy],
  );

  const handleSlotChange: React.ComponentProps<typeof SlotRow>['onChange'] = (id, patch) => {
    setRoster((current) => updateRosterSlot(current, id, patch));
  };
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const handleMoveParty = (id: string, party: PartyNumber) => {
    setRoster((current) => updateRosterSlot(current, id, { currentParty: party }));
  };
  const handleDropOnParty = (event: React.DragEvent, party: PartyNumber) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggingId;
    if (id) handleMoveParty(id, party);
    setDraggingId(null);
  };

  const recommendedPartyOf = (memberId: string): PartyNumber | null => {
    if (!recommendation) return null;
    if (recommendation.parties[1].some((member) => member.id === memberId)) return 1;
    if (recommendation.parties[2].some((member) => member.id === memberId)) return 2;
    return null;
  };

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">공대 편성 도우미 (8인)</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          화면 공유로 8인 모집창을 인식하고 시너지·중첩과 헤드·백·타대 분포를 기준으로 1·2파티 추천안을 확인합니다.
          캡처 이미지는 브라우저 안에서만 처리되며 서버에 저장되지 않습니다.
        </p>
      </header>

      <section aria-label="화면 공유" className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          {status === 'sharing' || status === 'requesting' ? (
            <button
              type="button"
              onClick={() => { void stop(); }}
              className="min-h-9 rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              화면 공유 중지
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { void start(); }}
              className="min-h-9 rounded-md bg-la-gold px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
            >
              화면 공유 시작
            </button>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-9 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-white/10"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => { void miniWindow.open(); }}
            disabled={!miniWindow.isSupported}
            className="min-h-9 rounded-md border border-la-gold px-3 py-1.5 text-sm font-semibold text-la-gold-dark disabled:cursor-not-allowed disabled:opacity-50 dark:text-la-gold"
          >
            {miniWindow.pictureInPictureWindow ? '미니 창으로 이동' : '미니 창 열기'}
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
            상태: {status}{framesScanned > 0 && ` · ${framesScanned}회 분석`}
            {` · ${recognizedCount}/8 인식`}
          </span>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        {miniWindow.error && <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">{miniWindow.error}</p>}
        {!miniWindow.isSupported && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            미니 창은 데스크톱 Chrome 또는 Edge에서 지원됩니다.
          </p>
        )}
        <label className="mt-2 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={autoArkPassiveLookup}
            onChange={(event) => setAutoArkPassiveLookup(event.target.checked)}
          />
          <span>
            닉네임 OCR로 아크패시브 자동 확인
            <span className="block text-gray-500 dark:text-gray-400">
              화면 이미지는 전송하지 않으며, 안정적으로 인식된 닉네임만 Lost Ark Open API로 전송합니다.
            </span>
          </span>
        </label>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          직업과 닉네임은 브라우저 내부에서 인식합니다. 닉네임 또는 API 조회 실패는 직업·파티 인식에 영향을 주지 않습니다.
        </p>
      </section>

      <section aria-label="인식 결과 및 수동 보정" className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">인식 결과 · 수동 보정</h2>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">카드를 드래그해서 파티 사이로 옮기거나, 파티 이동 버튼을 사용하세요.</p>
        <div className="mt-2 flex flex-col gap-3">
          {([1, 2] as const).map((party) => (
            <section
              key={party}
              aria-label={`${party}파티 슬롯`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDropOnParty(event, party)}
              className={party === 2 ? 'border-t border-gray-200 pt-3 dark:border-white/10' : undefined}
            >
              <h3 className="mb-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                {party}파티 · {roster.filter((slot) => slot.currentParty === party).length}/4
              </h3>
              <ul className="grid min-h-16 grid-cols-2 gap-2 rounded-md">
                {roster.filter((slot) => slot.currentParty === party).map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    party={party}
                    dragging={draggingId === slot.id}
                    onChange={handleSlotChange}
                    onDragStart={setDraggingId}
                    onDragEnd={() => setDraggingId(null)}
                    onMoveParty={handleMoveParty}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section aria-label="편성 전략" className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">편성 전략</h2>
        <div className="mt-2 flex flex-col gap-1">
          {(Object.keys(STRATEGY_LABEL) as CompositionStrategy[]).map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="composition-strategy"
                checked={strategy === value}
                onChange={() => setStrategy(value)}
              />
              {STRATEGY_LABEL[value]}
            </label>
          ))}
        </div>
      </section>

      <section aria-label="편성 분석" className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">편성 분석</h2>
        {currentEvaluation == null ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            8개 슬롯의 직업을 모두 선택하면 현재 편성 분석과 추천안을 표시합니다. ({filledCount}/8 입력됨)
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([1, 2] as const).map((party) => {
                const evaluation = currentEvaluation.partyEvaluations[party];
                return (
                  <div key={party} className="rounded-md bg-gray-50 p-2 text-sm dark:bg-white/5">
                    <p className="font-semibold">{PARTY_LABEL[party]} · 서포터 {evaluation.supportCount}명</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatPositionSummary(
                        evaluation.positions.entropyHead,
                        evaluation.positions.entropyBack,
                        evaluation.positions.hitMaster,
                        evaluation.positions.unknown,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      유효 시너지 {evaluation.effectiveSynergyCount}종 · 방깎 {evaluation.armorReductionCount}개 · 중복 {evaluation.duplicateSynergyCount}건
                    </p>
                  </div>
                );
              })}
            </div>
            {currentEvaluation.warnings.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm text-amber-700 dark:text-amber-300">
                {currentEvaluation.warnings.map((warning, index) => (
                  <li key={`${warning.type}-${index}`}>
                    {warning.type === 'support-count' && `${PARTY_LABEL[warning.party]} 서포터가 ${warning.actual}명입니다 (기대: 1명).`}
                    {warning.type === 'party-size' && `${PARTY_LABEL[warning.party]} 인원이 ${warning.actual}명입니다 (기대: 4명).`}
                    {warning.type === 'duplicate-synergy' && `${PARTY_LABEL[warning.party]} 시너지 중복: ${warning.stackingGroup}.`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section aria-label="추천 편성" className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">추천 편성</h2>
        {recommendation == null ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            8명을 모두 입력하고 각 파티에 서포터가 1명씩 있어야 추천안을 계산합니다.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2 text-sm">
            {!recommendation.isConfirmed && (
              <p className="rounded-md bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                판정 불가 슬롯({recommendation.unresolvedMemberIds.length}명)이 있어 확정 추천이 아닙니다. 해당 슬롯을 수동으로 확인해 주세요.
              </p>
            )}
            <p>
              추천 교환: 이동 {recommendation.movedMemberIds.length}명
              {recommendation.movedMemberIds.length > 0 && (
                <>
                  {' — '}
                  {recommendation.movedMemberIds.map((memberId) => {
                    const member = members.find((candidate) => candidate.id === memberId);
                    const toParty = recommendedPartyOf(memberId);
                    return `${member ? getRaidClassDisplayLabel(member.className, member) : memberId} (${member?.currentParty}→${toParty})`;
                  }).join(', ')}
                </>
              )}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([1, 2] as const).map((party) => (
                <div key={party} className="rounded-md bg-gray-50 p-2 dark:bg-white/5">
                  <p className="font-semibold">{PARTY_LABEL[party]}</p>
                  <ul className="mt-1 flex flex-col gap-0.5 text-xs">
                    {recommendation.parties[party].map((member) => (
                      <li key={member.id}>{getRaidClassDisplayLabel(member.className, member)}{member.fixed ? ' (고정)' : ''}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <ul className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
              {recommendation.reasons.map((reason) => (
                <li key={reason}>· {reason}</li>
              ))}
            </ul>
            <p className="text-xs text-gray-400">데이터 버전: {recommendation.dataVersion}</p>
          </div>
        )}
      </section>
      </main>
      {miniWindow.portalRoot && createPortal(
        <RaidCompositionMini
          roster={roster}
          setRoster={setRoster}
          status={status}
          error={error}
          framesScanned={framesScanned}
          autoArkPassiveLookup={autoArkPassiveLookup}
          setAutoArkPassiveLookup={setAutoArkPassiveLookup}
          strategy={strategy}
          setStrategy={setStrategy}
          currentEvaluation={currentEvaluation}
          recommendation={recommendation}
          start={start}
          stop={stop}
          close={miniWindow.close}
        />,
        miniWindow.portalRoot,
      )}
    </>
  );
};

export default RaidCompositionPage;
