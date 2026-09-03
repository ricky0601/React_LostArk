import React from 'react';
import { gradeFrame, gradeText } from '../../utils/equipmentColors';
import { resolveCombatRole } from '../../utils/combatRole';
import { stripHtml } from '../../utils/tooltipParser';
import { resolveEngravingIcon } from '../simulation/SpecScoreCorePanel';
import Tooltip from '../Tooltip';
import { isPrimaryArkGridEffect, parseArkGridGemTooltip, parseArkPassiveNode, sortArkGridEffects, type ExpeditionCharacterState } from './expeditionModel';

const cleanText = (value: string | null | undefined): string =>
  stripHtml(value ?? '').replace(/\s+/g, ' ').trim();

const DetailState: React.FC<{
  readonly label: string;
  readonly status: 'idle' | 'loading' | 'success' | 'error';
  readonly children: React.ReactNode;
}> = ({ label, status, children }) => (
  <section className="rounded-xl border border-gray-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
    <h4 className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">{label}</h4>
    {status === 'loading' || status === 'idle' ? (
      <p className="text-xs text-gray-400">불러오는 중...</p>
    ) : status === 'error' ? (
      <p className="text-xs font-medium text-red-500">이 정보를 불러오지 못했습니다.</p>
    ) : children}
  </section>
);

const Empty = () => <p className="text-xs text-gray-400">표시할 정보가 없습니다.</p>;
const ARK_PASSIVE_GROUPS = ['진화', '깨달음', '도약'] as const;

export const ExpeditionCharacterDetails: React.FC<{ readonly row: ExpeditionCharacterState }> = ({ row }) => {
  const passiveTabsId = React.useId();
  const [selectedPassiveGroup, setSelectedPassiveGroup] = React.useState<string>('진화');
  const gems = (row.gems.data?.Gems ?? []).filter((gem) => gem != null);
  const gemSkillsBySlot = new Map((row.gems.data?.Effects?.Skills ?? []).map((skill) => [skill.GemSlot, skill]));
  const engravingItems = (row.engravings.data?.Engravings ?? []).filter((item) => item != null);
  const engravingEffects = (row.engravings.data?.ArkPassiveEffects ?? row.engravings.data?.Effects ?? []).filter((effect) => effect != null);
  const passivePoints = (row.arkPassive.data?.Points ?? []).filter((point) => point != null);
  const passiveEffects = (row.arkPassive.data?.Effects ?? []).filter((effect) => effect != null);
  const availablePassiveGroups = ARK_PASSIVE_GROUPS.filter((groupName) =>
    passivePoints.some((point) => cleanText(point.Name) === groupName)
    || passiveEffects.some((effect) => cleanText(effect.Name) === groupName));
  const activePassiveGroup = availablePassiveGroups.includes(selectedPassiveGroup as typeof ARK_PASSIVE_GROUPS[number])
    ? selectedPassiveGroup
    : availablePassiveGroups[0] ?? selectedPassiveGroup;
  const activePassivePoint = passivePoints.find((point) => cleanText(point.Name) === activePassiveGroup);
  const activePassiveNodes = passiveEffects.filter((effect) => cleanText(effect.Name) === activePassiveGroup);
  const gridSlots = (row.arkGrid.data?.Slots ?? []).filter((slot) => slot != null);
  const gridEffects = (row.arkGrid.data?.Effects ?? []).filter((effect) => effect != null);
  const combatRole = resolveCombatRole(row.sibling.CharacterClassName, row.arkPassive.data).role;
  const sortedGridEffects = sortArkGridEffects(gridEffects, combatRole);

  return (
    <div
      className="grid gap-3 p-4"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))' }}
      aria-label={`${row.sibling.CharacterName} 상세 정보`}
    >
      <DetailState label="보석" status={row.gems.status}>
        {gems.length === 0 ? <Empty /> : (
          <div className="flex flex-wrap gap-2">
            {gems.map((gem) => {
              const gemName = cleanText(gem.Name).replace(new RegExp(`^${gem.Level}\\s*레벨\\s*`), '');
              const skill = gemSkillsBySlot.get(gem.Slot);
              const skillName = cleanText(skill?.Name) || gemName;
              const descriptions = (skill?.Description ?? []).map((description) => cleanText(description)).filter(Boolean);
              const frame = gradeFrame(gem.Grade, 'bg');
              return (
                <Tooltip
                  key={gem.Slot}
                  label={`${skillName} ${gem.Level}레벨 보석 정보`}
                  content={(
                    <div className="min-w-48 space-y-2">
                      <div className="flex items-center gap-2">
                        {skill?.Icon && <img src={skill.Icon} alt="" loading="lazy" className="h-8 w-8 rounded-lg" />}
                        <div>
                          <strong className="block text-sm text-gray-900 dark:text-white">{skillName}</strong>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">{gemName}</span>
                        </div>
                      </div>
                      {descriptions.length > 0 ? (
                        <div className="space-y-1 border-t border-gray-200/70 pt-2 dark:border-white/10">
                          {descriptions.map((description, index) => <p key={`${description}-${index}`}>{description}</p>)}
                        </div>
                      ) : skill?.Option ? <p className="border-t border-gray-200/70 pt-2 dark:border-white/10">{cleanText(skill.Option)}</p> : null}
                    </div>
                  )}
                >
                  <span className="relative inline-flex">
                    <span className={`h-12 w-12 overflow-hidden rounded-lg border ${frame.className}`} style={frame.style}>
                      {gem.Icon ? <img src={gem.Icon} alt={skillName} loading="lazy" className="h-full w-full object-cover" /> : <span className="block h-full w-full bg-gray-100 dark:bg-white/5" />}
                    </span>
                    <span className="absolute right-0 top-0 min-w-5 rounded-bl-lg rounded-tr-lg bg-gray-900 px-1 text-center text-[10px] font-black leading-5 text-white shadow dark:bg-white dark:text-gray-900">{gem.Level}</span>
                  </span>
                </Tooltip>
              );
            })}
          </div>
        )}
      </DetailState>

      <DetailState label="각인" status={row.engravings.status}>
        {engravingItems.length === 0 && engravingEffects.length === 0 ? <Empty /> : (
          <div className="space-y-2">
            {engravingEffects.length === 0 && engravingItems.length > 0 && <div className="flex flex-col gap-1.5">{engravingItems.map((item) => (
              <span key={`${item.Slot}-${item.Name}`} className="flex w-full items-center gap-1.5 rounded-lg bg-purple-500/10 px-2 py-1 text-xs text-purple-700 dark:text-purple-300">{item.Icon && <img src={item.Icon} alt={cleanText(item.Name)} loading="lazy" className="h-7 w-7 rounded" />}{cleanText(item.Name)}</span>
            ))}</div>}
            <div className="flex flex-col gap-1.5">{engravingEffects.map((effect, index) => {
              const name = cleanText(effect.Name);
              const description = cleanText(effect.Description);
              const level = 'Level' in effect && typeof effect.Level === 'number' ? effect.Level : null;
              const grade = 'Grade' in effect && typeof effect.Grade === 'string' ? effect.Grade : '';
              const abilityStoneLevel = 'AbilityStoneLevel' in effect && typeof effect.AbilityStoneLevel === 'number' ? effect.AbilityStoneLevel : null;
              const directIcon = 'Icon' in effect && typeof effect.Icon === 'string' ? effect.Icon : undefined;
              const icon = resolveEngravingIcon(row.engravings.data!, name, directIcon);
              const frame = gradeFrame(grade, 'subtle');
              return (
                <Tooltip
                  key={`${effect.Name}-${index}`}
                  label={`${name} 각인 효과`}
                  className="w-full"
                  content={(
                    <div className="min-w-48 space-y-2">
                      <div className="flex items-center gap-2">
                        {icon ? <img src={icon} alt="" loading="lazy" className="h-8 w-8 rounded-lg" /> : <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 font-bold text-purple-500">{name.slice(0, 1)}</span>}
                        <div>
                          <strong className="block text-sm text-gray-900 dark:text-white">{name}</strong>
                          {level !== null && <span className="font-bold text-purple-600 dark:text-purple-300">Lv.{level}</span>}
                        </div>
                      </div>
                      {description && <p className="border-t border-gray-200/70 pt-2 leading-relaxed dark:border-white/10">{description}</p>}
                      {abilityStoneLevel !== null && <p className="text-[11px] font-medium text-blue-600 dark:text-blue-300">어빌리티 스톤 Lv.{abilityStoneLevel}</p>}
                    </div>
                  )}
                >
                  <span className={`flex w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-xs text-gray-700 dark:text-gray-300 ${frame.className}`} style={frame.style}>
                    {icon ? <img src={icon} alt={name} loading="lazy" className="h-7 w-7 rounded" /> : <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded bg-purple-500/10 font-bold text-purple-500">{name.slice(0, 1)}</span>}
                    {name}{level !== null ? ` Lv.${level}` : ''}
                  </span>
                </Tooltip>
              );
            })}</div>
          </div>
        )}
      </DetailState>

      <DetailState label="아크그리드 코어 · 젬" status={row.arkGrid.status}>
        {gridSlots.length === 0 ? <Empty /> : (
          <div className="space-y-2">
            {gridSlots.map((slot) => {
              const coreFrame = gradeFrame(slot.Grade, 'bg');
              return (
                <div key={slot.Index} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  {slot.Icon && (
                    <div className={`h-9 w-9 shrink-0 overflow-hidden rounded-lg border ${coreFrame.className}`} style={coreFrame.style}>
                      <img src={slot.Icon} alt={cleanText(slot.Name) || '아크그리드 코어'} loading="lazy" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div><strong>{cleanText(slot.Name) || '빈 코어'}</strong> · {slot.Point}P
                    {(slot.Gems ?? []).some((gem) => gem?.Icon) && (
                      <div className="mt-1 flex gap-1">
                        {(slot.Gems ?? []).filter((gem) => gem?.Icon).map((gem) => {
                          const gemFrame = gradeFrame(gem.Grade, 'bg');
                          const gemText = gradeText(gem.Grade);
                          const tooltip = parseArkGridGemTooltip(gem);
                          return (
                            <Tooltip
                              key={gem.Index}
                              label={`${tooltip.name} 정보`}
                              className={gem.IsActive ? '' : 'opacity-40 grayscale'}
                              content={(
                                <div className="min-w-48 space-y-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <strong className="text-sm text-gray-900 dark:text-white">{tooltip.name}</strong>
                                    <span className={`font-bold ${gemText.className}`} style={gemText.style}>{tooltip.grade}</span>
                                  </div>
                                  {(tooltip.willpower !== null || tooltip.point !== null) && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {tooltip.willpower !== null && <span className="rounded-md bg-gray-100 px-2 py-1 dark:bg-white/10">의지력 {tooltip.willpower}</span>}
                                      {tooltip.pointLabel && tooltip.point !== null && <span className="rounded-md bg-la-gold/15 px-2 py-1 font-bold text-la-gold-deep dark:text-la-gold">{tooltip.pointLabel} {tooltip.point}</span>}
                                    </div>
                                  )}
                                  {tooltip.effects.length > 0 && (
                                    <div className="space-y-1 border-t border-gray-200/70 pt-2 dark:border-white/10">
                                      {tooltip.effects.map((effect) => <p key={`${effect.name}-${effect.level}`} className="flex justify-between gap-4"><span>{effect.name}</span><strong>Lv.{effect.level}</strong></p>)}
                                    </div>
                                  )}
                                </div>
                              )}
                            >
                              <div className={`h-6 w-6 overflow-hidden rounded border ${gemFrame.className}`} style={gemFrame.style}>
                                <img src={gem.Icon} alt="" loading="lazy" className="h-full w-full object-cover" />
                              </div>
                            </Tooltip>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DetailState>

      <DetailState label="아크그리드 활성 효과" status={row.arkGrid.status}>
        {sortedGridEffects.length === 0 ? <Empty /> : (
          <div className="space-y-1.5">
            {sortedGridEffects.map((effect) => {
              const emphasized = isPrimaryArkGridEffect(effect.Name, combatRole);
              return (
                <p
                  key={effect.Name}
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${emphasized
                    ? combatRole === 'support'
                      ? 'border-sky-500/25 bg-sky-500/10 font-bold text-sky-700 dark:text-sky-300'
                      : 'border-orange-500/25 bg-orange-500/10 font-bold text-orange-700 dark:text-orange-300'
                    : 'border-transparent text-gray-700 dark:text-gray-300'}`}
                >
                  <span>{cleanText(effect.Name)}</span>
                  <strong>Lv.{effect.Level}</strong>
                </p>
              );
            })}
          </div>
        )}
      </DetailState>

      <DetailState label="아크패시브 · 카르마" status={row.arkPassive.status}>
        {availablePassiveGroups.length === 0 ? <Empty /> : (
          <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
            <div role="tablist" aria-label="아크패시브 종류" className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
              {ARK_PASSIVE_GROUPS.map((groupName) => {
                const available = availablePassiveGroups.includes(groupName);
                const active = activePassiveGroup === groupName;
                return (
                  <button
                    key={groupName}
                    id={`${passiveTabsId}-${groupName}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`${passiveTabsId}-${groupName}-panel`}
                    disabled={!available}
                    onClick={() => setSelectedPassiveGroup(groupName)}
                    className={`rounded-md px-2 py-1.5 font-bold transition-colors ${active ? 'bg-white text-la-gold-deep shadow-sm dark:bg-white/10 dark:text-la-gold' : 'text-gray-500 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-35 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  >
                    {groupName}
                  </button>
                );
              })}
            </div>
            <div
              id={`${passiveTabsId}-${activePassiveGroup}-panel`}
              role="tabpanel"
              aria-labelledby={`${passiveTabsId}-${activePassiveGroup}-tab`}
              className="space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h5 className="text-sm font-black text-gray-900 dark:text-white">{activePassiveGroup}</h5>
                  {activePassivePoint?.Description && <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{cleanText(activePassivePoint.Description)}</p>}
                </div>
                {activePassivePoint && <p className="whitespace-nowrap"><strong className="text-sm text-la-gold-deep dark:text-la-gold">{activePassivePoint.Value}</strong> 포인트</p>}
              </div>
              {activePassiveNodes.length > 0 && (
                <div className="space-y-1.5">
                  {activePassiveNodes.map((effect, index) => {
                    const node = parseArkPassiveNode(effect);
                    return (
                      <div key={`${effect.Name}-${node.tier}-${node.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-gray-100/70 px-2 py-1.5 dark:bg-white/5">
                        {effect.Icon ? <img src={effect.Icon} alt={node.name} loading="lazy" className="h-8 w-8 shrink-0 rounded-lg" /> : <span className="h-8 w-8 shrink-0 rounded-lg bg-gray-200 dark:bg-white/10" />}
                        {node.tier !== null && <span className="w-6 shrink-0 rounded bg-gray-900 py-0.5 text-center text-[10px] font-black text-white dark:bg-white dark:text-gray-900">T{node.tier}</span>}
                        <span className="min-w-0 font-medium text-gray-800 dark:text-gray-200">{node.name}{node.level !== null ? ` Lv.${node.level}` : ''}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailState>
    </div>
  );
};
