import React, { useState } from 'react';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import GlassCard from '../components/GlassCard';
import type {
  CharacterProfile,
  EquipmentItem,
  GemData,
  GemItem,
  GemSkillEffect,
  EngravingData,
  ArkPassiveEffect,
  ArkGridData,
} from '../types/lostark';
import {
  fetchProfile,
  fetchEquipment,
  fetchGems,
  fetchEngravings,
  fetchArkGrid,
} from '../utils/api';
import { type EffectSegment, stripHtml, parseBraceletLine } from '../utils/tooltipParser';
import { gradeStyle, qualityTextColor, qualityBgColor } from '../utils/equipmentColors';

/* ================================================================
   Types
   ================================================================ */

interface CompareData {
  profile: CharacterProfile;
  equipment: EquipmentItem[];
  gems: GemData | null;
  engravings: EngravingData | null;
  arkGrid: ArkGridData | null;
}

/* ================================================================
   Utilities
   ================================================================ */

function parseQuality(tooltip: string): number {
  try {
    const obj = JSON.parse(tooltip);
    return obj?.Element_001?.value?.qualityValue ?? -1;
  } catch {
    return -1;
  }
}

function parseItemLevel(str: string): number {
  return parseFloat(str.replace(/,/g, '')) || 0;
}

function shortCoreName(fullName: string): string {
  const m = fullName.match(/^(.+?)\s*코어/);
  return m ? m[1].trim() : fullName;
}

interface DetailLine { text: string; segments?: EffectSegment[] }

/** 장비 슬롯 순서 */
const ARMOR_SLOTS = ['무기', '투구', '상의', '하의', '장갑', '어깨'];
const ACCESSORY_SLOTS = ['목걸이', '귀걸이', '귀걸이', '반지', '반지'];
const EXTRA_SLOTS = ['어빌리티 스톤', '팔찌'];

/** 악세/스톤/팔찌 상세 정보 파싱 */
const DETAIL_TYPES = new Set(['목걸이', '귀걸이', '반지', '어빌리티 스톤', '팔찌']);

function parseEquipDetails(tooltip: string, type: string): DetailLine[] {
  try {
    const obj = JSON.parse(tooltip);
    const lines: DetailLine[] = [];

    for (const key of Object.keys(obj)) {
      const el = obj[key];
      if (!el) continue;

      if (el.type === 'ItemPartBox') {
        const label = stripHtml(el.value?.Element_000 || '');
        const contentHtml: string = el.value?.Element_001 || '';
        if (label.includes('기본 효과') || label.includes('세공 단계')) continue;
        if (!label || !contentHtml) continue;

        // 팔찌·악세사리 연마효과: 줄별로 분리해서 인라인 색상 세그먼트로 파싱
        const hasColoredLines =
          label.includes('팔찌 효과') ||
          label.includes('연마 효과') ||
          label.includes('추가 효과');
        if (hasColoredLines) {
          for (const rawLine of contentHtml.split(/<br\s*\/?>/gi)) {
            const text = stripHtml(rawLine).trim();
            if (text) lines.push({ text, segments: parseBraceletLine(rawLine) });
          }
        } else {
          lines.push({ text: stripHtml(contentHtml) });
        }
      }

      // 어빌리티 스톤 — 세공 각인 (IndentStringGroup)
      if (el.type === 'IndentStringGroup' && type === '어빌리티 스톤') {
        const group = el.value?.Element_000?.contentStr;
        if (group && typeof group === 'object') {
          for (const gKey of Object.keys(group)) {
            const item = (group as Record<string, { contentStr?: string }>)[gKey];
            if (item?.contentStr) {
              const raw = item.contentStr;
              lines.push({ text: stripHtml(raw), segments: parseBraceletLine(raw) });
            }
          }
        }
      }
    }

    return lines;
  } catch {
    return [];
  }
}

function findEquipBySlots(items: EquipmentItem[], slots: string[]): (EquipmentItem | null)[] {
  const remaining = [...items];
  return slots.map((slot) => {
    const idx = remaining.findIndex((i) => i.Type === slot);
    if (idx === -1) return null;
    return remaining.splice(idx, 1)[0];
  });
}

/* ================================================================
   Sub-Components
   ================================================================ */

/** 등급 뱃지 */
const GradeTag: React.FC<{ grade: string; small?: boolean }> = ({ grade, small }) => {
  const s = gradeStyle(grade);
  return (
    <span
      className={`inline-block rounded font-bold ${s.bg} ${s.text} ${
        small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
    >
      {grade}
    </span>
  );
};

/** 품질 게이지 바 */
const QualityBar: React.FC<{ quality: number; compact?: boolean }> = ({ quality, compact }) => {
  if (quality < 0) return null;
  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'mt-1'}`}>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${qualityBgColor(quality)}`}
          style={{ width: `${quality}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${qualityTextColor(quality)}`}>
        {quality}
      </span>
    </div>
  );
};

/** 좌우 대칭 스탯 바 */
const StatBar: React.FC<{ label: string; leftVal: number; rightVal: number }> = ({
  label,
  leftVal,
  rightVal,
}) => {
  const max = Math.max(leftVal, rightVal, 1);
  const leftPct = (leftVal / max) * 100;
  const rightPct = (rightVal / max) * 100;
  const leftWin = leftVal > rightVal;
  const rightWin = rightVal > leftVal;

  return (
    <div className="flex items-center gap-2 py-1">
      {/* Left value */}
      <span
        className={`w-14 text-right text-xs font-bold tabular-nums ${
          leftWin ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {leftVal.toLocaleString()}
      </span>

      {/* Left bar (grows right-to-left) */}
      <div className="flex-1 h-2 bg-gray-200/50 dark:bg-white/5 rounded-full overflow-hidden flex justify-end">
        <div
          className={`h-full rounded-full transition-all ${
            leftWin ? 'bg-la-gold/70' : 'bg-gray-400/40 dark:bg-gray-500/40'
          }`}
          style={{ width: `${leftPct}%` }}
        />
      </div>

      {/* Label */}
      <span className="w-12 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
        {label}
      </span>

      {/* Right bar (grows left-to-right) */}
      <div className="flex-1 h-2 bg-gray-200/50 dark:bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            rightWin ? 'bg-la-gold/70' : 'bg-gray-400/40 dark:bg-gray-500/40'
          }`}
          style={{ width: `${rightPct}%` }}
        />
      </div>

      {/* Right value */}
      <span
        className={`w-14 text-left text-xs font-bold tabular-nums ${
          rightWin ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {rightVal.toLocaleString()}
      </span>
    </div>
  );
};

/** 장비 1줄 비교 */
const EquipmentRow: React.FC<{
  slotName: string;
  left: EquipmentItem | null;
  right: EquipmentItem | null;
}> = ({ slotName, left, right }) => {
  const lq = left ? parseQuality(left.Tooltip) : -1;
  const rq = right ? parseQuality(right.Tooltip) : -1;
  const showDetail = DETAIL_TYPES.has(left?.Type || '') || DETAIL_TYPES.has(right?.Type || '');

  const renderItem = (item: EquipmentItem | null, q: number) => {
    if (!item) {
      return <div className="text-xs text-gray-400 dark:text-gray-500 italic">미장착</div>;
    }
    const s = gradeStyle(item.Grade);
    const details = showDetail ? parseEquipDetails(item.Tooltip, item.Type) : [];
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <img
            src={item.Icon}
            alt=""
            className={`w-8 h-8 rounded border ${s.border} flex-shrink-0`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
              {item.Name}
            </p>
            <GradeTag grade={item.Grade} small />
          </div>
        </div>
        <QualityBar quality={q} />
        {details.length > 0 && (
          <div className="mt-1.5 space-y-0.5 pl-1 border-l-2 border-gray-200/50 dark:border-white/10">
            {details.map((line, i) =>
              line.segments ? (
                <p key={i} className="text-[10px] leading-snug whitespace-pre-line">
                  {line.segments.map((seg, j) => (
                    <span
                      key={j}
                      style={seg.color ? { color: seg.color } : undefined}
                      className={!seg.color ? 'text-gray-500 dark:text-gray-400' : ''}
                    >
                      {seg.text}
                    </span>
                  ))}
                </p>
              ) : (
                <p key={i} className="text-[10px] leading-snug text-gray-500 dark:text-gray-400 whitespace-pre-line">
                  {line.text}
                </p>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
      <div>{renderItem(left, lq)}</div>
      <div className="w-14 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 pt-2 flex-shrink-0">
        {slotName}
      </div>
      <div>{renderItem(right, rq)}</div>
    </div>
  );
};

/** 보석 1개 */
const GemBadge: React.FC<{ gem: GemItem; skill?: GemSkillEffect }> = ({ gem, skill }) => {
  const s = gradeStyle(gem.Grade);
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2">
        <img src={gem.Icon} alt="" className={`w-7 h-7 rounded border ${s.border} flex-shrink-0`} />
        <div className="min-w-0 flex-1">
          {skill ? (
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{skill.Name}</p>
          ) : (
            <p className="text-xs text-gray-800 dark:text-gray-200 truncate">{stripHtml(gem.Name)}</p>
          )}
        </div>
        <span className={`text-xs font-bold ${s.text}`}>Lv.{gem.Level}</span>
      </div>
      {skill && (
        <div className="ml-9 mt-0.5 space-y-0">
          {skill.Description.map((desc, i) => (
            <p key={i} className="text-[10px] text-gray-500 dark:text-gray-400">{stripHtml(desc)}</p>
          ))}
        </div>
      )}
    </div>
  );
};


/** 섹션 헤더 (접기/펼치기) */
const SectionHeader: React.FC<{
  icon: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
}> = ({ icon, title, expanded, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between gap-2 text-base font-bold text-gray-900 dark:text-white mb-0 cursor-pointer select-none group"
  >
    <span className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      {title}
    </span>
    <svg
      className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-300 group-hover:text-gray-600 dark:group-hover:text-gray-300 ${
        expanded ? 'rotate-180' : ''
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
);

/** 캐릭터 입력 필드 */
const CharacterInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div className="flex-1 min-w-0">
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || '캐릭터 닉네임'}
      className="w-full input-glass text-sm"
    />
  </div>
);

/* ================================================================
   Comparison Sections
   ================================================================ */

const ProfileSection: React.FC<{ left: CharacterProfile; right: CharacterProfile }> = ({
  left,
  right,
}) => {
  const [expanded, setExpanded] = useState(true);
  const lLv = parseItemLevel(left.ItemAvgLevel);
  const rLv = parseItemLevel(right.ItemAvgLevel);
  const lWin = lLv > rLv;
  const rWin = rLv > lLv;

  // Find common stat types
  const statTypes = ['치명', '특화', '신속'];
  const getStatVal = (profile: CharacterProfile, type: string): number => {
    const stat = profile.Stats.find((s) => s.Type === type);
    return stat ? parseInt(stat.Value, 10) || 0 : 0;
  };

  return (
    <GlassCard className="p-5 animate-fade-in">
      <SectionHeader icon="👤" title="기본 정보" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
      {/* Character images + basic info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[left, right].map((p, i) => {
          const isWin = i === 0 ? lWin : rWin;
          return (
            <div key={i} className="text-center">
              {p.CharacterImage ? (
                <img
                  src={p.CharacterImage}
                  alt={p.CharacterName}
                  className="w-full max-w-[160px] mx-auto rounded-xl mb-3 bg-gray-100 dark:bg-white/5"
                />
              ) : (
                <div className="w-full max-w-[160px] mx-auto aspect-[3/4] rounded-xl mb-3 bg-gray-100 dark:bg-white/5 flex items-center justify-center text-3xl text-gray-300">
                  ?
                </div>
              )}
              <p className="text-sm font-bold text-gray-900 dark:text-white">{p.CharacterName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {p.ServerName} · {p.CharacterClassName}
              </p>
              {p.GuildName && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{p.GuildName}</p>
              )}
              <p
                className={`text-lg font-bold mt-1 tabular-nums ${
                  isWin
                    ? 'text-la-gold-dark dark:text-la-gold'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Lv. {p.ItemAvgLevel}
              </p>
            </div>
          );
        })}
      </div>

      {/* Combat power comparison */}
      {(() => {
        const lCp = parseItemLevel(left.CombatPower || '0');
        const rCp = parseItemLevel(right.CombatPower || '0');
        const lWinCp = lCp > rCp;
        const rWinCp = rCp > lCp;
        return (
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-4 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              전투력
            </p>
            <div className="flex items-center justify-center gap-4">
              <span
                className={`text-lg font-bold tabular-nums ${
                  lWinCp ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {left.CombatPower || '-'}
              </span>
              <span className="text-xs text-gray-300 dark:text-gray-600 font-bold">vs</span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  rWinCp ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {right.CombatPower || '-'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Stat comparison bars */}
      <div className="space-y-0.5">
        {statTypes.map((type) => (
          <StatBar
            key={type}
            label={type}
            leftVal={getStatVal(left, type)}
            rightVal={getStatVal(right, type)}
          />
        ))}
      </div>
      </div>
    </GlassCard>
  );
};

const EquipmentSection: React.FC<{
  leftEquip: EquipmentItem[];
  rightEquip: EquipmentItem[];
}> = ({ leftEquip, rightEquip }) => {
  const leftArmor = findEquipBySlots(leftEquip, ARMOR_SLOTS);
  const rightArmor = findEquipBySlots(rightEquip, ARMOR_SLOTS);
  const leftAccessory = findEquipBySlots(leftEquip, ACCESSORY_SLOTS);
  const rightAccessory = findEquipBySlots(rightEquip, ACCESSORY_SLOTS);
  const leftExtra = findEquipBySlots(leftEquip, EXTRA_SLOTS);
  const rightExtra = findEquipBySlots(rightEquip, EXTRA_SLOTS);

  // Calculate average quality
  const avgQuality = (items: (EquipmentItem | null)[]) => {
    const quals = items.map((i) => (i ? parseQuality(i.Tooltip) : -1)).filter((q) => q >= 0);
    if (quals.length === 0) return -1;
    return Math.round(quals.reduce((a, b) => a + b, 0) / quals.length);
  };

  const lArmorAvg = avgQuality(leftArmor);
  const rArmorAvg = avgQuality(rightArmor);
  const lAccAvg = avgQuality(leftAccessory);
  const rAccAvg = avgQuality(rightAccessory);

  const [expanded, setExpanded] = useState(true);

  return (
    <GlassCard className="p-5 animate-fade-in">
      <SectionHeader icon="⚔️" title="장비" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
      {/* Armor section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            방어구
          </h4>
          <div className="flex gap-3 text-[10px]">
            <span className="text-gray-400">
              평균 품질:{' '}
              <span className={`font-bold ${qualityTextColor(lArmorAvg)}`}>
                {lArmorAvg >= 0 ? lArmorAvg : '-'}
              </span>
            </span>
            <span className="text-gray-400">vs</span>
            <span className="text-gray-400">
              <span className={`font-bold ${qualityTextColor(rArmorAvg)}`}>
                {rArmorAvg >= 0 ? rArmorAvg : '-'}
              </span>
            </span>
          </div>
        </div>
        {ARMOR_SLOTS.map((slot, i) => (
          <EquipmentRow
            key={`armor-${i}`}
            slotName={slot}
            left={leftArmor[i]}
            right={rightArmor[i]}
          />
        ))}
      </div>

      {/* Accessory section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            악세서리
          </h4>
          <div className="flex gap-3 text-[10px]">
            <span className="text-gray-400">
              평균 품질:{' '}
              <span className={`font-bold ${qualityTextColor(lAccAvg)}`}>
                {lAccAvg >= 0 ? lAccAvg : '-'}
              </span>
            </span>
            <span className="text-gray-400">vs</span>
            <span className="text-gray-400">
              <span className={`font-bold ${qualityTextColor(rAccAvg)}`}>
                {rAccAvg >= 0 ? rAccAvg : '-'}
              </span>
            </span>
          </div>
        </div>
        {ACCESSORY_SLOTS.map((slot, i) => (
          <EquipmentRow
            key={`acc-${i}`}
            slotName={i === 1 ? '귀걸이1' : i === 2 ? '귀걸이2' : i === 3 ? '반지1' : i === 4 ? '반지2' : slot}
            left={leftAccessory[i]}
            right={rightAccessory[i]}
          />
        ))}
      </div>

      {/* Extra (stone + bracelet) */}
      <div>
        {EXTRA_SLOTS.map((slot, i) => (
          <EquipmentRow
            key={`extra-${i}`}
            slotName={slot}
            left={leftExtra[i]}
            right={rightExtra[i]}
          />
        ))}
      </div>
      </div>
    </GlassCard>
  );
};

const GemSection: React.FC<{
  leftGems: GemData | null;
  rightGems: GemData | null;
}> = ({ leftGems, rightGems }) => {
  const sortGems = (gems: GemItem[] | null | undefined): GemItem[] => {
    if (!gems) return [];
    return [...gems].sort((a, b) => b.Level - a.Level);
  };

  // GemSlot → GemSkillEffect 매핑
  const buildSkillMap = (data: GemData | null): Map<number, GemSkillEffect> => {
    const map = new Map<number, GemSkillEffect>();
    if (data?.Effects?.Skills) {
      for (const s of data.Effects.Skills) {
        map.set(s.GemSlot, s);
      }
    }
    return map;
  };

  const leftSorted = sortGems(leftGems?.Gems);
  const rightSorted = sortGems(rightGems?.Gems);
  const leftSkillMap = buildSkillMap(leftGems);
  const rightSkillMap = buildSkillMap(rightGems);

  const sumLevel = (gems: GemItem[]) => gems.reduce((s, g) => s + g.Level, 0);
  const lSum = sumLevel(leftSorted);
  const rSum = sumLevel(rightSorted);

  const [expanded, setExpanded] = useState(true);

  return (
    <GlassCard className="p-5 animate-fade-in">
      <SectionHeader icon="💎" title="보석" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
      {/* Level sum comparison */}
      <div className="flex items-center justify-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">레벨 합</p>
          <p
            className={`text-lg font-bold tabular-nums ${
              lSum > rSum
                ? 'text-la-gold-dark dark:text-la-gold'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {lSum}
          </p>
        </div>
        <span className="text-gray-300 dark:text-gray-600 font-bold">vs</span>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">레벨 합</p>
          <p
            className={`text-lg font-bold tabular-nums ${
              rSum > lSum
                ? 'text-la-gold-dark dark:text-la-gold'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {rSum}
          </p>
        </div>
      </div>

      {/* Gem lists side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-0">
          {leftSorted.length > 0 ? (
            leftSorted.map((g, i) => (
              <GemBadge key={i} gem={g} skill={leftSkillMap.get(g.Slot)} />
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">보석 없음</p>
          )}
        </div>
        <div className="space-y-0">
          {rightSorted.length > 0 ? (
            rightSorted.map((g, i) => (
              <GemBadge key={i} gem={g} skill={rightSkillMap.get(g.Slot)} />
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">보석 없음</p>
          )}
        </div>
      </div>
      </div>
    </GlassCard>
  );
};

/** 각인 레벨 표시 (1~4) */
const LevelDots: React.FC<{ level: number }> = ({ level }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className={`w-1.5 h-1.5 rounded-full ${
          i <= level
            ? level >= 4
              ? 'bg-la-gold'
              : level >= 3
                ? 'bg-purple-500'
                : 'bg-blue-500'
            : 'bg-gray-200 dark:bg-white/10'
        }`}
      />
    ))}
  </div>
);

/** 각인 1개 카드 */
const EngravingCard: React.FC<{ effect: ArkPassiveEffect }> = ({ effect }) => {
  const s = gradeStyle(effect.Grade);
  return (
    <div className="py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <GradeTag grade={effect.Grade} small />
        <span className="text-xs font-bold text-gray-900 dark:text-white flex-1 min-w-0 truncate">
          {effect.Name}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LevelDots level={effect.Level} />
          <span className={`text-[10px] font-bold ${s.text}`}>Lv.{effect.Level}</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
        {stripHtml(effect.Description)}
      </p>
    </div>
  );
};

const EngravingSection: React.FC<{
  leftEng: EngravingData | null;
  rightEng: EngravingData | null;
}> = ({ leftEng, rightEng }) => {
  const leftEffects = leftEng?.ArkPassiveEffects ?? [];
  const rightEffects = rightEng?.ArkPassiveEffects ?? [];
  const [expanded, setExpanded] = useState(true);

  return (
    <GlassCard className="p-5 animate-fade-in">
      <SectionHeader icon="📜" title="각인" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
      {leftEffects.length === 0 && rightEffects.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">각인 정보가 없습니다</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            {leftEffects.length > 0 ? (
              leftEffects.map((e, i) => <EngravingCard key={i} effect={e} />)
            ) : (
              <p className="text-xs text-gray-400 italic py-2">정보 없음</p>
            )}
          </div>
          <div>
            {rightEffects.length > 0 ? (
              rightEffects.map((e, i) => <EngravingCard key={i} effect={e} />)
            ) : (
              <p className="text-xs text-gray-400 italic py-2">정보 없음</p>
            )}
          </div>
        </div>
      )}
      </div>
    </GlassCard>
  );
};

/** 아크 그리드 비교 */
const ArkGridSection: React.FC<{
  leftArkGrid: ArkGridData | null;
  rightArkGrid: ArkGridData | null;
}> = ({ leftArkGrid, rightArkGrid }) => {
  const leftSlots = leftArkGrid?.Slots ?? [];
  const rightSlots = rightArkGrid?.Slots ?? [];
  const [expanded, setExpanded] = useState(true);

  const totalPoint = (slots: typeof leftSlots) =>
    slots.reduce((sum, s) => sum + s.Point, 0);
  const lPoint = totalPoint(leftSlots);
  const rPoint = totalPoint(rightSlots);

  const renderSlots = (slots: typeof leftSlots) => {
    if (slots.length === 0) {
      return <p className="text-xs text-gray-400 dark:text-gray-500 italic py-4 text-center">아크 그리드 없음</p>;
    }
    return (
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const style = gradeStyle(slot.Grade);
          const name = shortCoreName(slot.Name);
          return (
            <div key={slot.Index} className="flex flex-col items-center gap-0.5 text-center">
              <div className={`w-10 h-10 rounded-lg border-2 ${style.border} overflow-hidden flex-shrink-0`}>
                {slot.Icon ? (
                  <img src={slot.Icon} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${style.bg}`} />
                )}
              </div>
              <p className="text-[9px] text-gray-600 dark:text-gray-400 leading-tight line-clamp-2 w-full">{name}</p>
              <span className="text-[9px] font-bold text-la-gold-dark dark:text-la-gold">{slot.Point}P</span>
            </div>
          );
        })}
      </div>
    );
  };

  /** 옵션 총합: 항목별로 한 줄씩 위→아래, 좌 vs 우 비교 */
  const leftEffects = leftArkGrid?.Effects ?? [];
  const rightEffects = rightArkGrid?.Effects ?? [];
  const effectNameToLevel = (list: { Name: string; Level: number }[]) => {
    const m = new Map<string, number>();
    list.forEach((e) => m.set(e.Name, e.Level));
    return m;
  };
  const leftMap = effectNameToLevel(leftEffects);
  const rightMap = effectNameToLevel(rightEffects);
  const allOptionNames = Array.from(new Set([...Array.from(leftMap.keys()), ...Array.from(rightMap.keys())])).sort();

  return (
    <GlassCard className="p-5 animate-fade-in">
      <SectionHeader icon="◇" title="아크 그리드" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
        <div className="flex items-center justify-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">포인트 합</p>
            <p
              className={`text-lg font-bold tabular-nums ${
                lPoint > rPoint ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {lPoint}P
            </p>
          </div>
          <span className="text-gray-300 dark:text-gray-600 font-bold">vs</span>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">포인트 합</p>
            <p
              className={`text-lg font-bold tabular-nums ${
                rPoint > lPoint ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {rPoint}P
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">{renderSlots(leftSlots)}</div>
          <div className="min-w-0">{renderSlots(rightSlots)}</div>
        </div>

        {/* 옵션 총합: 위→아래 한 줄씩 비교, 가운데 정렬 */}
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/10">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 text-center">옵션 총합</p>
          {allOptionNames.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center">옵션 없음</p>
          ) : (
            <div className="space-y-1.5 flex flex-col items-center">
              {allOptionNames.map((name) => {
                const lv = leftMap.get(name) ?? null;
                const rv = rightMap.get(name) ?? null;
                const lNum = lv !== null ? lv : null;
                const rNum = rv !== null ? rv : null;
                const lWin = lNum !== null && rNum !== null && lNum > rNum;
                const rWin = lNum !== null && rNum !== null && rNum > lNum;
                return (
                  <div
                    key={name}
                    className="flex items-center justify-center gap-3 py-1.5 px-2 rounded-lg bg-gray-50/50 dark:bg-white/5 text-sm w-full max-w-xs"
                  >
                    <span className="w-24 flex-shrink-0 text-center text-gray-700 dark:text-gray-300 truncate" title={name}>
                      {name}
                    </span>
                    <span
                      className={`w-10 text-center font-bold tabular-nums ${
                        lWin ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {lNum !== null ? lNum : '-'}
                    </span>
                    <span className="flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs">vs</span>
                    <span
                      className={`w-10 text-center font-bold tabular-nums ${
                        rWin ? 'text-la-gold-dark dark:text-la-gold' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {rNum !== null ? rNum : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

/** Skeleton for loading state */
const CompareSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    <GlassCard className="p-5">
      <div className="skeleton h-6 w-32 mb-4" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-4 w-24 mx-auto" />
          <div className="skeleton h-6 w-20 mx-auto" />
        </div>
        <div className="space-y-3">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-4 w-24 mx-auto" />
          <div className="skeleton h-6 w-20 mx-auto" />
        </div>
      </div>
    </GlassCard>
    {Array.from({ length: 3 }).map((_, i) => (
      <GlassCard key={i} className="p-5">
        <div className="skeleton h-6 w-24 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      </GlassCard>
    ))}
  </div>
);

/* ================================================================
   Main Page
   ================================================================ */

const Compare: React.FC = () => {
  const [leftName, setLeftName] = useState('');
  const [rightName, setRightName] = useState('');
  const [leftData, setLeftData] = useState<CompareData | null>(null);
  const [rightData, setRightData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacterData = async (name: string): Promise<CompareData> => {
    const [profile, equipment, gems, engravings, arkGrid] = await Promise.all([
      fetchProfile(name),
      fetchEquipment(name),
      fetchGems(name).catch(() => null),
      fetchEngravings(name).catch(() => null),
      fetchArkGrid(name).catch(() => null),
    ]);
    return { profile, equipment, gems, engravings, arkGrid };
  };

  const handleCompare = async () => {
    const lName = leftName.trim();
    const rName = rightName.trim();
    if (!lName || !rName) {
      setError('두 캐릭터의 닉네임을 모두 입력해주세요.');
      return;
    }
    if (lName === rName) {
      setError('서로 다른 캐릭터를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setLeftData(null);
    setRightData(null);

    try {
      const [lResult, rResult] = await Promise.allSettled([
        fetchCharacterData(lName),
        fetchCharacterData(rName),
      ]);

      if (lResult.status === 'rejected' && rResult.status === 'rejected') {
        setError('두 캐릭터 모두 조회에 실패했습니다. 닉네임을 확인해주세요.');
      } else {
        if (lResult.status === 'fulfilled') setLeftData(lResult.value);
        if (rResult.status === 'fulfilled') setRightData(rResult.value);
        if (lResult.status === 'rejected') setError(`"${lName}" 조회 실패`);
        if (rResult.status === 'rejected') setError(`"${rName}" 조회 실패`);
      }
    } catch {
      setError('조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleCompare();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
      <NavBar />
      <PullToRefresh>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Input Section */}
        <GlassCard className="p-6 mb-8 animate-fade-in">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
            캐릭터 비교
          </h2>

          <div className="flex items-start gap-4" onKeyDown={handleKeyDown}>
            <CharacterInput
              label="캐릭터 A"
              value={leftName}
              onChange={setLeftName}
              placeholder="캐릭터 닉네임"
            />

            <div className="flex-shrink-0 pt-7">
              <div className="w-10 h-10 rounded-full bg-la-gold/10 flex items-center justify-center">
                <span className="text-la-gold-dark dark:text-la-gold font-bold text-sm">VS</span>
              </div>
            </div>

            <CharacterInput
              label="캐릭터 B"
              value={rightName}
              onChange={setRightName}
              placeholder="비교할 캐릭터"
            />
          </div>

          <button
            onClick={handleCompare}
            disabled={loading || !leftName.trim() || !rightName.trim()}
            className="w-full mt-4 btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '조회 중...' : '비교하기'}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
          )}
        </GlassCard>

        {/* Loading */}
        {loading && <CompareSkeleton />}

        {/* Results */}
        {!loading && leftData && rightData && (
          <div className="space-y-6">
            <ProfileSection left={leftData.profile} right={rightData.profile} />
            <EquipmentSection leftEquip={leftData.equipment} rightEquip={rightData.equipment} />
            <GemSection leftGems={leftData.gems} rightGems={rightData.gems} />
            <ArkGridSection leftArkGrid={leftData.arkGrid} rightArkGrid={rightData.arkGrid} />
            <EngravingSection leftEng={leftData.engravings} rightEng={rightData.engravings} />
          </div>
        )}

        {/* Partial results (one side failed) */}
        {!loading && ((leftData && !rightData) || (!leftData && rightData)) && (
          <div className="space-y-6">
            <GlassCard className="p-5 animate-fade-in">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                한쪽 캐릭터만 조회되었습니다. 비교하려면 양쪽 모두 유효한 닉네임이 필요합니다.
              </p>
            </GlassCard>
          </div>
        )}
      </main>
      </PullToRefresh>
    </div>
  );
};

export default Compare;
