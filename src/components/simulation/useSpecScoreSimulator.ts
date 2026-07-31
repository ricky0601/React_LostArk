import { useEffect, useMemo, useState } from 'react';
import { resolveArmletLevel, type EquipSlot } from '../../data/specScore/lopecCoefficients';
import type { AccessorySlot, BraceletStatOption } from '../../data/specScore/polishOptions';
import type { CharacterProfile } from '../../types/lostark';
import type { ArkGridCoreMod, ArkGridGemEditTarget, ArkGridGemMod } from './arkGridSimulatorState';
import {
  EMPTY_BRACELET_STATS,
  EMPTY_MODS,
  SLOT_ORDER,
  buildModifiedSpecScoreData,
  calculateSpecScore,
  getAccessoryOptionLabels,
  getBraceletOptionLabels,
  hasSpecScoreMods,
  replaceBraceletLabel,
  replaceBraceletStat,
  replacePolishLabel,
} from './specScoreSimulatorModel';
import { fetchSpecScoreRawData, parseNumberText } from './specScoreSimulatorParsing';
import type {
  ActiveCategory,
  EngMod,
  EquipMod,
  GemMod,
  Mods,
  SpecScoreRawData,
  StoneSlotMod,
} from './specScoreSimulatorTypes';

export const useSpecScoreSimulator = (profile: CharacterProfile) => {
  const [raw, setRaw] = useState<SpecScoreRawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mods, setMods] = useState<Mods>(EMPTY_MODS);
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>('all');
  const [editingArkGridGem, setEditingArkGridGem] = useState<ArkGridGemEditTarget | null>(null);
  const [arkGridGemDraft, setArkGridGemDraft] = useState<Required<ArkGridGemMod> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMods(EMPTY_MODS);
    setEditingArkGridGem(null);
    setArkGridGemDraft(null);
    void fetchSpecScoreRawData(profile)
      .then((data) => {
        if (cancelled) return;
        setRaw(data);
        setLoading(false);
      })
      .catch((fetchError: unknown) => {
        if (cancelled) return;
        console.error(fetchError);
        setError('데이터를 불러올 수 없습니다');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const modifiedRaw = useMemo(
    () => (raw ? buildModifiedSpecScoreData(raw, mods) : null),
    [raw, mods],
  );
  const currentScore = useMemo(
    () => parseNumberText(profile.CombatPower ?? undefined),
    [profile.CombatPower],
  );
  const sim = useMemo(
    () => (currentScore > 0 && raw && modifiedRaw
      ? calculateSpecScore(currentScore, raw, modifiedRaw)
      : null),
    [currentScore, raw, modifiedRaw],
  );
  const hasMods = hasSpecScoreMods(mods);

  const updateGemMod = (slot: number, patch: GemMod): void => {
    setMods((previous) => ({
      ...previous,
      gems: { ...previous.gems, [slot]: { ...previous.gems[slot], ...patch } },
    }));
  };

  const updateEngMod = (name: string, patch: EngMod): void => {
    setMods((previous) => ({
      ...previous,
      engs: { ...previous.engs, [name]: { ...previous.engs[name], ...patch } },
    }));
  };

  const updateEquipMod = (slot: EquipSlot, patch: EquipMod): void => {
    const equipment = raw?.equip[slot];
    if (!equipment) return;
    const safePatch: EquipMod = slot === 'armlet'
      ? (patch.normalLevel === undefined ? {} : { normalLevel: resolveArmletLevel(patch.normalLevel) })
      : equipment.isInherited && patch.advancedLevel !== undefined
        ? { ...patch, advancedLevel: undefined }
        : patch;
    setMods((previous) => ({
      ...previous,
      equip: { ...previous.equip, [slot]: { ...previous.equip[slot], ...safePatch } },
    }));
  };

  const updatePolishMod = (slot: AccessorySlot, optionIndex: 0 | 1 | 2, label: string): void => {
    setMods((previous) => {
      const currentLabels = previous.polish[slot]?.polishOptions ??
        getAccessoryOptionLabels(raw?.accessories[slot]);
      return {
        ...previous,
        polish: {
          ...previous.polish,
          [slot]: { polishOptions: replacePolishLabel(currentLabels, optionIndex, label) },
        },
      };
    });
  };

  const updateBraceletMod = (optionIndex: 0 | 1 | 2 | 3, label: string): void => {
    setMods((previous) => {
      const currentLabels = previous.bracelet?.options ?? getBraceletOptionLabels(raw?.bracelet ?? null);
      return {
        ...previous,
        bracelet: { ...previous.bracelet, options: replaceBraceletLabel(currentLabels, optionIndex, label) },
      };
    });
  };

  const updateBraceletStatMod = (
    statIndex: 0 | 1 | 2 | 3,
    patch: Partial<BraceletStatOption>,
  ): void => {
    setMods((previous) => {
      const currentStats = previous.bracelet?.stats ?? raw?.bracelet?.stats ?? EMPTY_BRACELET_STATS;
      return {
        ...previous,
        bracelet: { ...previous.bracelet, stats: replaceBraceletStat(currentStats, statIndex, patch) },
      };
    });
  };

  const updateStoneSlotMod = (slotIndex: number, patch: StoneSlotMod): void => {
    setMods((previous) => ({
      ...previous,
      stone: { ...previous.stone, [slotIndex]: { ...previous.stone[slotIndex], ...patch } },
    }));
  };

  const applyBulkEquip = (patch: EquipMod): void => {
    if (!raw) return;
    const equip: Mods['equip'] = {};
    for (const slot of SLOT_ORDER) {
      const current = raw.equip[slot];
      if (!current) continue;
      if (slot === 'armlet') {
        if (patch.normalLevel !== undefined) {
          equip[slot] = { ...mods.equip[slot], normalLevel: resolveArmletLevel(patch.normalLevel) };
        } else if (mods.equip[slot]) {
          equip[slot] = mods.equip[slot];
        }
        continue;
      }
      if (current.isInherited && patch.advancedLevel !== undefined) {
        const { advancedLevel, ...existing } = mods.equip[slot] ?? {};
        if (Object.keys(existing).length > 0) equip[slot] = existing;
        continue;
      }
      equip[slot] = { ...mods.equip[slot], ...patch };
    }
    setMods((previous) => ({ ...previous, equip }));
  };

  const reset = (): void => {
    setMods(EMPTY_MODS);
    setEditingArkGridGem(null);
    setArkGridGemDraft(null);
  };

  const applyBulkGems = (level: number): void => {
    if (!raw?.gems.Gems) return;
    const gems: Record<number, GemMod> = {};
    for (const gem of raw.gems.Gems) {
      gems[gem.Slot] = { ...mods.gems[gem.Slot], Level: level };
    }
    setMods((previous) => ({ ...previous, gems }));
  };

  const updateArkGridCore = (slotIndex: number, patch: ArkGridCoreMod): void => {
    setMods((previous) => ({
      ...previous,
      arkGrid: {
        ...previous.arkGrid,
        [slotIndex]: { ...previous.arkGrid[slotIndex], ...patch },
      },
    }));
  };

  const updateArkGridGem = (
    target: ArkGridGemEditTarget,
    baseState: Required<ArkGridGemMod>,
    patch: ArkGridGemMod,
  ): void => {
    setMods((previous) => {
      const currentCore = previous.arkGrid[target.slotIndex] ?? {};
      const currentGems = currentCore.gems ?? {};
      const currentGem = currentGems[target.gemIndex] ?? baseState;
      return {
        ...previous,
        arkGrid: {
          ...previous.arkGrid,
          [target.slotIndex]: {
            ...currentCore,
            gems: {
              ...currentGems,
              [target.gemIndex]: { ...currentGem, ...patch },
            },
          },
        },
      };
    });
  };

  return {
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
  };
};
