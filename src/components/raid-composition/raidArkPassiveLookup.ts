import { resolveRaidBuild, type RaidBuildResolution } from '../../data/raidBuildPositions';
import { fetchArkPassive, fetchProfile } from '../../utils/api';

export interface RaidArkPassiveLookupResult extends RaidBuildResolution {
  readonly nickname: string;
  readonly className: string;
}

export class RaidArkPassiveLookupError extends Error {}

const lookupCache = new Map<string, Promise<RaidArkPassiveLookupResult>>();

export const lookupRaidArkPassive = (
  nickname: string,
  recognizedClassName: string,
): Promise<RaidArkPassiveLookupResult> => {
  const key = `${nickname}:${recognizedClassName}`;
  const cached = lookupCache.get(key);
  if (cached) return cached;

  let request!: Promise<RaidArkPassiveLookupResult>;
  request = fetchProfile(nickname)
    .then(async (profile) => {
      if (!profile) {
        throw new RaidArkPassiveLookupError('캐릭터를 찾을 수 없습니다. 닉네임을 확인해 주세요.');
      }
      if (profile.CharacterClassName !== recognizedClassName) {
        throw new RaidArkPassiveLookupError(
          `API 직업(${profile.CharacterClassName})이 화면 인식 직업(${recognizedClassName})과 다릅니다.`,
        );
      }
      const arkPassive = await fetchArkPassive(nickname);
      if (!arkPassive) {
        throw new RaidArkPassiveLookupError('아크패시브 정보를 찾을 수 없습니다.');
      }
      if (!arkPassive.IsArkPassive || !arkPassive.Title?.trim()) {
        throw new RaidArkPassiveLookupError('아크패시브 타이틀을 확인할 수 없습니다.');
      }
      return {
        nickname,
        className: recognizedClassName,
        ...resolveRaidBuild(recognizedClassName, arkPassive.Title),
      };
    })
    .catch((error: unknown) => {
      if (lookupCache.get(key) === request) lookupCache.delete(key);
      throw error;
    });
  lookupCache.set(key, request);
  return request;
};

export const lookupRaidArkPassiveCandidates = async (
  candidates: readonly string[],
  recognizedClassName: string,
): Promise<RaidArkPassiveLookupResult> => {
  let lastError: unknown = new RaidArkPassiveLookupError('인식된 닉네임이 없습니다.');
  for (const nickname of Array.from(new Set(candidates)).slice(0, 4)) {
    try {
      return await lookupRaidArkPassive(nickname, recognizedClassName);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

export const clearRaidArkPassiveLookupCache = (): void => lookupCache.clear();
