import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useApplicantIncidentLookup } from './useApplicantIncidentLookup';
import type { ApplicantFrameObservation } from './ApplicantFrameRecognizer';

const observation: ApplicantFrameObservation = {
  scannedAt: 1,
  rows: [{ row: 0, occupied: true, nickname: '테스트닉', nicknameCandidates: ['테스트닉'], needsReview: true }],
};

const vacantObservation = (scannedAt: number): ApplicantFrameObservation => ({
  scannedAt,
  rows: [{ row: 0, occupied: false, nickname: null, nicknameCandidates: [], needsReview: false }],
});

const response = (results: unknown[], ok = true, message = '') => ({
  ok,
  json: async () => (ok ? { results } : { message }),
}) as Response;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

afterEach(() => vi.unstubAllGlobals());

describe('useApplicantIncidentLookup', () => {
  it('does not fetch before recognition and automatically searches a stable OCR nickname', async () => {
    const pending = deferred<Response>();
    const fetchMock = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useApplicantIncidentLookup());

    expect(fetchMock).not.toHaveBeenCalled();
    act(() => result.current.applyRecognition(observation));
    expect(result.current.applicants[0]).toEqual(expect.objectContaining({ needsReview: true, searchStatus: 'idle' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(result.current.applicants[0].searchStatus).toBe('loading');

    pending.resolve(response([{ title: '검색 결과', url: 'https://www.inven.co.kr/board/lostark/5355/123' }]));
    await waitFor(() => expect(result.current.applicants[0].searchStatus).toBe('review'));
  });

  it('automatically searches again after a valid manual correction', async () => {
    const fetchMock = vi.fn(async () => response([]));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useApplicantIncidentLookup());
    act(() => result.current.applyRecognition(observation));
    act(() => result.current.editNickname('applicant-0', '수정닉'));

    expect(result.current.applicants[0]).toEqual(expect.objectContaining({ nickname: '수정닉', needsReview: false }));
    await waitFor(() => expect(result.current.applicants[0].searchStatus).toBe('empty'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/inven-incidents?nickname=%EC%88%98%EC%A0%95%EB%8B%89', expect.anything());
  });

  it.each([
    ['empty', response([])],
    ['error', response([], false, '조회 실패')],
  ] as const)('moves to the %s search state', async (status, fetchResponse) => {
    vi.stubGlobal('fetch', vi.fn(async () => fetchResponse));
    const { result } = renderHook(() => useApplicantIncidentLookup());
    act(() => result.current.applyRecognition(observation));
    act(() => result.current.search('applicant-0'));

    await waitFor(() => expect(result.current.applicants[0].searchStatus).toBe(status));
  });

  it('preserves an existing nickname and results through provisional OCR', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response([
      { title: '기존 결과', url: 'https://www.inven.co.kr/board/lostark/5355/123' },
    ])));
    const { result } = renderHook(() => useApplicantIncidentLookup());
    act(() => result.current.applyRecognition(observation));
    act(() => result.current.search('applicant-0'));
    await waitFor(() => expect(result.current.applicants[0].searchStatus).toBe('review'));

    act(() => result.current.applyRecognition({
      scannedAt: 2,
      rows: [{ row: 0, occupied: true, nickname: null, nicknameCandidates: ['새신청자'], needsReview: true }],
    }));

    expect(result.current.applicants[0]).toEqual(expect.objectContaining({
      nickname: '테스트닉', needsReview: true, searchStatus: 'review',
      results: [{ title: '기존 결과', url: 'https://www.inven.co.kr/board/lostark/5355/123' }],
    }));
  });

  it('keeps a row for one vacant frame, then removes it and aborts on the second', () => {
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => {
      capturedSignal = options.signal as AbortSignal;
      return new Promise<Response>(() => undefined);
    }));
    const { result } = renderHook(() => useApplicantIncidentLookup());
    act(() => result.current.applyRecognition(observation));
    act(() => result.current.search('applicant-0'));

    act(() => result.current.applyRecognition(vacantObservation(2)));
    expect(result.current.applicants).toHaveLength(1);
    expect(capturedSignal?.aborted).toBe(false);

    act(() => result.current.applyRecognition(vacantObservation(3)));
    expect(result.current.applicants).toHaveLength(0);
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('keeps a manual correction authoritative when later OCR disagrees', () => {
    const { result } = renderHook(() => useApplicantIncidentLookup());
    act(() => result.current.applyRecognition(observation));
    act(() => result.current.editNickname('applicant-0', '수동확인'));

    act(() => result.current.applyRecognition({
      scannedAt: 2,
      rows: [{ row: 0, occupied: true, nickname: '다른인식', nicknameCandidates: ['다른인식'], needsReview: true }],
    }));

    expect(result.current.applicants[0]).toEqual(expect.objectContaining({
      nickname: '수동확인', source: 'manual', needsReview: false, searchStatus: 'idle', results: [],
    }));
  });

  it('ignores a stale result after manual editing', async () => {
    const pending = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn(() => pending.promise));
    const { result } = renderHook(() => useApplicantIncidentLookup());
    act(() => result.current.applyRecognition(observation));
    act(() => result.current.search('applicant-0'));
    act(() => result.current.editNickname('applicant-0', '수정닉'));

    pending.resolve(response([{ title: 'old', url: 'https://www.inven.co.kr/board/lostark/5355/123' }]));
    await act(async () => { await pending.promise; await Promise.resolve(); });

    expect(result.current.applicants[0]).toEqual(expect.objectContaining({ nickname: '수정닉', needsReview: false, searchStatus: 'idle', results: [] }));
  });

  it('aborts an active request when the tab unmounts', () => {
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => {
      capturedSignal = options.signal as AbortSignal;
      return new Promise<Response>(() => undefined);
    }));
    const { result, unmount } = renderHook(() => useApplicantIncidentLookup());
    act(() => result.current.applyRecognition(observation));
    act(() => result.current.search('applicant-0'));

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
