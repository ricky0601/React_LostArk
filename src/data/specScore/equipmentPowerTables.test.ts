import {
  ARMLET_POWER_BY_LEVEL,
  ARMLET_UNEQUIPPED_LEVEL,
  EGIR_ARMOR_STAT_DELTA_BY_SLOT,
  EGIR_WEAPON_ATTACK_DELTA_BY_LEVEL,
  SERKA_ARMOR_STAT_DELTA_BY_SLOT,
  SERKA_WEAPON_ATTACK_DELTA_BY_LEVEL,
} from './equipmentPowerTables';

describe('equipment power tables', () => {
  it('exports armlet power tables from the equipment table barrel', () => {
    // Given: armlet power is equipment data, not a Lopec coefficient.
    // When: the equipment table barrel is imported.
    // Then: callers can reuse the armlet table through that barrel.
    expect(ARMLET_POWER_BY_LEVEL[ARMLET_UNEQUIPPED_LEVEL]).toBeDefined();
    expect(ARMLET_POWER_BY_LEVEL[25]).toBeDefined();
  });

  it('keeps Serka weapon attack deltas by target reinforcement level', () => {
    // Given: manually captured Serka weapon attack increase rows.
    // When: key target reinforcement levels are read.
    // Then: the stored deltas match the source rows used for combat-power simulation.
    expect(SERKA_WEAPON_ATTACK_DELTA_BY_LEVEL[1]).toBe(3266);
    expect(SERKA_WEAPON_ATTACK_DELTA_BY_LEVEL[17]).toBe(4831);
    expect(SERKA_WEAPON_ATTACK_DELTA_BY_LEVEL[22]).toBe(5466);
    expect(SERKA_WEAPON_ATTACK_DELTA_BY_LEVEL[25]).toBe(5887);
  });

  it('keeps Egir weapon attack deltas by target normal reinforcement level', () => {
    // Given: manually captured Egir weapon normal-honing increase rows.
    // When: key target reinforcement levels are read.
    // Then: the stored deltas match the source rows and remain separate from advanced honing.
    expect(EGIR_WEAPON_ATTACK_DELTA_BY_LEVEL[1]).toBe(2058);
    expect(EGIR_WEAPON_ATTACK_DELTA_BY_LEVEL[7]).toBe(2618);
    expect(EGIR_WEAPON_ATTACK_DELTA_BY_LEVEL[18]).toBe(3823);
    expect(EGIR_WEAPON_ATTACK_DELTA_BY_LEVEL[22]).toBe(4387);
    expect(EGIR_WEAPON_ATTACK_DELTA_BY_LEVEL[25]).toBe(4864);
  });

  it('keeps Egir armor tooltip stat deltas by target normal reinforcement level', () => {
    // Given: manually captured Egir armor normal-honing increase rows.
    // When: representative rows from each armor slot are read.
    // Then: the stored deltas match source rows and stay separate from advanced honing.
    expect(EGIR_ARMOR_STAT_DELTA_BY_SLOT.helmet?.[18]).toEqual({
      health: 136,
      mainStat: 2061,
      magicDefense: 135,
      physicalDefense: 121,
    });
    expect(EGIR_ARMOR_STAT_DELTA_BY_SLOT.shoulder?.[25]).toEqual({
      health: 139,
      mainStat: 2989,
      magicDefense: 141,
      physicalDefense: 158,
    });
    expect(EGIR_ARMOR_STAT_DELTA_BY_SLOT.armor?.[1]).toEqual({
      health: 129,
      mainStat: 890,
      magicDefense: 107,
      physicalDefense: 116,
    });
    expect(EGIR_ARMOR_STAT_DELTA_BY_SLOT.pants?.[22]).toEqual({
      health: 166,
      mainStat: 2044,
      magicDefense: 173,
      physicalDefense: 159,
    });
    expect(EGIR_ARMOR_STAT_DELTA_BY_SLOT.gloves?.[25]).toEqual({
      health: 107,
      mainStat: 3371,
      magicDefense: 126,
      physicalDefense: 126,
    });
  });

  it('keeps Serka helmet tooltip stat deltas by target reinforcement level', () => {
    // Given: manually captured Serka helmet tooltip increase rows.
    // When: key target reinforcement levels are read.
    // Then: the stored main-stat and health deltas match the source rows.
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.helmet?.[16]).toEqual({
      health: 175,
      mainStat: 3159,
      magicDefense: 171,
      physicalDefense: 154,
    });
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.helmet?.[17]).toEqual({
      health: 151,
      mainStat: 2793,
      magicDefense: 129,
      physicalDefense: 116,
    });
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.helmet?.[25]).toEqual({
      health: 169,
      mainStat: 3400,
      magicDefense: 143,
      physicalDefense: 129,
    });
  });

  it('keeps Serka shoulder tooltip stat deltas by target reinforcement level', () => {
    // Given: manually captured Serka shoulder tooltip increase rows.
    // When: key target reinforcement levels are read.
    // Then: the stored main-stat and defense deltas match the source rows.
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.shoulder?.[7]).toEqual({
      health: 129,
      mainStat: 2468,
      magicDefense: 133,
      physicalDefense: 146,
    });
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.shoulder?.[17]).toEqual({
      health: 131,
      mainStat: 2971,
      magicDefense: 116,
      physicalDefense: 129,
    });
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.shoulder?.[25]).toEqual({
      health: 146,
      mainStat: 3618,
      magicDefense: 129,
      physicalDefense: 143,
    });
  });

  it('keeps Serka chest tooltip stat deltas by target reinforcement level', () => {
    // Given: manually captured Serka chest tooltip increase rows.
    // When: key target reinforcement levels are read.
    // Then: the stored main-stat and defense deltas match the source rows.
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.armor?.[7]).toEqual({
      health: 198,
      mainStat: 1854,
      magicDefense: 162,
      physicalDefense: 176,
    });
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.armor?.[17]).toEqual({
      health: 202,
      mainStat: 2233,
      magicDefense: 141,
      physicalDefense: 154,
    });
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.armor?.[25]).toEqual({
      health: 225,
      mainStat: 2720,
      magicDefense: 156,
      physicalDefense: 171,
    });
  });

  it('keeps Serka pants tooltip stat deltas by target reinforcement level', () => {
    // Given: manually captured Serka pants tooltip increase rows.
    // When: key target reinforcement levels are read.
    // Then: the stored main-stat and defense deltas match the source rows.
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.pants?.[7]).toEqual({
      health: 169,
      mainStat: 2003,
      magicDefense: 176,
      physicalDefense: 162,
    });
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.pants?.[17]).toEqual({
      health: 171,
      mainStat: 2414,
      magicDefense: 154,
      physicalDefense: 141,
    });
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.pants?.[25]).toEqual({
      health: 191,
      mainStat: 2938,
      magicDefense: 171,
      physicalDefense: 156,
    });
  });

  it('keeps Serka gloves tooltip stat deltas by target reinforcement level', () => {
    // Given: manually captured Serka gloves tooltip increase rows.
    // When: key target reinforcement levels are read.
    // Then: the stored main-stat and defense deltas match the source rows.
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.gloves?.[7]).toEqual({
      health: 99,
      mainStat: 2781,
      magicDefense: 117,
      physicalDefense: 117,
    });
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.gloves?.[17]).toEqual({
      health: 101,
      mainStat: 3350,
      magicDefense: 102,
      physicalDefense: 102,
    });
    expect(SERKA_ARMOR_STAT_DELTA_BY_SLOT.gloves?.[25]).toEqual({
      health: 112,
      mainStat: 4088,
      magicDefense: 114,
      physicalDefense: 114,
    });
  });
});
