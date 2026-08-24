import React from 'react';
import type { EquipmentItem, GemData } from '../../types/lostark';
import { gradeFrame, gradeStyles, EFFECT_GRADE_COLORS, qualityTextColor, qualityBgColor } from '../../utils/equipmentColors';
import { getCombatEquipmentItems, isCombatEquipment } from '../../utils/characterEquipment';
import GlassCard from '../GlassCard';
import { parseEquipmentInfo } from './equipmentTooltip';

const ACCESSORY_TYPES = ['목걸이', '귀걸이', '반지'];

const GemsCard: React.FC<{ data: GemData }> = ({ data }) => {
  if (!data.Gems || data.Gems.length === 0) return null;
  return (
    <GlassCard className="p-4 animate-fade-in">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <span className="h-3 w-0.5 rounded-full bg-la-gold/80" />
        <span>
          보석 <span className="normal-case font-normal text-gray-400">{data.Gems.length}개</span>
        </span>
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {data.Gems.map((gem) => {
          const frame = gradeStyles(gem.Grade, 'border');
          return (
            <div
              key={gem.Slot}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border-2 cursor-default ${frame.className}`}
              style={frame.style}
              title={gem.Name}
            >
              <img src={gem.Icon} alt={gem.Name} loading="lazy" className="w-9 h-9 rounded-lg" />
              <span className="text-[10px] font-bold">Lv.{gem.Level}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

const EquipmentItemCard: React.FC<{ item: EquipmentItem }> = ({ item }) => {
  const { quality, enchantLevel, transcendenceLevel, effects } = parseEquipmentInfo(item.Name, item.Tooltip);
  const frame = gradeFrame(item.Grade, 'border');
  // +N 강화레벨 뱃지로 별도 표시하므로 아이템명에서 prefix 제거
  const displayName = enchantLevel != null ? item.Name.replace(/^\+\d+\s/, '') : item.Name;
  return (
    <div
      className={`flex items-start gap-2.5 p-2.5 rounded-xl border bg-white/[0.02] hover:bg-white/5 transition-colors ${frame.className}`}
      style={frame.style}
    >
      {/* 아이콘 + 강화레벨 뱃지 + 품질 숫자 */}
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <div className="relative">
          {item.Icon && (
            <img
              src={item.Icon}
              alt={item.Name}
              loading="lazy"
              className={`w-11 h-11 rounded-lg border-2 ${frame.className}`}
              style={frame.style}
            />
          )}
          {enchantLevel != null && (
            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold text-white bg-gray-900 border border-gray-600 rounded px-0.5 leading-tight">
              +{enchantLevel}
            </span>
          )}
        </div>
        {quality != null && (
          <span className={`text-[9px] font-bold tabular-nums leading-none ${qualityTextColor(quality)}`}>{quality}</span>
        )}
      </div>
      {/* 텍스트 정보 */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{item.Type}</p>
        <div className="flex items-baseline gap-1 flex-wrap">
          <p className="text-xs font-medium text-gray-900 dark:text-white leading-snug">{displayName}</p>
          {transcendenceLevel != null && (
            <span className="text-[10px] font-bold text-orange-400 flex-shrink-0">+{transcendenceLevel}</span>
          )}
        </div>
        {quality != null && (
          <div className="mt-1 h-1 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${qualityBgColor(quality)}`} style={{ width: `${quality}%` }} />
          </div>
        )}
        {effects.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {effects.map((eff, i) => {
              const gc = eff.grade ? EFFECT_GRADE_COLORS[eff.grade] : null;
              return (
                <div key={i} className="flex items-center gap-1 min-w-0">
                  {gc && (
                    <span className={`text-[9px] font-bold px-1 py-px rounded-sm flex-shrink-0 ${gc.bg} ${gc.text}`}>
                      {eff.grade}
                    </span>
                  )}
                  {eff.segments ? (
                    <span className="text-[10px] leading-snug">
                      {eff.segments.map((seg, j) => (
                        <span
                          key={j}
                          style={seg.color ? { color: seg.color } : undefined}
                          className={!seg.color ? 'text-gray-500 dark:text-gray-400' : ''}
                        >
                          {seg.text}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate">{eff.text}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
    <span className="h-2.5 w-0.5 rounded-full bg-la-gold/60" />
    <span>{label}</span>
  </p>
);

const EquipmentCard: React.FC<{ items: EquipmentItem[] }> = ({ items }) => {
  if (items.length === 0) return null;

  const armor       = getCombatEquipmentItems(items);
  const accessories = items.filter((it) => ACCESSORY_TYPES.some((t) => it.Type.includes(t)));
  const stone       = items.filter((it) => it.Type === '어빌리티 스톤');
  const bracelet    = items.filter((it) => it.Type === '팔찌');
  const extras      = items.filter(
    (it) =>
      !isCombatEquipment(it) &&
      !ACCESSORY_TYPES.some((t) => it.Type.includes(t)) &&
      it.Type !== '어빌리티 스톤' &&
      it.Type !== '팔찌'
  );

  return (
    <GlassCard className="p-4 animate-fade-in">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <span className="h-3 w-0.5 rounded-full bg-la-gold/80" />
        <span>장비</span>
      </h2>

      {/* ① 전투 장비 + 장신구 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <SectionLabel label="전투 장비" />
          {armor.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
        </div>
        <div className="space-y-2">
          <SectionLabel label="장신구" />
          {accessories.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
        </div>
      </div>

      {/* ② 어빌리티 스톤 + 팔찌 */}
      {(stone.length > 0 || bracelet.length > 0) && (
        <>
          <div className="border-t border-gray-200/30 dark:border-white/5 my-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stone.length > 0 && (
              <div className="space-y-2">
                <SectionLabel label="어빌리티 스톤" />
                {stone.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
              </div>
            )}
            {bracelet.length > 0 && (
              <div className="space-y-2">
                <SectionLabel label="팔찌" />
                {bracelet.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
              </div>
            )}
          </div>
        </>
      )}

      {/* ③ 기타 (나침반, 부적, 보주 등) */}
      {extras.length > 0 && (
        <>
          <div className="border-t border-gray-200/30 dark:border-white/5 my-3" />
          <SectionLabel label="기타" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {extras.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
          </div>
        </>
      )}

    </GlassCard>
  );
};

export { GemsCard, EquipmentCard };
