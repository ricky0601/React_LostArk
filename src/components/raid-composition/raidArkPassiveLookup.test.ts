import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchArkPassive, fetchProfile } from '../../utils/api';
import {
  clearRaidArkPassiveLookupCache,
  lookupRaidArkPassive,
  lookupRaidArkPassiveCandidates,
  RaidArkPassiveLookupError,
} from './raidArkPassiveLookup';

vi.mock('../../utils/api', () => ({
  fetchProfile: vi.fn(),
  fetchArkPassive: vi.fn(),
}));

const mockedFetchProfile = vi.mocked(fetchProfile);
const mockedFetchArkPassive = vi.mocked(fetchArkPassive);

describe('lookupRaidArkPassive', () => {
  beforeEach(() => {
    clearRaidArkPassiveLookupCache();
    vi.clearAllMocks();
  });

  it('resolves the recognized class build from its ark passive title', async () => {
    mockedFetchProfile.mockResolvedValue({ CharacterClassName: '가디언나이트' } as never);
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '드레드 로어' } as never);

    await expect(lookupRaidArkPassive('비식별닉네임', '가디언나이트')).resolves.toMatchObject({
      className: '가디언나이트',
      title: '드레드 로어',
      role: 'dealer',
      position: 'entropy-head',
      needsReview: false,
    });
  });

  it('reports an invalid OCR nickname when the profile API returns null', async () => {
    mockedFetchProfile.mockResolvedValue(null as never);
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '드레드 로어' } as never);

    await expect(lookupRaidArkPassive('인식오류닉네임', '가디언나이트'))
      .rejects.toThrow('캐릭터를 찾을 수 없습니다. 닉네임을 확인해 주세요.');
  });

  it('rejects an OCR result when the API class differs from icon recognition', async () => {
    mockedFetchProfile.mockResolvedValue({ CharacterClassName: '디스트로이어' } as never);
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '분노의 망치' } as never);

    await expect(lookupRaidArkPassive('비식별닉네임', '가디언나이트'))
      .rejects.toBeInstanceOf(RaidArkPassiveLookupError);
  });

  it('tries another OCR candidate and only loads ark passive after class validation', async () => {
    mockedFetchProfile
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ CharacterClassName: '가디언나이트' } as never);
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '업화의 계승자' } as never);

    await expect(lookupRaidArkPassiveCandidates(['오인식', '정확한닉네임'], '가디언나이트'))
      .resolves.toMatchObject({ nickname: '정확한닉네임', position: 'hit-master' });
    expect(mockedFetchProfile).toHaveBeenCalledTimes(2);
    expect(mockedFetchArkPassive).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent requests for the same character', async () => {
    mockedFetchProfile.mockResolvedValue({ CharacterClassName: '바드' } as never);
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '절실한 구원' } as never);

    await Promise.all([
      lookupRaidArkPassive('비식별닉네임', '바드'),
      lookupRaidArkPassive('비식별닉네임', '바드'),
    ]);

    expect(mockedFetchProfile).toHaveBeenCalledTimes(1);
    expect(mockedFetchArkPassive).toHaveBeenCalledTimes(1);
  });
});
