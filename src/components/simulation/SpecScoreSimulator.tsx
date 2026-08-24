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
import { ITEM_LEVEL_SLOT_ORDER } from './specScoreSimulatorModel';
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

  for (const slot of ITEM_LEVEL_SLOT_ORDER) {
    const state = equipment[slot];
    if (!state) return fallbackItemLevel;

    const baseItemLevel = getEquipmentItemLevel(state);
    if (baseItemLevel === null) return fallbackItemLevel;

    totalItemLevel += baseItemLevel + state.advancedLevel;
  }

  return totalItemLevel / ITEM_LEVEL_SLOT_ORDER.length;
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
  const gemPanel = (
    <SpecScoreGemPanel
      visible={showSection('gear')}
      gems={raw.gems}
      gemMods={mods.gems}
      changedCount={Object.keys(mods.gems).length}
      summaryLabel={`${raw.gems.Gems?.length ?? 0}개 보석 중 ${Object.keys(mods.gems).length}개 변경`}
      onGemChange={updateGemMod}
      onApplyBulkGems={applyBulkGems}
    />
  );
  const equipmentPanel = (
    <SpecScoreEquipmentPanel
      visible={showSection('gear')}
      characterClassName={profile.CharacterClassName}
      equipment={raw.equip}
      equipmentMods={mods.equip}
      equipmentCount={equipCount}
      changedCount={Object.keys(mods.equip).length}
      summaryLabel={`${equipCount}개 장비 중 ${Object.keys(mods.equip).length}개 변경`}
      onEquipmentChange={updateEquipMod}
      onApplyBulkEquipment={applyBulkEquip}
    />
  );
  const accessoriesPanel = (
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
  );
  const corePanelProps = {
    visible: showSection('core'),
    engravings: raw.engravings,
    stone: raw.stone,
    engravingMods: mods.engs,
    stoneMods: mods.stone,
    onEngravingChange: updateEngMod,
    onStoneSlotChange: updateStoneSlotMod,
  };
  const engravingsPanel = (
    <SpecScoreCorePanel
      {...corePanelProps}
      section="engravings"
      changedCount={Object.keys(mods.engs).length}
      summaryLabel={`${Object.keys(mods.engs).length}각인 변경`}
    />
  );
  const stonePanel = (
    <SpecScoreCorePanel
      {...corePanelProps}
      section="stone"
      changedCount={Object.keys(mods.stone).length}
      summaryLabel={`${raw.stone?.engravings.length ?? 0}개 슬롯 중 ${Object.keys(mods.stone).length}개 변경`}
    />
  );
  const combinedCorePanel = (
    <SpecScoreCorePanel
      {...corePanelProps}
      section="all"
      changedCount={coreChangedCount}
      summaryLabel={`${Object.keys(mods.engs).length}각인 · ${Object.keys(mods.stone).length}스톤 변경`}
    />
  );
  const arkGridPanel = (
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
  );

  return (
    <div className="spec-simulator-layout grid grid-cols-1 items-start gap-4 animate-fade-in sm:gap-5 xl:grid-cols-[21rem_minmax(0,1fr)] xl:gap-6">
      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
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

        <div className={activeCategory === 'all' ? 'grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)] lg:gap-5' : 'space-y-4'}>
          {activeCategory === 'all' ? (
            <>
              <div className="lg:col-span-2">{gemPanel}</div>

              <div className="space-y-4">{equipmentPanel}</div>

              <div className="space-y-4">
                {accessoriesPanel}
                {stonePanel}
              </div>

              <div className="lg:col-span-2">{engravingsPanel}</div>

              {showSection('systems') && (
                <div className="lg:col-span-2">{arkGridPanel}</div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-4">{combinedCorePanel}</div>
              <div className="space-y-4">
                {gemPanel}
                {equipmentPanel}
              </div>
              <div className="space-y-4">{accessoriesPanel}</div>
              {showSection('systems') && <div>{arkGridPanel}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecScoreSimulator;
