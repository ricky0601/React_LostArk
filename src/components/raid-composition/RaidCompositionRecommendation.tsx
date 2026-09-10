import React from 'react';
import type { CompositionRecommendation, RaidCompositionMember } from './evaluateComposition';
import type { RaidRosterSlot } from './roster';

export interface RecommendationExchange {
  readonly toFirstParty: RaidCompositionMember | null;
  readonly toSecondParty: RaidCompositionMember | null;
}

export const getRecommendationExchanges = (
  recommendation: CompositionRecommendation,
): readonly RecommendationExchange[] => {
  const toFirstParty = recommendation.parties[1]
    .filter((member) => member.currentParty === 2);
  const toSecondParty = recommendation.parties[2]
    .filter((member) => member.currentParty === 1);
  return Array.from({ length: Math.max(toFirstParty.length, toSecondParty.length) }, (_, index) => ({
    toFirstParty: toFirstParty[index] ?? null,
    toSecondParty: toSecondParty[index] ?? null,
  }));
};

const MemberName: React.FC<{
  member: RaidCompositionMember;
  rosterById: ReadonlyMap<string, RaidRosterSlot>;
}> = ({ member, rosterById }) => {
  const nickname = rosterById.get(member.id)?.nickname.trim();
  return (
    <span className="flex min-w-0 flex-col">
      <strong className="truncate text-sm text-gray-900 dark:text-white">{nickname || member.className}</strong>
      {nickname && <span className="text-[11px] text-gray-500 dark:text-gray-400">{member.className}</span>}
    </span>
  );
};

const RaidCompositionRecommendation: React.FC<{
  recommendation: CompositionRecommendation;
  roster: readonly RaidRosterSlot[];
  onApply: () => void;
}> = ({ recommendation, roster, onApply }) => {
  const exchanges = getRecommendationExchanges(recommendation);
  const rosterById = new Map(roster.map((slot) => [slot.id, slot]));

  return (
    <div className="mt-2 flex flex-col gap-3 text-sm">
      {!recommendation.isConfirmed && (
        <p className="rounded-md bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          판정이 끝나지 않은 인원이 {recommendation.unresolvedMemberIds.length}명 있습니다.
        </p>
      )}

      {exchanges.length === 0 ? (
        <p className="rounded-md bg-emerald-50 p-3 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          현재 파티가 추천 편성과 일치합니다.
        </p>
      ) : (
        <>
          <div className="rounded-lg border-2 border-la-gold/50 bg-la-gold/5 p-3">
            <p className="mb-2 font-bold text-gray-900 dark:text-white">
              {exchanges.every(({ toFirstParty, toSecondParty }) => toFirstParty && toSecondParty)
                ? `${exchanges.length}쌍 자리 교환`
                : `${recommendation.movedMemberIds.length}명 파티 이동`}
            </p>
            <ul className="flex flex-col gap-2">
              {exchanges.map(({ toFirstParty, toSecondParty }, index) => (
                <li key={`${toFirstParty?.id ?? 'empty'}-${toSecondParty?.id ?? 'empty'}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md bg-white p-2 shadow-sm dark:bg-white/5">
                  <div className="min-w-0">
                    <span className="mb-1 block text-[10px] font-semibold text-blue-600 dark:text-blue-300">1파티로</span>
                    {toFirstParty ? <MemberName member={toFirstParty} rosterById={rosterById} /> : <span>-</span>}
                  </div>
                  <span className="text-lg font-bold text-la-gold" aria-label={`교환 ${index + 1}`}>↔</span>
                  <div className="min-w-0 text-right">
                    <span className="mb-1 block text-[10px] font-semibold text-violet-600 dark:text-violet-300">2파티로</span>
                    {toSecondParty ? <MemberName member={toSecondParty} rosterById={rosterById} /> : <span>-</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={onApply}
            className="min-h-11 rounded-md bg-la-gold px-4 py-2 font-bold text-white hover:brightness-110"
          >
            위 교환을 파티에 적용
          </button>
        </>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        서포터를 한 명씩 배치하고 같은 유형의 시너지가 한 파티에 몰리지 않도록 계산했습니다.
      </p>

      <details className="rounded-md border border-gray-200 p-2 dark:border-white/10">
        <summary className="cursor-pointer text-xs font-semibold text-gray-600 dark:text-gray-300">적용 후 파티 구성 보기</summary>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([1, 2] as const).map((party) => (
            <div key={party} className="rounded-md bg-gray-50 p-2 dark:bg-white/5">
              <p className="font-semibold">{party}파티</p>
              <ul className="mt-1 flex flex-col gap-1 text-xs">
                {recommendation.parties[party].map((member) => {
                  const nickname = rosterById.get(member.id)?.nickname.trim();
                  return <li key={member.id}>{nickname ? `${nickname} · ${member.className}` : member.className}{member.fixed ? ' · 고정' : ''}</li>;
                })}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

export default RaidCompositionRecommendation;
