import { useCallback, useState } from 'react';
import { fetchEquipment, fetchProfile } from '../../utils/api';
import {
  ARMOR_SLOTS,
  type ArmorSlot,
  parseEnhLevel,
  parseTooltipData,
  type SlotName,
} from './enhancementModel';

export const useEnhancementCharacter = () => {
  const [armorMap, setArmorMap] = useState<Partial<Record<ArmorSlot | '완갑', number>>>({});
  const [weaponLevel, setWeaponLevel] = useState<number | undefined>(undefined);
  const [slotIconMap, setSlotIconMap] = useState<Partial<Record<SlotName, string>>>({});
  const [slotInheritedMap, setSlotInheritedMap] = useState<Partial<Record<SlotName, boolean>>>({});
  const [advLevelMap, setAdvLevelMap] = useState<Partial<Record<SlotName, number>>>({});
  const [charItemLevel, setCharItemLevel] = useState<number | null>(null);
  const [charLoading, setCharLoading] = useState(false);
  const [charError, setCharError] = useState<string | null>(null);

  const searchCharacter = useCallback(async (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) return;

    setCharLoading(true);
    setCharError(null);
    setArmorMap({});
    setWeaponLevel(undefined);
    setSlotIconMap({});
    setSlotInheritedMap({});
    setAdvLevelMap({});
    setCharItemLevel(null);

    try {
      const equipment = await fetchEquipment(normalizedName);
      const nextArmorMap: Partial<Record<ArmorSlot | '완갑', number>> = {};
      const nextIconMap: Partial<Record<SlotName, string>> = {};
      const nextInheritedMap: Partial<Record<SlotName, boolean>> = {};
      const nextAdvLevelMap: Partial<Record<SlotName, number>> = {};

      for (const item of equipment) {
        if ((ARMOR_SLOTS as readonly string[]).includes(item.Type)) {
          const slot = item.Type as ArmorSlot;
          nextArmorMap[slot] = parseEnhLevel(item.Name);
          if (item.Icon) nextIconMap[slot] = item.Icon;
          const { isInherited, advLevel } = parseTooltipData(item.Tooltip);
          if (isInherited) nextInheritedMap[slot] = true;
          if (advLevel > 0) nextAdvLevelMap[slot] = advLevel;
        }
        if (item.Type === '완갑') {
          nextArmorMap['완갑'] = parseEnhLevel(item.Name);
          if (item.Icon) nextIconMap['완갑'] = item.Icon;
        }
        if (item.Type === '무기') {
          setWeaponLevel(parseEnhLevel(item.Name));
          if (item.Icon) nextIconMap['무기'] = item.Icon;
          const { isInherited, advLevel } = parseTooltipData(item.Tooltip);
          if (isInherited) nextInheritedMap['무기'] = true;
          if (advLevel > 0) nextAdvLevelMap['무기'] = advLevel;
        }
      }

      setArmorMap(nextArmorMap);
      setSlotIconMap(nextIconMap);
      setSlotInheritedMap(nextInheritedMap);
      setAdvLevelMap(nextAdvLevelMap);
    } catch {
      setCharError('캐릭터를 찾을 수 없습니다');
      setCharLoading(false);
      return;
    }

    try {
      const profile = await fetchProfile(normalizedName);
      const parsedItemLevel = parseFloat(profile.ItemAvgLevel.replace(/,/g, ''));
      if (!Number.isNaN(parsedItemLevel)) setCharItemLevel(parsedItemLevel);
    } catch {
      setCharItemLevel(null);
    } finally {
      setCharLoading(false);
    }
  }, []);

  const clearCharacterError = useCallback(() => setCharError(null), []);

  return {
    armorMap,
    weaponLevel,
    slotIconMap,
    slotInheritedMap,
    advLevelMap,
    charItemLevel,
    charLoading,
    charError,
    clearCharacterError,
    searchCharacter,
  };
};
