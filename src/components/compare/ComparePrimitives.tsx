import React from 'react';
import type { EquipmentItem, GemItem, GemSkillEffect } from '../../types/lostark';
import { stripHtml } from '../../utils/tooltipParser';
import { gradeFrame, gradeText, gradeStyles, qualityTextColor, qualityBgColor } from '../../utils/equipmentColors';
import { DETAIL_TYPES, parseEquipDetails, parseQuality } from './compareModel';

const GradeTag: React.FC<{ grade: string; small?: boolean }> = ({ grade, small }) => {
  const tag = gradeStyles(grade, 'subtle');
  return (
    <span
      className={`inline-block rounded font-bold border ${tag.className} ${
        small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      style={tag.style}
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
    const frame = gradeFrame(item.Grade, 'border');
    const details = showDetail ? parseEquipDetails(item.Tooltip, item.Type) : [];
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <img
            src={item.Icon}
            alt=""
            loading="lazy"
            className={`w-8 h-8 rounded border flex-shrink-0 ${frame.className}`}
            style={frame.style}
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
  const frame = gradeFrame(gem.Grade, 'border');
  const t = gradeText(gem.Grade);
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2">
        <img
          src={gem.Icon}
          alt=""
          loading="lazy"
          className={`w-7 h-7 rounded border flex-shrink-0 ${frame.className}`}
          style={frame.style}
        />
        <div className="min-w-0 flex-1">
          {skill ? (
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{skill.Name}</p>
          ) : (
            <p className="text-xs text-gray-800 dark:text-gray-200 truncate">{stripHtml(gem.Name)}</p>
          )}
        </div>
        <span className={`text-xs font-bold ${t.className}`} style={t.style}>Lv.{gem.Level}</span>
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
  <h2>
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
  </h2>
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

export { CharacterInput, EquipmentRow, GemBadge, GradeTag, QualityBar, SectionHeader, StatBar };
