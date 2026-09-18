export interface RaidSynergyEffect {
  readonly category: string;
  readonly generalRate: number;
  readonly directionalRate: number;
  readonly estimated: boolean;
  readonly sourceId: 'community-synergy-efficiency' | 'community-synergy-2026-01-26';
}

const EFFICIENCY_SOURCE = 'community-synergy-efficiency' as const;
const CURRENT_SYNERGY_SOURCE = 'community-synergy-2026-01-26' as const;

const EFFECTS: Readonly<Record<string, RaidSynergyEffect>> = {
  '피해 증가': { category: 'damage', generalRate: 0.06, directionalRate: 0, estimated: false, sourceId: EFFICIENCY_SOURCE },
  '받는 피해 증가': { category: 'damage', generalRate: 0.06, directionalRate: 0, estimated: false, sourceId: EFFICIENCY_SOURCE },
  '공격력 증가': { category: 'attack-power', generalRate: 0.06, directionalRate: 0, estimated: false, sourceId: EFFICIENCY_SOURCE },
  // 방어력 감소 12%의 피해 기댓값을 약 6%로 환산한다.
  '방어력 감소': { category: 'armor-reduction', generalRate: 0.06, directionalRate: 0, estimated: true, sourceId: EFFICIENCY_SOURCE },
  // 실제 효율은 캐릭터의 치적·치피에 따라 달라져 보수적인 6% 환산값을 사용한다.
  '치명타 적중률 증가': { category: 'critical-rate', generalRate: 0.06, directionalRate: 0, estimated: true, sourceId: EFFICIENCY_SOURCE },
  '치명타 확률 증가': { category: 'critical-rate', generalRate: 0.06, directionalRate: 0, estimated: true, sourceId: EFFICIENCY_SOURCE },
  '치명타 피해 증가': { category: 'critical-damage', generalRate: 0.06, directionalRate: 0, estimated: true, sourceId: EFFICIENCY_SOURCE },
  '헤드·백어택 피해 증가': {
    category: 'directional-damage', generalRate: 0.04, directionalRate: 0.05, estimated: false, sourceId: CURRENT_SYNERGY_SOURCE,
  },
  '백/헤드 어택 피해 증가': {
    category: 'directional-damage', generalRate: 0.04, directionalRate: 0.05, estimated: false, sourceId: CURRENT_SYNERGY_SOURCE,
  },
  '무력화 피해 증가': { category: 'stagger', generalRate: 0, directionalRate: 0, estimated: false, sourceId: CURRENT_SYNERGY_SOURCE },
};

export const resolveRaidSynergyEffect = (name: string): RaidSynergyEffect | null => EFFECTS[name] ?? null;
