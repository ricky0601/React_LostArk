import type { ReactElement } from 'react';
import { LOPEC_ENGRAVING_TOTAL_EFFECTS } from '../../data/specScore/lopecCoefficients';
import type { EngravingData } from '../../types/lostark';
import type { StoneState } from '../../utils/polishState';
import { SpecSelect } from './SpecSelect';
import type { EngMod, StoneSlotMod } from './specScoreSimulatorTypes';

interface SpecScoreCorePanelProps {
  readonly visible: boolean;
  readonly section?: 'all' | 'engravings' | 'stone';
  readonly engravings: EngravingData;
  readonly stone: StoneState | null;
  readonly engravingMods: Record<string, EngMod>;
  readonly stoneMods: Record<number, StoneSlotMod>;
  readonly changedCount: number;
  readonly summaryLabel: string;
  readonly onEngravingChange: (name: string, patch: EngMod) => void;
  readonly onStoneSlotChange: (slotIndex: number, patch: StoneSlotMod) => void;
}

const ENGRAVING_ICON_URLS: Record<string, string> = {
  원한: 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Buff/Buff_71.png',
  '예리한 둔기': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/achieve/achieve_03_40.png',
  아드레날린: 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_235.png',
  돌격대장: 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_210.png',
  '저주받은 인형': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_237.png',
  각성: 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Buff/Buff_113.png',
  강령술: 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_29.png',
  '강화 방패': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_239.png',
  '결투의 대가': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_224.png',
  구슬동자: 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Buff/Buff_18.png',
  '굳은 의지': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_44.png',
  '급소 타격': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_168.png',
  '기습의 대가': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_148.png',
  긴급구조: 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_238.png',
  '달인의 저력': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_147.png',
  '마나 효율 증가': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_166.png',
  '마나의 흐름': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_63.png',
  바리케이드: 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_170.png',
  '번개의 분노': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_191.png',
  '부러진 뼈': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_94.png',
  '분쇄의 주먹': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_83.png',
  불굴: 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_66.png',
  선수필승: 'https://cdn-lostark.game.onstove.com/efui_iconatlas/achieve/achieve_08_62.png',
  속전속결: 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_236.png',
  '슈퍼 차지': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/achieve/achieve_06_14.png',
  승부사: 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_136.png',
  '시선 집중': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_234.png',
  '실드 관통': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_89.png',
  '안정된 상태': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Buff/Buff_105.png',
  '약자 무시': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/achieve/achieve_04_30.png',
  '에테르 포식자': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_74.png',
  '여신의 가호': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_229.png',
  '위기 모면': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_162.png',
  전문의: 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_237.png',
  '정기 흡수': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_65.png',
  '정밀 단도': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_239.png',
  '중갑 착용': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_46.png',
  '질량 증가': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_231.png',
  '최대 마나 증가': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Buff/Buff_122.png',
  추진력: 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_232.png',
  '타격의 대가': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_233.png',
  '탈출의 명수': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/buff/buff_10.png',
  '폭발물 전문가': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Buff/Buff_121.png',
  '이동속도 감소': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_221.png',
  '공격속도 감소': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_220.png',
  '방어력 감소': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_219.png',
  '공격력 감소': 'https://cdn-lostark.game.onstove.com/EFUI_IconAtlas/Ability/Ability_218.png',
};

export const resolveEngravingIcon = (engravings: EngravingData, name: string, directIcon?: string): string | null => {
  if (ENGRAVING_ICON_URLS[name]) return ENGRAVING_ICON_URLS[name];
  if (directIcon) return directIcon;
  return engravings.Engravings?.find((engraving) => engraving.Name === name)?.Icon ?? null;
};

const DEALER_STONE_ENGRAVING_OPTIONS = [
  '원한',
  '아드레날린',
  '예리한 둔기',
  '저주받은 인형',
  '타격의 대가',
  '돌격대장',
  '질량 증가',
  '기습의 대가',
  '결투의 대가',
  '바리케이드',
  '안정된 상태',
  '달인의 저력',
  '속전속결',
  '슈퍼 차지',
  '에테르 포식자',
  '마나 효율 증가',
  '정밀 단도',
  '약자 무시',
  '추진력',
  '시선 집중',
  '부러진 뼈',
  '실드 관통',
  '승부사',
  '분쇄의 주먹',
].filter((name) => LOPEC_ENGRAVING_TOTAL_EFFECTS[name] !== undefined);

const LEVEL_OPTIONS = Array.from({ length: 5 }, (_, i) => i).map((level) => ({
  value: level,
  label: String(level),
}));

const STONE_LEVEL_OPTIONS = [0, 1, 2, 3, 4].map((level) => ({
  value: level,
  label: `Lv.${level}`,
}));

export const SpecScoreCorePanel = ({
  visible,
  section = 'all',
  engravings,
  stone,
  engravingMods,
  stoneMods,
  changedCount,
  summaryLabel,
  onEngravingChange,
  onStoneSlotChange,
}: SpecScoreCorePanelProps): ReactElement | null => {
  if (!visible) return null;

  const stoneEngravingOptions = Array.from(new Set([
    ...DEALER_STONE_ENGRAVING_OPTIONS,
    ...(stone?.engravings.map((eng) => eng.name) ?? []),
  ]));
  const commonEngravings = engravings.ArkPassiveEffects ?? [];
  const commonEngravingOptions = Array.from(new Set([
    ...DEALER_STONE_ENGRAVING_OPTIONS,
    ...commonEngravings.map((eng) => eng.Name),
  ]));
  const selectedCommonNames = commonEngravings.map((eng) => engravingMods[eng.Name]?.Name ?? eng.Name);
  const showEngravings = section === 'all' || section === 'engravings';
  const showStone = section === 'all' || section === 'stone';

  return (
    <>
      {showEngravings && (
      <div className="glass-card p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              공용 각인 ({engravings.ArkPassiveEffects?.length ?? 0}개)
            </h3>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{summaryLabel}</p>
          </div>
          {changedCount > 0 && <span className="spec-chip">변경 {changedCount}</span>}
        </div>
        {true && (
          <div className="space-y-1.5">
            {commonEngravings.map((e, index) => {
              const currentName = engravingMods[e.Name]?.Name ?? e.Name;
              const currentLevel = engravingMods[e.Name]?.Level ?? e.Level;
              const icon = resolveEngravingIcon(engravings, currentName, e.Icon);
              const otherSelectedNames = selectedCommonNames.filter((_, selectedIndex) => selectedIndex !== index);
              return (
                <div
                  key={e.Name}
                  className="flex items-center gap-2 py-2 text-xs border-b border-gray-100 dark:border-white/5 last:border-0"
                >
                  <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5">
                    {icon ? (
                      <img src={icon} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gray-400">
                        {currentName.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <SpecSelect
                    value={currentName}
                    onChange={(value) => onEngravingChange(e.Name, { Name: value })}
                    items={commonEngravingOptions.map((name) => ({
                      value: name,
                      label: name,
                      disabled: otherSelectedNames.includes(name),
                    }))}
                    ariaLabel={`${e.Name} 각인 선택`}
                    className="min-w-0 flex-1"
                  />
                  <span className="hidden text-gray-400 sm:inline">{e.Grade}</span>
                  <div className="flex flex-shrink-0 items-center gap-1 text-gray-500">
                    단계
                    <SpecSelect
                      value={currentLevel}
                      onChange={(value) =>
                        onEngravingChange(e.Name, { Level: Number(value) })
                      }
                      items={LEVEL_OPTIONS}
                      ariaLabel={`${currentName} 각인 단계`}
                      className="w-16 flex-shrink-0"
                      textAlign="center"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {showStone && (
      <div className="glass-card p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">어빌리티 스톤</h3>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{summaryLabel}</p>
          </div>
          {changedCount > 0 && <span className="spec-chip">변경 {changedCount}</span>}
        </div>
        {stone && stone.engravings.length > 0 ? (
          <div className="flex items-stretch gap-2 py-1">
            <div className="relative w-14 flex-shrink-0">
              <img
                src={stone.raw.Icon}
                alt=""
                loading="lazy"
                className="h-14 w-14 rounded border border-gray-200 dark:border-white/10"
              />
              <span className="absolute bottom-0.5 left-0.5 right-0.5 rounded bg-black/70 text-center text-[9px] font-bold leading-tight text-amber-300">
                스톤
              </span>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-1 text-[11px]">
              {stone.engravings.map((eng, index) => {
                const selectedName = stoneMods[index]?.name ?? eng.name;
                const selectedLevel = stoneMods[index]?.level ?? eng.level;
                const otherSelectedNames = stone.engravings
                  .map((stoneEng, stoneIndex) => (stoneIndex === index ? null : (stoneMods[stoneIndex]?.name ?? stoneEng.name)))
                  .filter((name): name is string => name !== null);
                return (
                  <div key={`${eng.name}-${index}`} className="flex items-stretch gap-1">
                    <SpecSelect
                      value={selectedName}
                      onChange={(value) => onStoneSlotChange(index, { name: value })}
                      items={stoneEngravingOptions.map((name) => ({
                        value: name,
                        label: name,
                        disabled: otherSelectedNames.includes(name),
                      }))}
                      ariaLabel="어빌리티 스톤 각인 선택"
                      className="min-w-0 flex-1"
                    />
                    <SpecSelect
                      value={selectedLevel ?? 0}
                      onChange={(value) => onStoneSlotChange(index, { level: Number(value) })}
                      items={STONE_LEVEL_OPTIONS}
                      ariaLabel="어빌리티 스톤 단계 선택"
                      className="w-16 flex-shrink-0"
                      textAlign="center"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            어빌리티 스톤 정보를 읽을 수 없어 스톤 단계 시뮬레이션을 표시할 수 없습니다.
          </div>
        )}
      </div>
      )}
    </>
  );
};
