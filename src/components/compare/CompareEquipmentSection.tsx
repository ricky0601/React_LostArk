import React, { useState } from 'react';
import type { EquipmentItem } from '../../types/lostark';
import { qualityTextColor } from '../../utils/equipmentColors';
import GlassCard from '../GlassCard';
import { ACCESSORY_SLOTS, ARMOR_SLOTS, EXTRA_SLOTS, findEquipBySlots, parseQuality } from './compareModel';
import { EquipmentRow, SectionHeader } from './ComparePrimitives';

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
          <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            방어구
          </h3>
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
          <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            악세서리
          </h3>
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

export default EquipmentSection;
