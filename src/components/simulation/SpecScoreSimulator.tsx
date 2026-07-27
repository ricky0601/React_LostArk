import type { FC } from 'react';
import { LoadingIndicator } from '../Loading';
import { GEAR_ITEM_LEVELS } from '../../data/itemLevel';
import type { CharacterProfile } from '../../types/lostark';
import { parseNumberText } from './specScoreSimulatorParsing';
import { ArkGridSimulatorPanel } from './ArkGridSimulatorPanel';
import { SpecScoreAccessoriesPanel } from './SpecScoreAccessoriesPanel';
import { SpecScoreCategoryTabs } from './SpecScoreCategoryTabs';
import { SpecScoreCorePanel } from './SpecScoreCorePanel';
import { SpecScoreEquipmentPanel } from './SpecScoreEquipmentPanel';
import { SpecScoreGemPanel } from './SpecScoreGemPanel';
import { SpecScoreSummary } from './SpecScoreSummary';
import { SLOT_ORDER } from './specScoreSimulatorModel';
import type { ActiveCategory, SpecScoreCategory, SpecScoreRawData } from './specScoreSimulatorTypes';
import type { EquipmentState } from '../../utils/equipmentState';
import { useSpecScoreSimulator } from './useSpecScoreSimulator';

const getGearTableName = (equipment: EquipmentState): string =>
  equipment.equipmentFamily === 'serka' ? '세르카 계승' : '에기르';

const getEquipmentItemLevel = (equipment: EquipmentState): number | null => {
  const table = GEAR_ITEM_LEVELS.find((gear) => gear.name === getGearTableName(equipment));
  return table?.levels[equipment.normalLevel] ?? null;
};

const calculateAverageItemLevel = (
  equipment: SpecScoreRawData['equip'],
  fallbackItemLevel: number,
): number => {
  let totalItemLevel = 0;

  for (const slot of SLOT_ORDER) {
    const state = equipment[slot];
    if (!state) return fallbackItemLevel;

    const baseItemLevel = getEquipmentItemLevel(state);
    if (baseItemLevel === null) return fallbackItemLevel;

    totalItemLevel += baseItemLevel + state.advancedLevel;
  }

  return totalItemLevel / SLOT_ORDER.length;
};

interface Props {
  readonly profile: CharacterProfile;
}

const SpecScoreSimulator: FC<Props> = ({ profile }) => {
  const {
    raw,
    loading,
    error,
    mods,
    activeCategory,
    setActiveCategory,
    editingArkGridGem,
    arkGridGemDraft,
    setEditingArkGridGem,
    setArkGridGemDraft,
    modifiedRaw,
    currentScore,
    sim,
    hasMods,
    updateGemMod,
    updateEngMod,
    updateEquipMod,
    updatePolishMod,
    updateBraceletMod,
    updateBraceletStatMod,
    updateStoneSlotMod,
    applyBulkEquip,
    reset,
    applyBulkGems,
    updateArkGridCore,
    updateArkGridGem,
  } = useSpecScoreSimulator(profile);

  if (loading) {
    return <LoadingIndicator message="시뮬레이션 데이터 로딩 중..." className="animate-none" />;
  }
  if (error || !raw || currentScore <= 0) {
    return (
      <div className="spec-lab-card p-6 text-center text-red-500 dark:text-red-400">
        {error ?? '데이터 없음'}
      </div>
    );
  }

  const delta = sim?.delta ?? 0;
  const deltaColor =
    delta > 0
      ? 'text-green-600 dark:text-green-400'
      : delta < 0
        ? 'text-red-500 dark:text-red-400'
        : 'text-gray-500 dark:text-gray-400';
  const profileItemLevel = parseNumberText(profile.ItemAvgLevel);
  const itemLevel = calculateAverageItemLevel((modifiedRaw ?? raw).equip, profileItemLevel);
  const itemLevelDelta = itemLevel - profileItemLevel;
  const equipCount = Object.keys(raw.equip).length;
  const accessoryCount = Object.keys(raw.accessories).length;
  const arkGridCount = (modifiedRaw?.arkGrid ?? raw.arkGrid)?.Slots?.length ?? 0;
  const coreChangedCount = Object.keys(mods.engs).length + Object.keys(mods.stone).length;
  const gearChangedCount = Object.keys(mods.gems).length + Object.keys(mods.equip).length;
  const accessoryChangedCount = Object.keys(mods.polish).length + (mods.bracelet ? 1 : 0);
  const systemsChangedCount = Object.keys(mods.arkGrid).length;
  const changedCount = coreChangedCount + gearChangedCount + accessoryChangedCount + systemsChangedCount;
  const nextActionLabel = hasMods
    ? delta > 0
      ? '상승 세팅 우선 확인'
      : delta < 0
        ? '하락 구간 원복 검토'
        : '변경값 영향 재확인'
    : '옵션을 바꾸면 즉시 비교';
  const categories: SpecScoreCategory[] = [
    { id: 'all', label: '전체', changedCount, summaryLabel: hasMods ? `총 ${changedCount}개 변경` : '전체 워크벤치' },
    { id: 'core', label: '각인', count: (raw.engravings.ArkPassiveEffects?.length ?? 0) + (raw.stone?.engravings.length ?? 0), changedCount: coreChangedCount, summaryLabel: `${raw.engravings.ArkPassiveEffects?.length ?? 0}각인 · ${raw.stone?.engravings.length ?? 0}스톤` },
    { id: 'gear', label: '보석 & 장비', count: equipCount + (raw.gems.Gems?.length ?? 0), changedCount: gearChangedCount, summaryLabel: `${raw.gems.Gems?.length ?? 0}보석 · ${equipCount}장비` },
    { id: 'accessories', label: '장신구', count: accessoryCount + (raw.bracelet ? 1 : 0), changedCount: accessoryChangedCount, summaryLabel: `${accessoryCount}악세 · ${raw.bracelet ? '팔찌 있음' : '팔찌 없음'}` },
    { id: 'systems', label: '아크 그리드', count: arkGridCount, changedCount: systemsChangedCount, summaryLabel: `${arkGridCount}코어 슬롯` },
  ];
  const showSection = (id: ActiveCategory): boolean =>
    activeCategory === 'all' || activeCategory === id;

  return (
    <div className="spec-simulator-layout grid grid-cols-1 gap-4 animate-fade-in sm:gap-5 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start xl:gap-6">
      <aside className="xl:sticky xl:top-20 xl:self-start">
        <SpecScoreSummary
          sim={sim}
          hasMods={hasMods}
          deltaColor={deltaColor}
          currentItemLevel={profileItemLevel}
          simulatedItemLevel={itemLevel}
          itemLevelDelta={itemLevelDelta}
          changedCount={changedCount}
          nextActionLabel={nextActionLabel}
          onReset={reset}
        />
      </aside>

      <div className="min-w-0 space-y-4 sm:space-y-5">
        <SpecScoreCategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <div className={activeCategory === 'all' ? 'grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-5 xl:gap-6' : 'space-y-4'}>
          {activeCategory === 'all' && (
            <div className="lg:col-span-2">
              <SpecScoreGemPanel
                visible={showSection('gear')}
                gems={raw.gems}
                gemMods={mods.gems}
                changedCount={Object.keys(mods.gems).length}
                summaryLabel={`${raw.gems.Gems?.length ?? 0}개 보석 중 ${Object.keys(mods.gems).length}개 변경`}
                onGemChange={updateGemMod}
                onApplyBulkGems={applyBulkGems}
              />
            </div>
          )}

          <div className="space-y-4">
            <SpecScoreCorePanel
              visible={showSection('core')}
              section={activeCategory === 'all' ? 'engravings' : 'all'}
              engravings={raw.engravings}
              stone={raw.stone}
              engravingMods={mods.engs}
              stoneMods={mods.stone}
              changedCount={coreChangedCount}
              summaryLabel={`${Object.keys(mods.engs).length}각인 · ${Object.keys(mods.stone).length}스톤 변경`}
              onEngravingChange={updateEngMod}
              onStoneSlotChange={updateStoneSlotMod}
            />
          </div>
          <div className="space-y-4">
            {activeCategory !== 'all' && (
              <SpecScoreGemPanel
                visible={showSection('gear')}
                gems={raw.gems}
                gemMods={mods.gems}
                changedCount={Object.keys(mods.gems).length}
                summaryLabel={`${raw.gems.Gems?.length ?? 0}개 보석 중 ${Object.keys(mods.gems).length}개 변경`}
                onGemChange={updateGemMod}
                onApplyBulkGems={applyBulkGems}
              />
            )}
            <SpecScoreEquipmentPanel
              visible={showSection('gear')}
              equipment={raw.equip}
              equipmentMods={mods.equip}
              equipmentCount={equipCount}
              changedCount={Object.keys(mods.equip).length}
              summaryLabel={`${equipCount}개 장비 중 ${Object.keys(mods.equip).length}개 변경`}
              onEquipmentChange={updateEquipMod}
              onApplyBulkEquipment={applyBulkEquip}
            />
          </div>

          {activeCategory === 'all' && (
            <div className="space-y-4">
              <SpecScoreCorePanel
                visible={showSection('core')}
                section="stone"
                engravings={raw.engravings}
                stone={raw.stone}
                engravingMods={mods.engs}
                stoneMods={mods.stone}
                changedCount={Object.keys(mods.stone).length}
                summaryLabel={`${raw.stone?.engravings.length ?? 0}개 슬롯 중 ${Object.keys(mods.stone).length}개 변경`}
                onEngravingChange={updateEngMod}
                onStoneSlotChange={updateStoneSlotMod}
              />
            </div>
          )}

          <div className="space-y-4">
            <SpecScoreAccessoriesPanel
              visible={showSection('accessories')}
              accessories={raw.accessories}
              bracelet={raw.bracelet}
              polishMods={mods.polish}
              braceletMod={mods.bracelet}
              accessoryCount={accessoryCount}
              changedCount={accessoryChangedCount}
              summaryLabel={`${accessoryCount}악세 · 팔찌 ${mods.bracelet ? '변경' : '대기'}`}
              onPolishChange={updatePolishMod}
              onBraceletChange={updateBraceletMod}
              onBraceletStatChange={updateBraceletStatMod}
            />
          </div>
          {showSection('systems') && (
            <div className={activeCategory === 'all' ? 'lg:col-span-2' : undefined}>
              <ArkGridSimulatorPanel
                rawArkGrid={raw.arkGrid}
                modifiedArkGrid={modifiedRaw?.arkGrid}
                arkGridMods={mods.arkGrid}
                editingArkGridGem={editingArkGridGem}
                arkGridGemDraft={arkGridGemDraft}
                changedCount={systemsChangedCount}
                summaryLabel={`${arkGridCount}코어 · ${systemsChangedCount}개 변경`}
                setEditingArkGridGem={setEditingArkGridGem}
                setArkGridGemDraft={setArkGridGemDraft}
                updateArkGridCore={updateArkGridCore}
                updateArkGridGem={updateArkGridGem}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecScoreSimulator;
