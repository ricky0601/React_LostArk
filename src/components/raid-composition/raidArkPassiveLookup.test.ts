import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchArkPassive, fetchProfile } from '../../utils/api';
import { rankRaidOcrCandidates } from './RaidPartyFrameRecognizer';
import {
  clearRaidArkPassiveLookupCache,
  lookupRaidArkPassive,
  lookupRaidArkPassiveCandidates,
  parseRaidCombatPower,
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
    mockedFetchProfile.mockResolvedValue({ CharacterClassName: '가디언나이트', CombatPower: '123,456.78' } as never);
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '드레드 로어' } as never);

    await expect(lookupRaidArkPassive('비식별닉네임', '가디언나이트')).resolves.toMatchObject({
      className: '가디언나이트',
      title: '드레드 로어',
      role: 'dealer',
      position: 'entropy-head',
      combatPower: 123456.78,
      needsReview: false,
    });
  });

  it('parses combat power without turning missing or invalid values into zero', () => {
    expect(parseRaidCombatPower('123,456.78')).toBe(123456.78);
    expect(parseRaidCombatPower(null)).toBeNull();
    expect(parseRaidCombatPower('invalid')).toBeNull();
    expect(parseRaidCombatPower('0')).toBeNull();
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

  it('checks expanded OCR alternatives beyond the former four-candidate limit', async () => {
    mockedFetchProfile
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ CharacterClassName: '디스트로이어' } as never);
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '분노의 망치' } as never);

    await expect(lookupRaidArkPassiveCandidates(
      ['오인식1', '오인식2', '오인식3', '오인식4', '정확한후보'],
      '디스트로이어',
    )).resolves.toMatchObject({ nickname: '정확한후보' });
    expect(mockedFetchProfile).toHaveBeenCalledTimes(5);
  });

  it('stops candidate retries after a valid profile has unavailable ark passive data', async () => {
    mockedFetchProfile.mockResolvedValue({ CharacterClassName: '디스트로이어' } as never);
    mockedFetchArkPassive.mockResolvedValue(null as never);

    await expect(lookupRaidArkPassiveCandidates(
      ['정확한후보', '재시도하면안됨'],
      '디스트로이어',
    )).rejects.toThrow('아크패시브 정보를 찾을 수 없습니다.');
    expect(mockedFetchProfile).toHaveBeenCalledTimes(1);
    expect(mockedFetchArkPassive).toHaveBeenCalledTimes(1);
  });

  it('limits OCR candidate requests to a bounded budget', async () => {
    mockedFetchProfile.mockResolvedValue(null as never);

    await expect(lookupRaidArkPassiveCandidates(
      Array.from({ length: 20 }, (_, index) => `오인식${index}`),
      '디스트로이어',
    )).rejects.toThrow('캐릭터를 찾을 수 없습니다.');
    expect(mockedFetchProfile).toHaveBeenCalledTimes(8);
    expect(mockedFetchArkPassive).not.toHaveBeenCalled();
  });

  it.each([
    {
      observations: [
        { text: '깃으도사양패여', confidence: 70 },
        { text: '낮으로사람패며', confidence: 62 },
      ],
      expected: '낫으로사람패여',
    },
    {
      observations: [{ text: '옹예나아기진규', confidence: 91 }],
      expected: '응애나아기진규',
    },
  ])('passes the prioritized $expected correction through the bounded lookup', async ({ observations, expected }) => {
    mockedFetchProfile.mockImplementation(async (nickname) => (
      nickname === expected ? { CharacterClassName: '디스트로이어' } as never : null as never
    ));
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '분노의 망치' } as never);

    const candidates = rankRaidOcrCandidates(observations);
    await expect(lookupRaidArkPassiveCandidates(candidates, '디스트로이어'))
      .resolves.toMatchObject({ nickname: expected });
    expect(mockedFetchProfile).toHaveBeenCalledWith(expected, expect.any(Object));
    expect(mockedFetchProfile.mock.calls.length).toBeLessThanOrEqual(8);
  });

  it('stops candidate retries when the API itself fails', async () => {
    mockedFetchProfile.mockRejectedValueOnce(new Error('API error: 429'));

    await expect(lookupRaidArkPassiveCandidates(
      ['첫후보', '둘째후보'],
      '디스트로이어',
    )).rejects.toThrow('API error: 429');
    expect(mockedFetchProfile).toHaveBeenCalledTimes(1);
  });

  it('passes the abort signal to both profile and ark passive requests', async () => {
    mockedFetchProfile.mockResolvedValue({ CharacterClassName: '바드' } as never);
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '절실한 구원' } as never);
    const controller = new AbortController();

    await lookupRaidArkPassive('비식별닉네임', '바드', controller.signal);

    expect(mockedFetchProfile).toHaveBeenCalledWith('비식별닉네임', { signal: controller.signal });
    expect(mockedFetchArkPassive).toHaveBeenCalledWith('비식별닉네임', { signal: controller.signal });
  });

  it('does not share an abort-owned in-flight request with a different signal', async () => {
    let rejectFirst: ((reason: unknown) => void) | undefined;
    mockedFetchProfile
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectFirst = reject; }) as never)
      .mockResolvedValueOnce({ CharacterClassName: '바드' } as never);
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '절실한 구원' } as never);
    const firstController = new AbortController();
    const secondController = new AbortController();

    const first = lookupRaidArkPassive('비식별닉네임', '바드', firstController.signal);
    firstController.abort();
    rejectFirst?.(new DOMException('Aborted', 'AbortError'));
    const second = lookupRaidArkPassive('비식별닉네임', '바드', secondController.signal);

    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await expect(second).resolves.toMatchObject({ title: '절실한 구원' });
    expect(mockedFetchProfile).toHaveBeenCalledTimes(2);
    expect(mockedFetchArkPassive).toHaveBeenCalledTimes(1);
  });

  it('does not cache an aborted request', async () => {
    mockedFetchProfile
      .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
      .mockResolvedValueOnce({ CharacterClassName: '바드' } as never);
    mockedFetchArkPassive.mockResolvedValue({ IsArkPassive: true, Title: '절실한 구원' } as never);

    await expect(lookupRaidArkPassive('비식별닉네임', '바드', new AbortController().signal))
      .rejects.toMatchObject({ name: 'AbortError' });
    await expect(lookupRaidArkPassive('비식별닉네임', '바드', new AbortController().signal))
      .resolves.toMatchObject({ title: '절실한 구원' });

    expect(mockedFetchProfile).toHaveBeenCalledTimes(2);
    expect(mockedFetchArkPassive).toHaveBeenCalledTimes(1);
  });
});
