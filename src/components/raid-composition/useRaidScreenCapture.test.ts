import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RaidFrameObservation } from './recognition';
import { useRaidScreenCapture } from './useRaidScreenCapture';

const mocks = vi.hoisted(() => ({
  reset: vi.fn(),
  lookup: vi.fn(() => new Promise(() => {})),
  options: null as null | { onResult: (result: RaidFrameObservation) => void },
}));

vi.mock('../screen-recognition/useScreenRecognition', () => ({
  useScreenRecognition: vi.fn((options) => {
    mocks.options = options;
    return {
      status: 'idle',
      error: null,
      start: vi.fn(),
      stop: vi.fn(),
      reset: mocks.reset,
    };
  }),
}));

vi.mock('./raidArkPassiveLookup', () => ({
  clearRaidArkPassiveLookupCache: vi.fn(),
  lookupRaidArkPassiveCandidates: mocks.lookup,
}));

const frame = (className = '바드', nickname = '인식닉', scannedAt = 123): RaidFrameObservation => ({
  scannedAt,
  observations: [{
    slot: 0,
    party: 1,
    className,
    confidence: 0.92,
    needsReview: false,
    nickname,
    nicknameCandidates: [nickname],
  }],
});

describe('useRaidScreenCapture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it('keeps ark passive lookup opt-in and aborts an active lookup when identity changes', async () => {
    let resolveLookup!: (value: {
      nickname: string; className: string; title: string; role: 'support'; position: 'unknown'; needsReview: false;
    }) => void;
    mocks.lookup.mockImplementationOnce(() => new Promise((resolve) => { resolveLookup = resolve; }));
    const { result, unmount } = renderHook(() => useRaidScreenCapture());
    expect(result.current.autoArkPassiveLookup).toBe(false);

    act(() => mocks.options?.onResult(frame()));
    act(() => result.current.setAutoArkPassiveLookup(true));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });

    const signal = mocks.lookup.mock.calls[0][2] as AbortSignal;
    expect(signal.aborted).toBe(false);

    act(() => mocks.options?.onResult(frame('도화가', '새인식닉')));
    expect(signal.aborted).toBe(true);
    await act(async () => {
      resolveLookup({
        nickname: '인식닉', className: '바드', title: '절실한 구원', role: 'support', position: 'unknown', needsReview: false,
      });
      await Promise.resolve();
    });
    expect(result.current.roster[0]).toMatchObject({ className: '도화가', nickname: '새인식닉', arkPassiveTitle: '' });
    unmount();
  });

  it('keeps a replacement lookup tracked when the aborted request settles late', async () => {
    let resolveFirst!: () => void;
    mocks.lookup
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = () => resolve({
        nickname: '인식닉', className: '바드', title: '절실한 구원', role: 'support', position: 'unknown', needsReview: false,
      }); }))
      .mockImplementationOnce(() => new Promise(() => {}));
    const { result } = renderHook(() => useRaidScreenCapture());
    act(() => mocks.options?.onResult(frame()));
    act(() => result.current.setAutoArkPassiveLookup(true));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    const firstSignal = mocks.lookup.mock.calls[0][2] as AbortSignal;

    act(() => mocks.options?.onResult(frame('도화가', '새인식닉')));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    const replacementSignal = mocks.lookup.mock.calls[1][2] as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
    expect(replacementSignal.aborted).toBe(false);

    await act(async () => { resolveFirst(); await Promise.resolve(); });
    act(() => result.current.setAutoArkPassiveLookup(false));
    expect(replacementSignal.aborted).toBe(true);
  });

  it('aborts an active lookup when lookup is unchecked or the hook unmounts', async () => {
    const first = renderHook(() => useRaidScreenCapture());
    act(() => mocks.options?.onResult(frame()));
    act(() => first.result.current.setAutoArkPassiveLookup(true));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    const optOutSignal = mocks.lookup.mock.calls[0][2] as AbortSignal;

    act(() => first.result.current.setAutoArkPassiveLookup(false));
    expect(optOutSignal.aborted).toBe(true);
    expect(first.result.current.roster[0].arkPassiveStatus).toBe('idle');
    first.unmount();

    const second = renderHook(() => useRaidScreenCapture());
    act(() => mocks.options?.onResult(frame()));
    act(() => second.result.current.setAutoArkPassiveLookup(true));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    const unmountSignal = mocks.lookup.mock.calls[1][2] as AbortSignal;
    second.unmount();
    expect(unmountSignal.aborted).toBe(true);
  });

  it('reset clears roster, scan metadata, and lookup state', async () => {
    const { result } = renderHook(() => useRaidScreenCapture());
    act(() => mocks.options?.onResult(frame()));
    expect(result.current.framesScanned).toBe(1);
    expect(result.current.lastScanAt).toBe(123);
    act(() => result.current.setAutoArkPassiveLookup(true));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    const signal = mocks.lookup.mock.calls[0][2] as AbortSignal;

    act(() => result.current.reset());

    expect(signal.aborted).toBe(true);
    expect(mocks.reset).toHaveBeenCalledTimes(1);
    expect(result.current.autoArkPassiveLookup).toBe(false);
    expect(result.current.framesScanned).toBe(0);
    expect(result.current.lastScanAt).toBeNull();
    expect(result.current.roster.every((slot) => slot.className === '')).toBe(true);
  });
});
