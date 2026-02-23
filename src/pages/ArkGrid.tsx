import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SiblingCharacter, ArkGridData, ArkGridSlot, ArkGridGem, ArkGridEffect } from '../types/lostark';
import NavBar from '../components/NavBar';
import NicknameInput from '../components/NicknameInput';
import NicknameSearchBar from '../components/NicknameSearchBar';
import GlassCard from '../components/GlassCard';
import { fetchSiblings, fetchArkGrid, LS_NICKNAME } from '../utils/api';

/* ── 등급별 색상 맵 ── */
const GRADE_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  '영웅': { border: 'border-purple-500/60', bg: 'bg-purple-500/15', text: 'text-purple-400' },
  '전설': { border: 'border-orange-500/60', bg: 'bg-orange-500/15', text: 'text-orange-400' },
  '유물': { border: 'border-red-500/60', bg: 'bg-red-500/15', text: 'text-red-400' },
  '고대': { border: 'border-amber-400/60', bg: 'bg-amber-400/15', text: 'text-amber-400' },
};
const DEFAULT_GRADE = { border: 'border-gray-400/40', bg: 'bg-gray-400/15', text: 'text-gray-400' };
const gradeStyle = (grade: string) => GRADE_COLORS[grade] || DEFAULT_GRADE;

/* ── 코어 이름에서 짧은 이름 추출 ── */
function shortCoreName(fullName: string): string {
  // "질서의 해 코어 : 사신의 부름" → "질서의 해"
  const match = fullName.match(/^(.+?)\s*코어/);
  return match ? match[1].trim() : fullName;
}

function coreEffectName(fullName: string): string {
  // "질서의 해 코어 : 사신의 부름" → "사신의 부름"
  const match = fullName.match(/코어\s*:\s*(.+)/);
  return match ? match[1].trim() : '';
}

/* ── 툴팁 파싱 ── */
interface TooltipEntry { label: string; content: string }

function parseTooltip(raw: string): TooltipEntry[] {
  try {
    const obj = JSON.parse(raw);
    const entries: TooltipEntry[] = [];
    for (const key of Object.keys(obj)) {
      const el = obj[key];
      if (!el || el.type !== 'ItemPartBox') continue;
      const label = stripHtml(el.value?.Element_000 || '');
      const content = stripHtml(el.value?.Element_001 || '');
      if (label && content) entries.push({ label, content });
    }
    return entries;
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/* ── 서브 컴포넌트 ── */

const GradeTag: React.FC<{ grade: string }> = ({ grade }) => {
  const style = gradeStyle(grade);
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${style.bg} ${style.text}`}>
      {grade}
    </span>
  );
};

const GemSlot: React.FC<{ gem: ArkGridGem }> = ({ gem }) => {
  const style = gradeStyle(gem.Grade);
  return (
    <div
      className={`relative w-10 h-10 rounded-lg border-2 ${gem.IsActive ? style.border : 'border-gray-600/30'}
                  ${gem.IsActive ? '' : 'opacity-40'} overflow-hidden flex-shrink-0`}
      title={gem.IsActive ? '활성' : '비활성'}
    >
      {gem.Icon ? (
        <img src={gem.Icon} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full ${gem.IsActive ? style.bg : 'bg-gray-700/30'}`} />
      )}
      {!gem.IsActive && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
      )}
    </div>
  );
};

const CoreCard: React.FC<{ slot: ArkGridSlot }> = ({ slot }) => {
  const [expanded, setExpanded] = useState(false);
  const style = gradeStyle(slot.Grade);
  const shortName = shortCoreName(slot.Name);
  const effectName = coreEffectName(slot.Name);
  const entries = parseTooltip(slot.Tooltip);
  const hasDetails = entries.length > 0;

  return (
    <div
      className={`rounded-xl border-2 ${style.border} bg-white/5 dark:bg-white/[0.03]
                  ${hasDetails ? 'cursor-pointer' : ''} transition-all duration-200
                  ${hasDetails && !expanded ? 'hover:bg-white/10 dark:hover:bg-white/[0.06]' : ''}`}
      onClick={() => hasDetails && setExpanded((prev) => !prev)}
    >
      <div className="p-4">
        {/* Core header */}
        <div className="flex items-center gap-3 mb-3">
          {slot.Icon && (
            <img src={slot.Icon} alt="" className="w-10 h-10 rounded-lg flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{shortName}</p>
            {effectName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{effectName}</p>
            )}
          </div>
          {hasDetails && (
            <svg
              className={`w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-200
                          ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>

        {/* Grade + Willpower */}
        <div className="flex items-center gap-2 mb-3">
          <GradeTag grade={slot.Grade} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            의지력 <span className="font-bold text-gray-700 dark:text-gray-200">{slot.Point}</span>
          </span>
        </div>

        {/* Gems */}
        {slot.Gems && slot.Gems.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {slot.Gems.map((gem) => (
              <GemSlot key={gem.Index} gem={gem} />
            ))}
          </div>
        )}
      </div>

      {/* Expandable detail */}
      {expanded && (
        <div className="border-t border-gray-200/30 dark:border-white/5 px-4 py-3 space-y-2.5 animate-fade-in">
          {entries.map((entry, i) => (
            <div key={i}>
              <p className="text-[11px] font-bold text-la-gold-dark dark:text-la-gold mb-0.5">{entry.label}</p>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{entry.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EffectBadge: React.FC<{ effect: ArkGridEffect }> = ({ effect }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-la-gold/10 dark:bg-la-gold/10">
    <span className="text-sm font-medium text-gray-900 dark:text-white">{effect.Name}</span>
    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-la-gold/20 text-la-gold-dark dark:text-la-gold">
      Lv.{effect.Level}
    </span>
  </div>
);

interface CharacterGridCardProps {
  character: SiblingCharacter;
  gridData: ArkGridData | null | undefined; // undefined = loading
}

const CharacterGridCard: React.FC<CharacterGridCardProps> = ({ character, gridData }) => {
  const hasGrid = gridData?.Slots && gridData.Slots.length > 0;
  const isLoading = gridData === undefined;

  return (
    <GlassCard className={`p-5 md:p-6 animate-fade-in ${!hasGrid && !isLoading ? 'opacity-60' : ''}`}>
      {/* Character header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{character.CharacterName}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
              {character.CharacterClassName}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Lv.{character.CharacterLevel} · 아이템 {character.ItemAvgLevel}
          </p>
        </div>
        {!isLoading && !hasGrid && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">
            미설정
          </span>
        )}
      </div>

      {isLoading ? (
        /* Skeleton */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-36 rounded-xl" />
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-8 w-24 rounded-lg" />
            ))}
          </div>
        </div>
      ) : hasGrid ? (
        <div className="space-y-4">
          {/* Cores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gridData!.Slots!.map((slot) => (
              <CoreCard key={slot.Index} slot={slot} />
            ))}
          </div>

          {/* Effects */}
          {gridData!.Effects && gridData!.Effects.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">활성 효과</p>
              <div className="flex flex-wrap gap-2">
                {gridData!.Effects.map((effect, i) => (
                  <EffectBadge key={i} effect={effect} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500">아크그리드가 설정되지 않았습니다.</p>
      )}
    </GlassCard>
  );
};

/* ── Skeleton for initial load ── */
const PageSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    {Array.from({ length: 3 }).map((_, i) => (
      <GlassCard key={i} className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-6 w-40" />
            <div className="skeleton h-4 w-28" />
          </div>
        </div>
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="skeleton h-32 flex-1 rounded-xl" />
          ))}
        </div>
      </GlassCard>
    ))}
  </div>
);

/* ── 메인 페이지 ── */
const MIN_ITEM_LEVEL = 1700;

const ArkGrid: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlNickname = searchParams.get('nickname');
  const [nickname, setNickname] = useState<string | null>(
    () => urlNickname || localStorage.getItem(LS_NICKNAME)
  );
  const [siblings, setSiblings] = useState<SiblingCharacter[]>([]);
  const [arkGridMap, setArkGridMap] = useState<Map<string, ArkGridData | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    setSiblings([]);
    setArkGridMap(new Map());

    try {
      const siblingsData = await fetchSiblings(name);
      if (!siblingsData || siblingsData.length === 0) {
        setError('원정대 캐릭터를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      // Filter characters by item level
      const filtered = siblingsData
        .filter((c) => parseFloat(c.ItemAvgLevel.replace(',', '')) >= MIN_ITEM_LEVEL)
        .sort((a, b) => parseFloat(b.ItemAvgLevel.replace(',', '')) - parseFloat(a.ItemAvgLevel.replace(',', '')));

      if (filtered.length === 0) {
        setError(`아이템 레벨 ${MIN_ITEM_LEVEL} 이상의 캐릭터가 없습니다.`);
        setLoading(false);
        return;
      }

      setSiblings(filtered);
      setLoading(false);

      // Fetch ark grids in parallel
      const results = await Promise.allSettled(
        filtered.map(async (c) => {
          const grid = await fetchArkGrid(c.CharacterName);
          return { name: c.CharacterName, grid };
        })
      );

      setArkGridMap((prev) => {
        const next = new Map(prev);
        for (const result of results) {
          if (result.status === 'fulfilled') {
            next.set(result.value.name, result.value.grid);
          } else {
            // If individual fetch fails, set null
            next.set('', null);
          }
        }
        return next;
      });
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (nickname) {
      localStorage.setItem(LS_NICKNAME, nickname);
      loadData(nickname);
    }
  }, [nickname, loadData]);

  const handleSearch = (name: string) => {
    setSearchParams({ nickname: name });
    setSiblings([]);
    setArkGridMap(new Map());
    setError(null);
    setLoading(true);
    setNickname(name);
  };

  if (!nickname) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
        <NavBar />
        <NicknameInput
          title="아크그리드 대시보드"
          description="닉네임을 입력하면 원정대 전체의 아크그리드를 조회합니다"
          buttonText="조회하기"
          onSubmit={handleSearch}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search bar */}
        <div className="mb-6 text-center animate-fade-in">
          <NicknameSearchBar onSearch={handleSearch} placeholder="다른 원정대 검색" />
        </div>

        {/* Title */}
        <div className="mb-6 text-center animate-fade-in">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-la-gold to-la-gold-light bg-clip-text text-transparent">
            아크그리드 대시보드
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {nickname} 원정대 · 아이템 Lv.{MIN_ITEM_LEVEL}+
          </p>
        </div>

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <GlassCard className="p-8 text-center animate-fade-in">
            <p className="text-red-500 dark:text-red-400 text-lg">{error}</p>
          </GlassCard>
        ) : (
          <div className="space-y-5 animate-slide-up">
            {siblings.map((char) => (
              <CharacterGridCard
                key={char.CharacterName}
                character={char}
                gridData={arkGridMap.has(char.CharacterName) ? arkGridMap.get(char.CharacterName)! : undefined}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ArkGrid;
