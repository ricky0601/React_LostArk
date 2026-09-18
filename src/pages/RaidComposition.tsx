import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import NavBar from '../components/NavBar';
import RaidClassBadges from '../components/raid-composition/RaidClassBadges';
import RaidCompositionMini from '../components/raid-composition/RaidCompositionMini';
import RaidCompositionRecommendation from '../components/raid-composition/RaidCompositionRecommendation';
import { RAID_COMPOSITION_DATA_METADATA } from '../data/raidComposition';
import { getRaidBuildOptions } from '../data/raidBuildPositions';
import {
  evaluateRaidComposition,
  recommendRaidComposition,
  type CompositionStrategy,
  type PartyAssignment,
  type PartyNumber,
} from '../components/raid-composition/evaluateComposition';
import {
  CLASS_OPTIONS,
  enableRosterAutoRecognition,
  toCompositionMembers,
  updateRosterBuild,
  updateRosterSlot,
  type RaidRosterSlot,
} from '../components/raid-composition/roster';
import { countRecognizedSlots } from '../components/raid-composition/recognition';
import { useRaidScreenCapture } from '../components/raid-composition/useRaidScreenCapture';
import { useDocumentPictureInPicture } from '../hooks/useDocumentPictureInPicture';

const STRATEGY_LABEL: Record<CompositionStrategy, string> = {
  balanced: '균형 편성',
  'position-focused': '포지션 집중',
};

const STRATEGY_DESCRIPTION: Record<CompositionStrategy, string> = {
  balanced: '헤드·백을 분리하고 시너지 적용 전투력과 파티 균형을 함께 평가',
  'position-focused': '헤드·백·타대 딜러를 같은 포지션끼리 집중 배치',
};

const PARTY_LABEL: Record<PartyNumber, string> = { 1: '1파티', 2: '2파티' };

const CAPTURE_STATUS_LABEL = {
  idle: '화면 공유 전',
  requesting: '공유 화면 선택 중',
  sharing: '실시간 인식 중',
  review: '공유 종료',
  error: '인식 오류',
} as const;

const formatPositionSummary = (entropyHead: number, entropyBack: number, hitMaster: number, unknown: number): string => (
  `헤드 ${entropyHead} · 백 ${entropyBack} · 타대 ${hitMaster} · 판정 불가 ${unknown}`
);

export const SlotRow: React.FC<{
  slot: RaidRosterSlot;
  party: PartyNumber;
  dragging: boolean;
  onChange: (id: string, patch: Partial<Pick<RaidRosterSlot, 'className' | 'nickname' | 'combatPower' | 'currentParty' | 'fixed'>>) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onMoveParty: (id: string, party: PartyNumber) => void;
  onBuildChange: (id: string, title: string) => void;
  onEnableAutoRecognition: (id: string) => void;
}> = ({ slot, party, dragging, onChange, onDragStart, onDragEnd, onMoveParty, onBuildChange, onEnableAutoRecognition }) => {
  const slotLabel = `${party}파티 · 인식 ${slot.slot + 1}`;
  const buildOptions = getRaidBuildOptions(slot.className);
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
    <div className="flex items-center gap-2">
      <span className="cursor-grab text-xs font-semibold text-gray-600 active:cursor-grabbing dark:text-gray-300" title="드래그해서 파티 이동">
        {party}파티 · {(slot.slot % 4) + 1}번
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            aria-label={`${slotLabel} 고정`}
            checked={slot.fixed}
            onChange={(event) => onChange(slot.id, { fixed: event.target.checked })}
          />
          고정
        </label>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${slot.needsReview ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>
          {slot.needsReview ? '확인 필요' : '확인 완료'}
        </span>
      </div>
    </div>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5">
      <select
        aria-label={`${slotLabel} 직업`}
        value={slot.className}
        onChange={(event) => onChange(slot.id, { className: event.target.value })}
        className="min-h-9 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/5"
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
        placeholder="닉네임"
        maxLength={24}
        className="min-h-9 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/5"
      />
      <button
        type="button"
        onClick={() => onMoveParty(slot.id, party === 1 ? 2 : 1)}
        aria-label={`${slotLabel}를 ${party === 1 ? 2 : 1}파티로 이동`}
        title="다른 파티로 이동"
        className="min-h-9 rounded-md border border-gray-300 px-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
      >
        {party === 1 ? '2P →' : '← 1P'}
      </button>
    </div>
    <div className="flex flex-wrap items-center gap-1.5">
      {buildOptions.length > 0 && (
        <select
          aria-label={`${slotLabel} 빌드`}
          value={buildOptions.find((build) => build.titles.includes(slot.arkPassiveTitle))?.titles[0] ?? slot.arkPassiveTitle}
          onChange={(event) => onBuildChange(slot.id, event.target.value)}
          className="min-h-7 rounded border border-gray-300 bg-white px-1.5 text-[11px] dark:border-white/10 dark:bg-white/5"
        >
          <option value="">빌드 선택</option>
          {buildOptions.map((build) => (
            <option key={build.titles[0]} value={build.titles[0]}>{build.titles[0]}</option>
          ))}
        </select>
      )}
      <RaidClassBadges slot={slot} />
      <label className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
        전투력
        <input
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          aria-label={`${slotLabel} 전투력`}
          value={slot.combatPower ?? ''}
          onChange={(event) => {
            const value = event.target.value === '' ? null : Number(event.target.value);
            onChange(slot.id, { combatPower: Number.isFinite(value) && value != null && value > 0 ? value : null });
          }}
          placeholder="API 확인"
          className="h-7 w-24 rounded border border-gray-300 bg-white px-1.5 text-[11px] dark:border-white/10 dark:bg-white/5"
        />
      </label>
      {(slot.classNameSource === 'manual' || slot.nicknameSource === 'manual') && (
        <button
          type="button"
          onClick={() => onEnableAutoRecognition(slot.id)}
          className="text-[11px] font-semibold text-la-gold-dark underline dark:text-la-gold"
        >
          자동 인식으로 전환
        </button>
      )}
      {slot.arkPassiveMessage && (
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {slot.arkPassiveTitle && `${slot.arkPassiveTitle} · `}{slot.arkPassiveMessage}
        </span>
      )}
    </div>
  </li>
  );
};

export const CaptureProgress: React.FC<{ recognizedCount: number; framesScanned: number }> = ({
  recognizedCount,
  framesScanned,
}) => (
  <span className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400">
    <span aria-live="polite">{recognizedCount}/8명 확인</span>
    {framesScanned > 0 && <span>{` · ${framesScanned}회 분석`}</span>}
  </span>
);

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
  const filledCount = roster.filter((slot) => slot.className !== '').length;
  const hasDuplicateNickname = roster.some((slot) => slot.duplicateNickname);
  const hasUnresolvedRole = members.some((member) => member.role === 'unknown');
  const hasUnresolvedRoleOrBuild = members.some((member) => (
    member.role === 'unknown'
    || (member.role === 'dealer' && member.position === 'unknown')
  ));
  const recognizedCount = useMemo(
    () => countRecognizedSlots(roster.map((slot, index) => ({
      slot: index,
      party: slot.currentParty,
      occupancy: slot.className === '' ? 'vacant' as const : 'occupied' as const,
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
    () => (members.length === 8 && !hasUnresolvedRole
      ? recommendRaidComposition(members, strategy, RAID_COMPOSITION_DATA_METADATA.version)
      : null),
    [hasUnresolvedRole, members, strategy],
  );

  const handleSlotChange: React.ComponentProps<typeof SlotRow>['onChange'] = (id, patch) => {
    setRoster((current) => updateRosterSlot(current, id, patch));
  };
  const handleBuildChange = (id: string, title: string) => {
    setRoster((current) => updateRosterBuild(current, id, title));
  };
  const handleEnableAutoRecognition = (id: string) => {
    setRoster((current) => enableRosterAutoRecognition(current, id));
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

  const handleApplyRecommendation = () => {
    if (!recommendation) return;
    const firstPartyIds = new Set(recommendation.parties[1].map(({ id }) => id));
    setRoster((current) => current.map((slot) => (
      slot.className === ''
        ? slot
        : { ...slot, currentParty: firstPartyIds.has(slot.id) ? 1 : 2 }
    )));
  };

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="rounded-xl bg-gradient-to-br from-la-gold/15 via-transparent to-transparent p-4 sm:p-5">
        <p className="text-xs font-bold text-la-gold-dark dark:text-la-gold">8인 레이드</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">공대 편성 도우미</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          공대에 참여한 게임 화면을 공유하면 파티원을 자동으로 읽고, 전투력·시너지·헤드·백 포지션을 함께 고려한 추천 편성을 만들어 드립니다.
        </p>
      </header>

      <section aria-label="화면 공유" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white"><span className="mr-2 text-la-gold-dark dark:text-la-gold">1</span>공대 화면 불러오기</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">공대에 참여한 뒤 파티 찾기의 참가자 패널이 보이는 Lost Ark 화면이나 창을 선택하세요.</p>
          </div>
          <span role="status" className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status === 'sharing' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300' : status === 'error' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'}`}>
            {CAPTURE_STATUS_LABEL[status]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status === 'sharing' || status === 'requesting' ? (
            <button
              type="button"
              onClick={() => { void stop(); }}
              className="min-h-10 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              화면 공유 중지
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { void start(); }}
              className="min-h-10 rounded-md bg-la-gold px-4 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110"
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
          <CaptureProgress recognizedCount={recognizedCount} framesScanned={framesScanned} />
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
        {miniWindow.error && <p role="alert" className="mt-2 text-xs text-amber-600 dark:text-amber-300">{miniWindow.error}</p>}
        {!miniWindow.isSupported && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            미니 창은 데스크톱 Chrome 또는 Edge에서 지원됩니다.
          </p>
        )}
        <details className="mt-3 border-t border-gray-100 pt-3 dark:border-white/10">
          <summary className="cursor-pointer text-xs font-semibold text-gray-500 dark:text-gray-400">인식 및 개인정보 설정</summary>
          <label className="mt-2 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoArkPassiveLookup}
              onChange={(event) => setAutoArkPassiveLookup(event.target.checked)}
            />
            <span>닉네임으로 아크패시브 자동 확인</span>
          </label>
          <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
            이미지는 브라우저 안에서만 처리하고 저장하지 않습니다. 자동 확인을 켜면 인식된 닉네임만 Lost Ark Open API로 전송합니다.
          </p>
        </details>
      </section>

      <section aria-label="인식 결과 및 수동 보정" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white"><span className="mr-2 text-la-gold-dark dark:text-la-gold">2</span>인식 결과 확인</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">틀린 정보만 수정하세요. 카드를 끌거나 화살표를 눌러 파티를 바꿀 수 있습니다.</p>
          </div>
          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">{recognizedCount}/8 완료</span>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([1, 2] as const).map((party) => (
            <section
              key={party}
              aria-label={`${party}파티 슬롯`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDropOnParty(event, party)}
              className={`rounded-lg p-2.5 ${party === 1 ? 'bg-blue-50/70 dark:bg-blue-500/5' : 'bg-violet-50/70 dark:bg-violet-500/5'}`}
            >
              <h3 className="mb-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                {party}파티 · {roster.filter((slot) => slot.currentParty === party).length}/4
              </h3>
              <ul className="grid min-h-16 grid-cols-1 gap-2">
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
                    onBuildChange={handleBuildChange}
                    onEnableAutoRecognition={handleEnableAutoRecognition}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section aria-label="추천 편성" className="rounded-xl border border-la-gold/40 bg-white p-4 shadow-sm dark:bg-white/[0.03]">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white"><span className="mr-2 text-la-gold-dark dark:text-la-gold">3</span>추천 편성</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">원하는 편성 방식을 고르면 교환할 인원을 바로 알려드립니다.</p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(STRATEGY_LABEL) as CompositionStrategy[]).map((value) => (
            <label key={value} className={`cursor-pointer rounded-lg border p-3 transition-colors ${strategy === value ? 'border-la-gold bg-la-gold/10' : 'border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5'}`}>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="radio"
                  name="composition-strategy"
                  checked={strategy === value}
                  onChange={() => setStrategy(value)}
                />
                {STRATEGY_LABEL[value]}
              </span>
              <span className="mt-1 block pl-5 text-xs text-gray-500 dark:text-gray-400">{STRATEGY_DESCRIPTION[value]}</span>
            </label>
          ))}
        </div>
        {recommendation == null ? (
          <div className="mt-3 rounded-lg bg-gray-50 p-4 text-center dark:bg-white/5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {filledCount < 8
                ? `${8 - filledCount}명의 직업을 더 확인해 주세요`
                : hasDuplicateNickname
                  ? '중복된 닉네임을 확인해 주세요'
                  : hasUnresolvedRoleOrBuild
                    ? '역할 또는 빌드가 아직 확정되지 않았습니다'
                    : '각 파티에 서포터를 1명씩 배치해 주세요'}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {filledCount === 8 && !hasDuplicateNickname && hasUnresolvedRoleOrBuild
                ? '해당 슬롯에서 빌드를 선택하거나 아크패시브 자동 확인을 사용해 주세요.'
                : '조건이 갖춰지면 교환할 인원을 자동으로 표시합니다.'}
            </p>
          </div>
        ) : (
          <RaidCompositionRecommendation
            recommendation={recommendation}
            roster={roster}
            onApply={handleApplyRecommendation}
          />
        )}
      </section>

      {currentEvaluation && (
        <details className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200">현재 편성 상세 분석</summary>
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([1, 2] as const).map((party) => {
                const evaluation = currentEvaluation.partyEvaluations[party];
                return (
                  <div key={party} className="rounded-md bg-gray-50 p-3 text-sm dark:bg-white/5">
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
                      시너지 {evaluation.effectiveSynergyCount}종 · 같은 시너지 겹침 {evaluation.repeatedSynergyTypeCount + evaluation.duplicateSynergyCount}건
                    </p>
                  </div>
                );
              })}
            </div>
            {currentEvaluation.warnings.length > 0 && (
              <ul className="rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {currentEvaluation.warnings.map((warning, index) => (
                  <li key={`${warning.type}-${index}`}>
                    {warning.type === 'support-count' && `· ${PARTY_LABEL[warning.party]}에 서포터가 ${warning.actual}명 있습니다. 1명으로 맞춰 주세요.`}
                    {warning.type === 'party-size' && `· ${PARTY_LABEL[warning.party]} 인원이 ${warning.actual}명입니다. 4명으로 맞춰 주세요.`}
                    {warning.type === 'duplicate-synergy' && `· ${PARTY_LABEL[warning.party]}에 같은 시너지가 중복됩니다.`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      )}
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
