import React from 'react';
import type { ScreenCaptureStatus } from '../screen-recognition/types';
import RaidClassBadges from './RaidClassBadges';
import type {
  CompositionEvaluation,
  CompositionRecommendation,
  CompositionStrategy,
  PartyNumber,
} from './evaluateComposition';
import {
  CLASS_OPTIONS,
  getRaidClassDisplayLabel,
  updateRosterSlot,
  type RaidRosterSlot,
} from './roster';

interface RaidCompositionMiniProps {
  readonly roster: readonly RaidRosterSlot[];
  readonly setRoster: React.Dispatch<React.SetStateAction<readonly RaidRosterSlot[]>>;
  readonly status: ScreenCaptureStatus;
  readonly error: string | null;
  readonly framesScanned: number;
  readonly autoArkPassiveLookup: boolean;
  readonly setAutoArkPassiveLookup: (enabled: boolean) => void;
  readonly strategy: CompositionStrategy;
  readonly setStrategy: (strategy: CompositionStrategy) => void;
  readonly currentEvaluation: CompositionEvaluation | null;
  readonly recommendation: CompositionRecommendation | null;
  readonly start: (mediaDevices?: MediaDevices) => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly close: () => void;
}

const statusLabel: Record<ScreenCaptureStatus, string> = {
  idle: '대기 중',
  requesting: '공유 화면 선택 중',
  sharing: '화면 공유 중',
  review: '공유 종료 · 검토 중',
  error: '오류',
};

const partyOf = (
  recommendation: CompositionRecommendation,
  memberId: string,
): PartyNumber => (recommendation.parties[1].some((member) => member.id === memberId) ? 1 : 2);

const RaidCompositionMini: React.FC<RaidCompositionMiniProps> = ({
  roster,
  setRoster,
  status,
  error,
  framesScanned,
  autoArkPassiveLookup,
  setAutoArkPassiveLookup,
  strategy,
  setStrategy,
  currentEvaluation,
  recommendation,
  start,
  stop,
  close,
}) => {
  const startFromThisWindow = (event: React.MouseEvent<HTMLButtonElement>) => {
    const mediaDevices = event.currentTarget.ownerDocument.defaultView?.navigator.mediaDevices;
    void start(mediaDevices);
  };

  const updateSlot = (
    id: string,
    patch: Partial<Pick<RaidRosterSlot, 'className' | 'currentParty' | 'fixed'>>,
  ) => setRoster((current) => updateRosterSlot(current, id, patch));
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const moveToParty = (id: string, party: PartyNumber) => updateSlot(id, { currentParty: party });

  return (
    <main className="flex min-h-screen flex-col gap-3 p-3 text-sm">
      <header className="sticky top-0 z-10 -mx-3 -mt-3 border-b border-gray-200 bg-gray-50/95 p-3 backdrop-blur dark:border-white/10 dark:bg-la-dark/95">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-bold">8인 공대 편성</h1>
            <p className={`mt-0.5 text-xs ${status === 'sharing' ? 'font-semibold text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {statusLabel[status]}{framesScanned > 0 && ` · ${framesScanned}회 분석`}
            </p>
          </div>
          <button type="button" onClick={close} className="min-h-9 rounded-md border border-gray-300 px-2 dark:border-white/10">
            닫기
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          {status === 'sharing' || status === 'requesting' ? (
            <button
              type="button"
              onClick={() => { void stop(); }}
              className="min-h-9 flex-1 rounded-md bg-red-500 px-3 font-semibold text-white"
            >
              화면 공유 중지
            </button>
          ) : (
            <button
              type="button"
              onClick={startFromThisWindow}
              className="min-h-9 flex-1 rounded-md bg-la-gold px-3 font-semibold text-white"
            >
              화면 공유 시작
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <label className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={autoArkPassiveLookup}
            onChange={(event) => setAutoArkPassiveLookup(event.target.checked)}
          />
          닉네임으로 아크패시브 자동 확인
        </label>
      </header>

      <section aria-label="추천 요약" className="rounded-lg border border-la-gold/30 bg-la-gold/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">실시간 추천</h2>
          <select
            aria-label="미니 창 편성 전략"
            value={strategy}
            onChange={(event) => setStrategy(event.target.value as CompositionStrategy)}
            className="min-h-8 rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-white/10 dark:bg-la-dark"
          >
            <option value="balanced">균형형</option>
            <option value="position-focused">포지션 집중형</option>
          </select>
        </div>
        {!recommendation ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">8개 슬롯을 채우면 추천 교환을 표시합니다.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-1 text-xs">
            {!recommendation.isConfirmed && (
              <p className="rounded bg-amber-100 p-1.5 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                판정 불가 {recommendation.unresolvedMemberIds.length}명 · 수동 확인 필요
              </p>
            )}
            <p className="font-semibold">
              이동 {recommendation.movedMemberIds.length}명
              {recommendation.movedMemberIds.length > 0 && ` · ${recommendation.movedMemberIds.map((id) => {
                const member = [...recommendation.parties[1], ...recommendation.parties[2]].find((item) => item.id === id);
                return `${member ? getRaidClassDisplayLabel(member.className, member) : id} → ${partyOf(recommendation, id)}파티`;
              }).join(', ')}`}
            </p>
            {recommendation.reasons.slice(0, 3).map((reason) => <p key={reason}>· {reason}</p>)}
          </div>
        )}
      </section>

      {currentEvaluation && currentEvaluation.warnings.length > 0 && (
        <section aria-label="현재 편성 경고" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          {currentEvaluation.warnings.map((warning, index) => (
            <p key={`${warning.type}-${index}`}>
              · {warning.party}파티 {warning.type === 'support-count'
                ? `서포터 ${warning.actual}명`
                : warning.type === 'party-size'
                  ? `인원 ${warning.actual}명`
                  : `시너지 중복 (${warning.stackingGroup})`}
            </p>
          ))}
        </section>
      )}

      <section aria-label="미니 창 슬롯 수동 조절" className="flex flex-col gap-3">
        {([1, 2] as const).map((party) => (
          <div
            key={party}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData('text/plain') || draggingId;
              if (id) moveToParty(id, party);
              setDraggingId(null);
            }}
          >
            <h2 className="mb-1 text-xs font-bold text-gray-600 dark:text-gray-300">{party}파티</h2>
            <ul className="grid min-h-10 grid-cols-2 gap-1">
              {roster.filter((slot) => slot.currentParty === party).map((slot) => (
                <li
                  key={slot.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', slot.id);
                    event.dataTransfer.effectAllowed = 'move';
                    setDraggingId(slot.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  className={`flex flex-wrap items-center gap-1 rounded-md border border-gray-200 p-1.5 dark:border-white/10 ${draggingId === slot.id ? 'opacity-50' : ''}`}
                >
                  <span className="w-5 text-center text-xs text-gray-400" title={`인식 ${slot.slot + 1}`}>{(slot.slot % 4) + 1}</span>
                  <div className="flex w-fit max-w-full shrink-0 flex-col gap-1">
                    <select
                      aria-label={`미니 창 ${party}파티 인식 ${slot.slot + 1}번 슬롯 직업`}
                      value={slot.className}
                      onChange={(event) => updateSlot(slot.id, { className: event.target.value })}
                      className="min-h-8 w-auto max-w-full rounded border border-gray-300 bg-white px-1 text-xs dark:border-white/10 dark:bg-la-dark"
                    >
                      <option value="">직업 선택</option>
                      {CLASS_OPTIONS.map((className) => (
                        <option key={className} value={className}>{className}</option>
                      ))}
                    </select>
                    <RaidClassBadges slot={slot} compact />
                  </div>
                  <button
                    type="button"
                    onClick={() => moveToParty(slot.id, party === 1 ? 2 : 1)}
                    aria-label={`미니 창 ${party}파티 인식 ${slot.slot + 1}번을 ${party === 1 ? 2 : 1}파티로 이동`}
                    className="min-h-8 rounded border border-gray-300 px-1 text-[11px] dark:border-white/10"
                  >
                    {party === 1 ? '2P로' : '1P로'}
                  </button>
                  <label className="flex items-center gap-1 text-[11px]">
                    <input
                      type="checkbox"
                      checked={slot.fixed}
                      onChange={(event) => updateSlot(slot.id, { fixed: event.target.checked })}
                    />
                    고정
                  </label>
                  {slot.arkPassiveMessage && (
                    <span className="max-w-20 truncate text-[10px] text-gray-400" title={slot.arkPassiveMessage}>
                      {slot.arkPassiveTitle || slot.arkPassiveMessage}
                    </span>
                  )}
                  <span
                    title={slot.needsReview ? '검토 필요' : '확인됨'}
                    className={`h-2 w-2 shrink-0 rounded-full ${slot.needsReview ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <p className="mt-auto text-[10px] text-gray-400">
        캡처 이미지는 브라우저 내부에서만 처리됩니다. Lost Ark 창을 공유하면 미니 창이 캡처에 포함되지 않습니다.
      </p>
    </main>
  );
};

export default RaidCompositionMini;
