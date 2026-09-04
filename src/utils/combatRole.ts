import type { ArkPassiveData } from '../types/lostark';

export type CombatRole = 'dealer' | 'support' | 'unknown';

export interface CombatRoleResolution {
  readonly role: CombatRole;
  readonly reason?: string;
}

const SUPPORT_TITLES: Readonly<Record<string, string>> = {
  바드: '절실한 구원',
  홀리나이트: '축복의 오라',
  도화가: '만개',
  발키리: '해방자',
};

export const resolveCombatRole = (
  characterClassName: string,
  arkPassive: ArkPassiveData | null | undefined,
): CombatRoleResolution => {
  const supportTitle = SUPPORT_TITLES[characterClassName];
  if (!supportTitle) return { role: 'dealer' };
  if (!arkPassive) {
    return { role: 'unknown', reason: '아크 패시브 정보를 조회하지 못했습니다.' };
  }
  if (!arkPassive.IsArkPassive) {
    return { role: 'unknown', reason: '아크 패시브가 비활성화되어 역할을 판별할 수 없습니다.' };
  }
  const title = arkPassive.Title?.trim();
  if (!title) {
    return { role: 'unknown', reason: '아크 패시브 타이틀이 없어 역할을 판별할 수 없습니다.' };
  }
  return { role: title === supportTitle ? 'support' : 'dealer' };
};
