import React, { useCallback, useState } from 'react';
import type { CharacterProfile } from '../../types/lostark';
import { fetchEngravings, fetchGems, fetchArkPassive, fetchCards } from '../../utils/api';
import { calcSpecScore, type SpecScoreResult } from '../../utils/specScore';

type ScoreState = SpecScoreResult | 'loading' | 'error';

interface Props {
  characterNames: string[];
  characterProfiles: Map<string, CharacterProfile>;
}

const scoreColor = (score: number): string => {
  if (score < 1500) return 'text-gray-400 dark:text-gray-500';
  if (score < 2500) return 'text-la-gold-dark dark:text-la-gold';
  if (score < 5000) return 'text-purple-500 dark:text-purple-400';
  return 'bg-gradient-to-r from-la-gold to-la-gold-light bg-clip-text text-transparent font-extrabold';
};

const ScoreBadge: React.FC<{ score: number }> = ({ score }) => (
  <span className={`text-xl font-bold tabular-nums ${scoreColor(score)}`}>
    {score.toLocaleString()}
  </span>
);

const RoleBadge: React.FC<{ role: 'dealer' | 'supporter' }> = ({ role }) => (
  <span
    className={`px-2 py-0.5 text-xs rounded-md font-medium ${
      role === 'supporter'
        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
        : 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
    }`}
  >
    {role === 'supporter' ? '서폿' : '딜러'}
  </span>
);

const BreakdownRow: React.FC<{ label: string; value: number; unit?: string; muted?: boolean }> = ({
  label,
  value,
  unit = '%',
  muted,
}) => (
  <div
    className={`flex items-center justify-between text-xs ${
      muted ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'
    }`}
  >
    <span>{label}</span>
    <span className="tabular-nums font-medium">
      {value.toFixed(2)}
      {unit}
    </span>
  </div>
);

const SpecScoreBreakdown: React.FC<{ result: SpecScoreResult }> = ({ result }) => {
  const { breakdown } = result;
  const isDealer = breakdown.role === 'dealer';
  const [showDebug, setShowDebug] = React.useState(false);
  const { rawDebug } = breakdown.meta;
  return (
    <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-white/5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <BreakdownRow label="직업 깨달음" value={breakdown.classAwakening} />
        <BreakdownRow label="공용 각인 (5슬롯)" value={breakdown.commonEngraving} />
        <BreakdownRow label="멸화/겁화 (피해)" value={breakdown.gemDamage} muted={!isDealer} />
        <BreakdownRow label="홍염/작열 (쿨감)" value={breakdown.gemCooldown} />
        <BreakdownRow label="T4 기본 공격력" value={breakdown.gemBaseAttack} muted={!isDealer} />
        <BreakdownRow label="겁화 지원 효과" value={breakdown.gemSupportEffect} muted={isDealer} />
        <BreakdownRow label="카드 세트" value={breakdown.cardSet} />
        <BreakdownRow label="스탯 환산" value={breakdown.statPercent} />
      </div>
      {breakdown.meta.missingData.length > 0 && (
        <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
          ⚠ 미인식 항목: {breakdown.meta.missingData.length}개
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-600">
        <span>
          {breakdown.meta.className}
          {breakdown.meta.awakeningId && ` · ${breakdown.meta.awakeningId}`}
        </span>
        <span>Lv.{breakdown.meta.itemLevel.toFixed(0)}</span>
      </div>
      <button
        type="button"
        onClick={() => setShowDebug((v) => !v)}
        className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline-offset-2 hover:underline"
      >
        {showDebug ? '디버그 닫기 ▲' : 'API 응답 디버그 ▼'}
      </button>
      {showDebug && (
        <div className="mt-2 space-y-2 text-[10px] font-mono bg-gray-900/5 dark:bg-black/30 rounded-lg p-2 max-h-80 overflow-auto">
          <div>
            <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">
              각인 효율 ({rawDebug.arkPassive.length})
            </div>
            {rawDebug.arkPassive.length === 0 ? (
              <div className="text-red-500 dark:text-red-400">⚠ 빈 배열 — API 응답에 없음</div>
            ) : (
              <>
                {rawDebug.arkPassive.map((e, i) => (
                  <div
                    key={i}
                    className={`flex justify-between gap-2 ${
                      e.matched === 'none'
                        ? 'text-red-500 dark:text-red-400'
                        : e.matched === 'class'
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    <span className="truncate">
                      [{e.matched}] {e.name}
                      {e.grade && <span className="ml-1 text-gray-400">{e.grade}</span>}
                    </span>
                    <span className="tabular-nums whitespace-nowrap">
                      Lv.{e.level}
                      {(e.abilityStoneLevel ?? 0) > 0 && (
                        <span className="ml-1 text-gray-400">+stone{e.abilityStoneLevel}</span>
                      )}
                      {e.value !== undefined && (
                        <span className="ml-2 font-bold">+{e.value.toFixed(2)}%</span>
                      )}
                    </span>
                  </div>
                ))}
                <div className="mt-1 pt-1 border-t border-gray-300 dark:border-white/10 flex justify-between font-bold">
                  <span className="text-gray-700 dark:text-gray-300">각인 총합</span>
                  <span className="tabular-nums text-la-gold-dark dark:text-la-gold">
                    {rawDebug.arkPassive
                      .reduce((sum, e) => sum + (e.value ?? 0), 0)
                      .toFixed(2)}
                    %
                  </span>
                </div>
              </>
            )}
          </div>
          <div>
            <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">
              Gems ({rawDebug.gems.length})
            </div>
            {rawDebug.gems.length === 0 ? (
              <div className="text-red-500 dark:text-red-400">⚠ 빈 배열 — API 응답에 없음</div>
            ) : (
              rawDebug.gems.map((g, i) => (
                <div
                  key={i}
                  className={`flex justify-between ${
                    g.type === 'unknown' ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  <span>
                    [{g.type}/{g.tier}
                    {g.hasSupport ? '+sup' : ''}] {g.name}
                  </span>
                  <span>Lv.{g.level}</span>
                </div>
              ))
            )}
          </div>
          <div>
            <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">
              ArkPassive API ({rawDebug.arkPassiveApi?.length ?? 0})
            </div>
            {!rawDebug.arkPassiveApi || rawDebug.arkPassiveApi.length === 0 ? (
              <div className="text-red-500 dark:text-red-400">⚠ ArkPassive API 응답 없음/빈 배열</div>
            ) : (
              rawDebug.arkPassiveApi.map((a, i) => (
                <div
                  key={i}
                  className={a.matched ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-500'}
                >
                  <div className="flex justify-between">
                    <span>
                      [{a.matched ?? 'none'}] {a.tab}
                    </span>
                    <span>Lv.{a.level}</span>
                  </div>
                  {a.nodesFound.length > 0 && (
                    <div className="text-gray-400 dark:text-gray-600 pl-2 truncate">
                      nodes: {a.nodesFound.join(', ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div>
            <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">
              Cards API ({rawDebug.cardsApi?.length ?? 0})
            </div>
            {!rawDebug.cardsApi || rawDebug.cardsApi.length === 0 ? (
              <div className="text-red-500 dark:text-red-400">⚠ Cards API 응답 없음/빈 배열</div>
            ) : (
              rawDebug.cardsApi.map((c, i) => (
                <div
                  key={i}
                  className={
                    c.matched ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                  }
                >
                  [{c.matched ? `match ${c.matchedAwakening}각` : 'no-match'}] {c.effectName}
                </div>
              ))
            )}
          </div>
          <div>
            <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">
              Engravings.Effects (구) ({rawDebug.cardEffects.length})
            </div>
            {rawDebug.cardEffects.length === 0 ? (
              <div className="text-gray-400 dark:text-gray-600">(빈 배열 — 시즌3 정상)</div>
            ) : (
              rawDebug.cardEffects.map((c, i) => (
                <div
                  key={i}
                  className={`${
                    c.matched ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>
                      [{c.matched ? `match ${c.matchedAwakening}각` : 'no-match'}] {c.name}
                    </span>
                  </div>
                  <div className="text-gray-400 dark:text-gray-600 pl-2 truncate" title={c.descSnippet}>
                    desc: {c.descSnippet}
                  </div>
                </div>
              ))
            )}
          </div>
          {breakdown.meta.missingData.length > 0 && (
            <div>
              <div className="font-bold text-amber-600 dark:text-amber-400 mb-1">
                Missing ({breakdown.meta.missingData.length})
              </div>
              {breakdown.meta.missingData.map((m, i) => (
                <div key={i} className="text-amber-600 dark:text-amber-400">
                  · {m}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SpecScorePanel: React.FC<Props> = ({ characterNames, characterProfiles }) => {
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState<Map<string, ScoreState>>(new Map());
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchOne = useCallback(
    async (name: string): Promise<void> => {
      const profile = characterProfiles.get(name);
      if (!profile) {
        setScores((prev) => new Map(prev).set(name, 'error'));
        return;
      }
      setScores((prev) => new Map(prev).set(name, 'loading'));
      try {
        // 4개 API 병렬 호출 (arkpassive/cards 실패 시 undefined 허용)
        const [engravings, gems, arkPassive, cards] = await Promise.all([
          fetchEngravings(name),
          fetchGems(name),
          fetchArkPassive(name).catch((err) => {
            console.warn('ArkPassive API 실패:', name, err);
            return undefined;
          }),
          fetchCards(name).catch((err) => {
            console.warn('Cards API 실패:', name, err);
            return undefined;
          }),
        ]);
        const result = calcSpecScore(profile, engravings, gems, arkPassive, cards);
        setScores((prev) => new Map(prev).set(name, result));
      } catch (err: unknown) {
        console.error('점수 계산 실패:', name, err);
        setScores((prev) => new Map(prev).set(name, 'error'));
      }
    },
    [characterProfiles],
  );

  const fetchAll = useCallback((): void => {
    for (const name of characterNames) {
      const current = scores.get(name);
      if (!current || current === 'error') {
        void fetchOne(name);
      }
    }
  }, [characterNames, scores, fetchOne]);

  const handleToggle = (): void => {
    const next = !open;
    setOpen(next);
    if (next) fetchAll();
  };

  const refresh = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setScores(new Map());
    setExpanded(null);
    for (const name of characterNames) void fetchOne(name);
  };

  const renderScore = (name: string): React.ReactElement => {
    const s = scores.get(name);
    if (s === 'loading') {
      return <span className="text-xs text-gray-400 dark:text-gray-500">계산 중...</span>;
    }
    if (s === 'error') {
      return <span className="text-xs text-red-500 dark:text-red-400">실패</span>;
    }
    if (!s) {
      return <span className="text-xs text-gray-400 dark:text-gray-500">-</span>;
    }
    return <ScoreBadge score={s.score} />;
  };

  return (
    <div className="glass-card p-5 mb-6 animate-fade-in">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span>환산 점수 시뮬레이터</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
            TEST
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {open && scores.size > 0 && (
            <button
              type="button"
              onClick={refresh}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-0.5 rounded border border-gray-200 dark:border-white/10"
            >
              새로 계산
            </button>
          )}
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          {characterNames.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              선택된 캐릭터가 없습니다.
            </p>
          ) : (
            characterNames.map((name) => {
              const profile = characterProfiles.get(name);
              const result = scores.get(name);
              const isResult = typeof result === 'object' && result !== null;
              const isOpen = expanded === name;
              return (
                <div
                  key={name}
                  className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/5 p-3"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium truncate">{name}</span>
                      {profile && (
                        <>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {profile.CharacterClassName}
                          </span>
                          {isResult && <RoleBadge role={(result as SpecScoreResult).breakdown.role} />}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {renderScore(name)}
                      {isResult && (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : name)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline-offset-2 hover:underline"
                        >
                          {isOpen ? '접기' : '분해'}
                        </button>
                      )}
                    </div>
                  </div>
                  {isOpen && isResult && <SpecScoreBreakdown result={result as SpecScoreResult} />}
                </div>
              );
            })
          )}
          <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-600 text-center">
            점수는 자체 모델 기반 추정치입니다 (lopec/zloa 등과 수치가 다를 수 있음)
          </p>
        </div>
      )}
    </div>
  );
};

export default SpecScorePanel;
