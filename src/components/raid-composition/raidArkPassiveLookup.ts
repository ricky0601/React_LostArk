import { resolveRaidBuild, type RaidBuildResolution } from '../../data/raidBuildPositions';
import { fetchArkPassive, fetchProfile } from '../../utils/api';

export interface RaidArkPassiveLookupResult extends RaidBuildResolution {
  readonly nickname: string;
  readonly className: string;
  readonly combatPower: number | null;
}

export class RaidArkPassiveLookupError extends Error {}

class RaidArkPassiveCandidateError extends RaidArkPassiveLookupError {}

export const parseRaidCombatPower = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const lookupCache = new Map<string, RaidArkPassiveLookupResult>();
interface InFlightLookup {
  readonly signal: AbortSignal | undefined;
  readonly promise: Promise<RaidArkPassiveLookupResult>;
}

const inFlightLookups = new Map<string, InFlightLookup>();
let lookupCacheGeneration = 0;
const MAX_OCR_CANDIDATE_LOOKUPS = 8;

export const lookupRaidArkPassive = (
  nickname: string,
  recognizedClassName: string,
  signal?: AbortSignal,
): Promise<RaidArkPassiveLookupResult> => {
  const key = `${nickname}:${recognizedClassName}`;
  const cached = lookupCache.get(key);
  if (cached) return Promise.resolve(cached);
  const inFlight = inFlightLookups.get(key);
  if (inFlight && inFlight.signal === signal) return inFlight.promise;
  const cacheGeneration = lookupCacheGeneration;

  const request = fetchProfile(nickname, { signal })
    .then(async (profile) => {
      if (!profile) {
        throw new RaidArkPassiveCandidateError('캐릭터를 찾을 수 없습니다. 닉네임을 확인해 주세요.');
      }
      if (profile.CharacterClassName !== recognizedClassName) {
        throw new RaidArkPassiveCandidateError(
          `API 직업(${profile.CharacterClassName})이 화면 인식 직업(${recognizedClassName})과 다릅니다.`,
        );
      }
      const arkPassive = await fetchArkPassive(nickname, { signal });
      if (!arkPassive) {
        throw new RaidArkPassiveLookupError('아크패시브 정보를 찾을 수 없습니다.');
      }
      if (!arkPassive.IsArkPassive || !arkPassive.Title?.trim()) {
        throw new RaidArkPassiveLookupError('아크패시브 타이틀을 확인할 수 없습니다.');
      }
      const result = {
        nickname,
        className: recognizedClassName,
        combatPower: parseRaidCombatPower(profile.CombatPower),
        ...resolveRaidBuild(recognizedClassName, arkPassive.Title),
      };
      if (cacheGeneration === lookupCacheGeneration) lookupCache.set(key, result);
      return result;
    })
    .finally(() => {
      if (inFlightLookups.get(key)?.promise === request) inFlightLookups.delete(key);
    });
  inFlightLookups.set(key, { signal, promise: request });
  return request;
};

export const lookupRaidArkPassiveCandidates = async (
  candidates: readonly string[],
  recognizedClassName: string,
  signal?: AbortSignal,
): Promise<RaidArkPassiveLookupResult> => {
  let lastError: unknown = new RaidArkPassiveLookupError('인식된 닉네임이 없습니다.');
  for (const nickname of Array.from(new Set(candidates)).slice(0, MAX_OCR_CANDIDATE_LOOKUPS)) {
    try {
      return await lookupRaidArkPassive(nickname, recognizedClassName, signal);
    } catch (error) {
      if (!(error instanceof RaidArkPassiveCandidateError)) throw error;
      lastError = error;
    }
  }
  throw lastError;
};

export const clearRaidArkPassiveLookupCache = (): void => {
  lookupCacheGeneration += 1;
  lookupCache.clear();
  inFlightLookups.clear();
};
