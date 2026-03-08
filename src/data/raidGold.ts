/**
 * 로스트아크 레이드 골드 데이터 (2025년 12월 패치 기준)
 *
 * - T4 레이드: 거래 가능 골드 (일부 싱글/노말은 귀속)
 * - 주당 캐릭터당 최대 3개 레이드 골드 획득 가능
 * - 계정당 최대 6캐릭터 골드 획득 가능
 * - 아크 그리드 코어: 4막(아르모체) 이상 레이드에서 획득, 더보기 시 동일 수량 추가
 */

export interface RaidGate {
    gate: number;
    gold: number;
    bonusCost: number; // 더보기 비용
    coreReward: number; // 아크 그리드 코어 (클리어 보상, 더보기 시 동일 수량 추가)
}

export interface RaidDifficulty {
    difficulty: string;
    requiredLevel: number;
    gates: RaidGate[];
    totalGold: number;
    isBound: boolean;
    /** 귀속 골드량 (미지정 시 isBound ? totalGold : 0). 절반 귀속이면 totalGold/2 */
    boundGold?: number;
}

export interface Raid {
    name: string;
    tier: 4 | 3;
    difficulties: RaidDifficulty[];
}

export interface SelectedRaidGate {
    gate: number;
    gold: number;
    bonusCost: number;
    coreReward: number;
}

export interface SelectedRaid {
    raidName: string;
    difficulty: string;
    totalGold: number;
    isBound: boolean;
    /** 귀속 골드량. 거래가능 = totalGold - boundGold */
    boundGold: number;
    gates: SelectedRaidGate[];
    /** 입장 필요 레벨 (레벨 미달 표시용) */
    requiredLevel?: number;
}

export interface CharacterGoldResult {
    characterName: string;
    characterClass: string;
    itemLevel: number;
    characterImage: string;
    /** 골드 적용 레이드 3개 (기본: 골드 높은 순 상위 3개) */
    selectedRaids: SelectedRaid[];
    /** 참여 가능한 전체 레이드 (다른 레이드로 변경 시 선택지) */
    availableRaids: SelectedRaid[];
    totalGold: number;
    isGoldEarner: boolean; // top 6 characters
}

export const MAX_GOLD_RAIDS_PER_CHARACTER = 3;
export const MAX_GOLD_CHARACTERS = 6;

/** 테이블 헤더용: 레이드별 난이도 1개씩, 골드 높은 순 */
export interface RaidColumn {
    raidName: string;
    difficulty: string;
    requiredLevel: number;
    totalGold: number;
}

export const RAIDS: Raid[] = [
    // === T4 카제로스 레이드 (종막 → 서막 순서) ===
    {
        name: '지평의 성당 (어비스)',
        tier: 4,
        difficulties: [
            {
                difficulty: '1750',
                requiredLevel: 1750,
                gates: [
                    { gate: 1, gold: 20000, bonusCost: 6400, coreReward: 3 },
                    { gate: 2, gold: 30000, bonusCost: 9600, coreReward: 3 },
                ],
                totalGold: 50000,
                isBound: false,
                boundGold: 50000,
            },
            {
                difficulty: '1720',
                requiredLevel: 1720,
                gates: [
                    { gate: 1, gold: 16000, bonusCost: 5120, coreReward: 2 },
                    { gate: 2, gold: 24000, bonusCost: 7680, coreReward: 2 },
                ],
                totalGold: 40000,
                isBound: false,
                boundGold: 40000,
            },
            {
                difficulty: '1700',
                requiredLevel: 1700,
                gates: [
                    { gate: 1, gold: 13500, bonusCost: 4320, coreReward: 2 },
                    { gate: 2, gold: 16500, bonusCost: 5280, coreReward: 2 },
                ],
                totalGold: 30000,
                isBound: false,
                boundGold: 30000,
            }
        ]
    },
    {
        name: '세르카 (그림자)',
        tier: 4,
        difficulties: [
            {
                difficulty: '나이트메어',
                requiredLevel: 1740,
                gates: [
                    { gate: 1, gold: 21000, bonusCost: 6720, coreReward: 3 },
                    { gate: 2, gold: 33000, bonusCost: 10560, coreReward: 3 },
                ],
                totalGold: 54000,
                isBound: false,
            },
            {
                difficulty: '하드',
                requiredLevel: 1730,
                gates: [
                    { gate: 1, gold: 17500, bonusCost: 5600, coreReward: 2 },
                    { gate: 2, gold: 26500, bonusCost: 8480, coreReward: 2 },
                ],
                totalGold: 44000,
                isBound: false,
            },
            {
                difficulty: '노말',
                requiredLevel: 1710,
                gates: [
                    { gate: 1, gold: 14000, bonusCost: 4480, coreReward: 2 },
                    { gate: 2, gold: 21000, bonusCost: 6720, coreReward: 2 },
                ],
                totalGold: 35000,
                isBound: false,
            },
        ],
    },
    {
        name: '카제로스 (종막)',
        tier: 4,
        difficulties: [
            {
                difficulty: '하드',
                requiredLevel: 1730,
                gates: [
                    { gate: 1, gold: 17000, bonusCost: 5440, coreReward: 2 },
                    { gate: 2, gold: 35000, bonusCost: 11200, coreReward: 2 },
                ],
                totalGold: 52000,
                isBound: false,
            },
            {
                difficulty: '노말',
                requiredLevel: 1710,
                gates: [
                    { gate: 1, gold: 14000, bonusCost: 4480, coreReward: 2 },
                    { gate: 2, gold: 26000, bonusCost: 8320, coreReward: 2 },
                ],
                totalGold: 40000,
                isBound: false,
            },
        ],
    },
    {
        name: '아르모체 (4막)',
        tier: 4,
        difficulties: [
            {
                difficulty: '하드',
                requiredLevel: 1720,
                gates: [
                    { gate: 1, gold: 15000, bonusCost: 4800, coreReward: 1 },
                    { gate: 2, gold: 27000, bonusCost: 8640, coreReward: 1 },
                ],
                totalGold: 42000,
                isBound: false,
            },
            {
                difficulty: '노말',
                requiredLevel: 1700,
                gates: [
                    { gate: 1, gold: 12500, bonusCost: 4000, coreReward: 1 },
                    { gate: 2, gold: 20500, bonusCost: 6560, coreReward: 1 },
                ],
                totalGold: 33000,
                isBound: false,
            },
        ],
    },
    {
        name: '모르둠 (3막)',
        tier: 4,
        difficulties: [
            {
                difficulty: '하드',
                requiredLevel: 1700,
                gates: [
                    { gate: 1, gold: 5000, bonusCost: 1650, coreReward: 0 },
                    { gate: 2, gold: 8000, bonusCost: 2640, coreReward: 0 },
                    { gate: 3, gold: 14000, bonusCost: 4060, coreReward: 0 },
                ],
                totalGold: 27000,
                isBound: false,
            },
            {
                difficulty: '노말',
                requiredLevel: 1680,
                gates: [
                    { gate: 1, gold: 4000, bonusCost: 1300, coreReward: 0 },
                    { gate: 2, gold: 7000, bonusCost: 2350, coreReward: 0 },
                    { gate: 3, gold: 10000, bonusCost: 3360, coreReward: 0 },
                ],
                totalGold: 21000,
                isBound: false,
            },
            {
                difficulty: '싱글',
                requiredLevel: 1680,
                gates: [
                    { gate: 1, gold: 4000, bonusCost: 1300, coreReward: 0 },
                    { gate: 2, gold: 7000, bonusCost: 2350, coreReward: 0 },
                    { gate: 3, gold: 10000, bonusCost: 3360, coreReward: 0 },
                ],
                totalGold: 21000,
                isBound: false,
                boundGold: 10500,
            },
        ],
    },
    {
        name: '아브렐슈드 (2막)',
        tier: 4,
        difficulties: [
            {
                difficulty: '하드',
                requiredLevel: 1690,
                gates: [
                    { gate: 1, gold: 7500, bonusCost: 2400, coreReward: 0 },
                    { gate: 2, gold: 15500, bonusCost: 5100, coreReward: 0 },
                ],
                totalGold: 23000,
                isBound: false,
            },
            {
                difficulty: '노말',
                requiredLevel: 1670,
                gates: [
                    { gate: 1, gold: 5500, bonusCost: 1820, coreReward: 0 },
                    { gate: 2, gold: 11000, bonusCost: 3720, coreReward: 0 },
                ],
                totalGold: 16500,
                isBound: false,
            },
            {
                difficulty: '싱글',
                requiredLevel: 1670,
                gates: [
                    { gate: 1, gold: 5500, bonusCost: 1820, coreReward: 0 },
                    { gate: 2, gold: 11000, bonusCost: 3720, coreReward: 0 },
                ],
                totalGold: 16500,
                isBound: false,
                boundGold: 8250,
            },
        ],
    },
    {
        name: '에기르 (1막)',
        tier: 4,
        difficulties: [
            {
                difficulty: '하드',
                requiredLevel: 1680,
                gates: [
                    { gate: 1, gold: 5500, bonusCost: 1820, coreReward: 0 },
                    { gate: 2, gold: 12500, bonusCost: 4150, coreReward: 0 },
                ],
                totalGold: 18000,
                isBound: false,
            },
            {
                difficulty: '노말',
                requiredLevel: 1660,
                gates: [
                    { gate: 1, gold: 3500, bonusCost: 750, coreReward: 0 },
                    { gate: 2, gold: 8000, bonusCost: 1780, coreReward: 0 },
                ],
                totalGold: 11500,
                isBound: false,
            },
            {
                difficulty: '싱글',
                requiredLevel: 1660,
                gates: [
                    { gate: 1, gold: 3500, bonusCost: 750, coreReward: 0 },
                    { gate: 2, gold: 8000, bonusCost: 1780, coreReward: 0 },
                ],
                totalGold: 11500,
                isBound: false,
                boundGold: 5750,
            },
        ],
    },
    {
        name: '에키드나 (서막)',
        tier: 4,
        difficulties: [
            {
                difficulty: '하드',
                requiredLevel: 1640,
                gates: [
                    { gate: 1, gold: 2200, bonusCost: 720, coreReward: 0 },
                    { gate: 2, gold: 5000, bonusCost: 1630, coreReward: 0 },
                ],
                totalGold: 7200,
                isBound: false,
            },
            {
                difficulty: '노말',
                requiredLevel: 1620,
                gates: [
                    { gate: 1, gold: 1900, bonusCost: 310, coreReward: 0 },
                    { gate: 2, gold: 4200, bonusCost: 700, coreReward: 0 },
                ],
                totalGold: 6100,
                isBound: true,
            },
            {
                difficulty: '싱글',
                requiredLevel: 1610,
                gates: [
                    { gate: 1, gold: 1900, bonusCost: 310, coreReward: 0 },
                    { gate: 2, gold: 4200, bonusCost: 700, coreReward: 0 },
                ],
                totalGold: 6100,
                isBound: false,
                boundGold: 3050,
            },
        ],
    },
    {
        name: '베히모스',
        tier: 4,
        difficulties: [
            {
                difficulty: '노말',
                requiredLevel: 1640,
                gates: [
                    { gate: 1, gold: 2200, bonusCost: 3100, coreReward: 0 },
                    { gate: 2, gold: 5000, bonusCost: 4900, coreReward: 0 },
                ],
                totalGold: 7200,
                isBound: false,
            },
        ],
    },
];

/** 테이블 컬럼: 레이드별 난이도 1개씩, 골드 높은 순 */
export const RAID_COLUMNS: RaidColumn[] = (() => {
    const cols: RaidColumn[] = [];
    for (const raid of RAIDS) {
        for (const diff of raid.difficulties) {
            cols.push({
                raidName: raid.name,
                difficulty: diff.difficulty,
                requiredLevel: diff.requiredLevel,
                totalGold: diff.totalGold,
            });
        }
    }
    return cols.sort((a, b) => b.totalGold - a.totalGold);
})();

/**
 * 레이드명+난이도로 전체 레이드 데이터 반환 (레벨 미달 레이드 표시용).
 */
export function getRaidDataByKey(raidName: string, difficulty: string): SelectedRaid | null {
    for (const raid of RAIDS) {
        if (raid.name !== raidName) continue;
        for (const diff of raid.difficulties) {
            if (diff.difficulty !== difficulty) continue;
            const boundGold = diff.boundGold ?? (diff.isBound ? diff.totalGold : 0);
            return {
                raidName: raid.name,
                difficulty: diff.difficulty,
                totalGold: diff.totalGold,
                isBound: diff.isBound,
                boundGold,
                requiredLevel: diff.requiredLevel,
                gates: diff.gates.map((g) => ({
                    gate: g.gate,
                    gold: g.gold,
                    bonusCost: g.bonusCost,
                    coreReward: g.coreReward,
                })),
            };
        }
    }
    return null;
}

/**
 * 캐릭터의 아이템 레벨에 따라 참여 가능한 모든 난이도를 반환 (레이드 변경 선택지용).
 * 같은 레이드의 노말/싱글 등 여러 난이도가 모두 포함된다.
 */
function getAvailableRaids(itemLevel: number): SelectedRaid[] {
    const available: SelectedRaid[] = [];

    for (const raid of RAIDS) {
        for (const diff of raid.difficulties) {
            if (itemLevel >= diff.requiredLevel) {
                const boundGold = diff.boundGold ?? (diff.isBound ? diff.totalGold : 0);
                available.push({
                    raidName: raid.name,
                    difficulty: diff.difficulty,
                    totalGold: diff.totalGold,
                    isBound: diff.isBound,
                    boundGold,
                    requiredLevel: diff.requiredLevel,
                    gates: diff.gates.map((g) => ({
                        gate: g.gate,
                        gold: g.gold,
                        bonusCost: g.bonusCost,
                        coreReward: g.coreReward,
                    })),
                });
            }
        }
    }

    return available;
}

/**
 * 캐릭터별 최적 레이드 3개를 선택하고 골드 수입을 계산
 */
export function calculateCharacterGold(
    characterName: string,
    characterClass: string,
    itemLevelStr: string,
    characterImage: string
): CharacterGoldResult {
    const itemLevel = parseFloat(itemLevelStr.replace(/,/g, ''));
    const available = getAvailableRaids(itemLevel);

    // 기본값: 레이드당 최고 난이도 1개만 취한 뒤, 골드 높은 순 상위 3개 레이드
    const bestPerRaid = new Map<string, SelectedRaid>();
    for (const r of available) {
        const cur = bestPerRaid.get(r.raidName);
        if (!cur || cur.totalGold < r.totalGold) bestPerRaid.set(r.raidName, r);
    }
    const sorted = Array.from(bestPerRaid.values()).sort((a, b) => b.totalGold - a.totalGold);
    const selected = sorted.slice(0, MAX_GOLD_RAIDS_PER_CHARACTER);
    const totalGold = selected.reduce((sum, r) => sum + r.totalGold, 0);

    return {
        characterName,
        characterClass,
        itemLevel,
        characterImage,
        selectedRaids: selected,
        availableRaids: available,
        totalGold,
        isGoldEarner: false, // will be set later
    };
}
