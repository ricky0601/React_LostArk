import type {
  ArkGridData,
  ArkGridEffect,
  ArkGridGem,
  ArkPassiveData,
  ArkPassiveDataEffect,
  CharacterProfile,
  EngravingData,
  EquipmentItem,
  GemData,
  GemItem,
  SiblingCharacter,
} from '../../types/lostark';
import { parseEquipmentInfo } from '../character/equipmentTooltip';
import { parseEquipmentList } from '../../utils/equipmentState';
import { parseKarmaState } from '../../utils/lopecBaseAttack';
import { stripHtml } from '../../utils/tooltipParser';
import type { CombatRole } from '../../utils/combatRole';

export type ExpeditionViewMode = 'card' | 'grid' | 'table';
export type EndpointStatus = 'idle' | 'loading' | 'success' | 'error';

export interface EndpointState<T> {
  readonly status: EndpointStatus;
  readonly data: T | null;
}

export interface ExpeditionCharacterState {
  readonly sibling: SiblingCharacter;
  readonly profile: EndpointState<CharacterProfile>;
  readonly equipment: EndpointState<EquipmentItem[]>;
  readonly arkPassive: EndpointState<ArkPassiveData>;
  readonly arkGrid: EndpointState<ArkGridData>;
  readonly gems: EndpointState<GemData>;
  readonly engravings: EndpointState<EngravingData>;
  readonly expanded: boolean;
}

export interface EquipmentCell {
  readonly label: string;
  readonly name: string | null;
  readonly icon: string | null;
  readonly grade: string | null;
  readonly normalLevel: number | null;
  readonly advancedLevel: number | null;
  readonly quality: number | null;
}

const EQUIPMENT_COLUMNS = [
  ['weapon', '무기'],
  ['helmet', '투구'],
  ['shoulder', '어깨'],
  ['armor', '상의'],
  ['pants', '하의'],
  ['gloves', '장갑'],
  ['armlet', '완갑'],
] as const;

export const createEndpointState = <T>(): EndpointState<T> => ({ status: 'idle', data: null });

export const createCharacterState = (sibling: SiblingCharacter): ExpeditionCharacterState => ({
  sibling,
  profile: createEndpointState<CharacterProfile>(),
  equipment: createEndpointState<EquipmentItem[]>(),
  arkPassive: createEndpointState<ArkPassiveData>(),
  arkGrid: createEndpointState<ArkGridData>(),
  gems: createEndpointState<GemData>(),
  engravings: createEndpointState<EngravingData>(),
  expanded: false,
});

export const parseItemLevel = (level: string): number => Number(level.replace(/,/g, '')) || 0;

export const isBoundGem = (gem: GemItem): boolean => /\(귀속\)/.test(stripHtml(gem.Name));

const equipmentCellsCache = new WeakMap<readonly EquipmentItem[], EquipmentCell[]>();

export const equipmentCells = (items: readonly EquipmentItem[] | null): EquipmentCell[] => {
  const cached = items ? equipmentCellsCache.get(items) : undefined;
  if (cached) return cached;

  const parsed = parseEquipmentList(items ? [...items] : []);
  const cells = EQUIPMENT_COLUMNS.map(([slot, label]) => {
    const equipment = parsed[slot];
    const isMissingArmlet = slot === 'armlet' && !items?.some((item) => item.Type === '완갑');
    const raw = isMissingArmlet ? null : equipment?.raw ?? null;
    const info = raw ? parseEquipmentInfo(raw.Name, raw.Tooltip) : null;
    return {
      label,
      name: raw?.Name ?? null,
      icon: raw?.Icon || null,
      grade: raw?.Grade ?? null,
      normalLevel: raw ? equipment?.normalLevel ?? null : null,
      advancedLevel: slot === 'armlet' ? null : equipment?.advancedLevel ?? null,
      quality: info?.quality ?? null,
    };
  });
  if (items) equipmentCellsCache.set(items, cells);
  return cells;
};

export const formatKarma = (data: ArkPassiveData | null): string => {
  const values = ['진화', '깨달음', '도약'].map((name) => {
    const karma = parseKarmaState(data ?? undefined, name);
    return karma ? `${name} ${karma.rank}R/${karma.level}` : null;
  }).filter((value): value is string => value !== null);
  return values.length > 0 ? values.join(' · ') : '-';
};

export interface ArkPassiveNodeSummary {
  readonly tier: number | null;
  readonly name: string;
  readonly level: number | null;
}

export const parseArkPassiveNode = (effect: ArkPassiveDataEffect): ArkPassiveNodeSummary => {
  const category = stripHtml(effect.Name).replace(/\s+/g, ' ').trim();
  const description = stripHtml(effect.Description).replace(/\s+/g, ' ').trim();
  const nodeText = description.startsWith(category) ? description.slice(category.length).trim() : description;
  const leveledMatch = nodeText.match(/^(\d+)티어\s+(.+)\s+Lv\.(\d+)$/);
  if (leveledMatch) {
    return { tier: Number(leveledMatch[1]), name: leveledMatch[2], level: Number(leveledMatch[3]) };
  }

  const tierMatch = nodeText.match(/^(\d+)티어\s+(.+)$/);
  return {
    tier: tierMatch ? Number(tierMatch[1]) : null,
    name: (tierMatch?.[2] ?? nodeText) || category,
    level: effect.Level ?? null,
  };
};

const DEALER_ARK_GRID_EFFECT_ORDER = ['공격력', '추가 피해', '보스 피해', '낙인력', '아군 공격 강화', '아군 피해 강화'];
const SUPPORT_ARK_GRID_EFFECT_ORDER = ['낙인력', '아군 공격 강화', '아군 피해 강화', '공격력', '추가 피해', '보스 피해'];
const DEALER_ARK_GRID_HIGHLIGHTS = new Set(DEALER_ARK_GRID_EFFECT_ORDER.slice(0, 3));
const SUPPORT_ARK_GRID_HIGHLIGHTS = new Set(SUPPORT_ARK_GRID_EFFECT_ORDER.slice(0, 3));

const cleanArkGridEffectName = (name: string): string => stripHtml(name).replace(/\s+/g, ' ').trim();

export const sortArkGridEffects = (effects: readonly ArkGridEffect[], role: CombatRole): ArkGridEffect[] => {
  const order = role === 'dealer'
    ? DEALER_ARK_GRID_EFFECT_ORDER
    : role === 'support' ? SUPPORT_ARK_GRID_EFFECT_ORDER : null;
  if (!order) return [...effects];

  return effects
    .map((effect, index) => ({ effect, index }))
    .sort((left, right) => {
      const leftOrder = order.indexOf(cleanArkGridEffectName(left.effect.Name));
      const rightOrder = order.indexOf(cleanArkGridEffectName(right.effect.Name));
      const leftPriority = leftOrder === -1 ? order.length : leftOrder;
      const rightPriority = rightOrder === -1 ? order.length : rightOrder;
      return leftPriority - rightPriority || left.index - right.index;
    })
    .map(({ effect }) => effect);
};

export const isPrimaryArkGridEffect = (name: string, role: CombatRole): boolean => {
  const normalizedName = cleanArkGridEffectName(name);
  if (role === 'dealer') return DEALER_ARK_GRID_HIGHLIGHTS.has(normalizedName);
  if (role === 'support') return SUPPORT_ARK_GRID_HIGHLIGHTS.has(normalizedName);
  return false;
};

export const formatArkGrid = (data: ArkGridData | null): string => {
  const slots = data?.Slots ?? [];
  const effects = data?.Effects ?? [];
  if (slots.length === 0 && effects.length === 0) return '-';
  const point = slots.reduce((sum, slot) => sum + slot.Point, 0);
  const effectText = effects.map((effect) => `${effect.Name} Lv.${effect.Level}`).join(', ');
  return [`${slots.length}코어 ${point}P`, effectText].filter(Boolean).join(' · ');
};

export interface ArkGridGemTooltipData {
  readonly name: string;
  readonly grade: string;
  readonly willpower: number | null;
  readonly pointLabel: string | null;
  readonly point: number | null;
  readonly effects: readonly { readonly name: string; readonly level: number }[];
}

export const parseArkGridGemTooltip = (gem: ArkGridGem): ArkGridGemTooltipData => {
  let name = '';
  try {
    const parsed: unknown = JSON.parse(gem.Tooltip);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const nameElement = Object.values(parsed as Record<string, unknown>).find((element) =>
        element && typeof element === 'object' && 'type' in element && element.type === 'NameTagBox');
      if (nameElement && typeof nameElement === 'object' && 'value' in nameElement && typeof nameElement.value === 'string') {
        name = stripHtml(nameElement.value).replace(/\s+/g, ' ').trim();
      }
    }
  } catch {
    // The grade still provides a useful fallback for malformed tooltips.
  }

  const text = stripHtml(gem.Tooltip).replace(/\s+/g, ' ');
  const willpower = text.match(/필요\s*의지력\s*:\s*(\d+)/)?.[1];
  const point = text.match(/((?:질서|혼돈)\s*포인트)\s*:\s*(\d+)/);
  const effects = Array.from(text.matchAll(/\[([^\]]+)]\s*Lv\.(\d+)/g))
    .map((match) => ({ name: match[1], level: Number(match[2]) }));

  return {
    name: name || '아크 그리드 젬',
    grade: gem.Grade,
    willpower: willpower ? Number(willpower) : null,
    pointLabel: point?.[1] ?? null,
    point: point ? Number(point[2]) : null,
    effects,
  };
};

export const formatArkGridGemTooltip = (gem: ArkGridGem): string => {
  const data = parseArkGridGemTooltip(gem);
  return [
    `${data.name} (${data.grade})`,
    data.willpower === null ? null : `필요 의지력 ${data.willpower}`,
    data.pointLabel && data.point !== null ? `${data.pointLabel} ${data.point}` : null,
    data.effects.length > 0 ? data.effects.map((effect) => `${effect.name} Lv.${effect.level}`).join(', ') : null,
  ].filter((value): value is string => value !== null).join(' · ');
};

export const endpointText = <T>(state: EndpointState<T>, formatter: (data: T) => string): string => {
  if (state.status === 'loading' || state.status === 'idle') return '불러오는 중';
  if (state.status === 'error') return '조회 실패';
  return state.data ? formatter(state.data) : '-';
};
