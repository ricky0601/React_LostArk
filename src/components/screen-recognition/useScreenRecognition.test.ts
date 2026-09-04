import { createElement, StrictMode, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { FrameRecognizer } from './types';
import { useScreenRecognition } from './useScreenRecognition';

const createStream = () => {
  const stop = vi.fn();
  let ended: (() => void) | undefined;
  const track = {
    stop,
    addEventListener: vi.fn((_event: string, listener: () => void) => { ended = listener; }),
  };
  return {
    stream: {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream,
    stop,
    end: () => ended?.(),
  };
};

const createRecognizer = (): FrameRecognizer<number> => ({
  recognize: vi.fn().mockResolvedValue(1),
  dispose: vi.fn().mockResolvedValue(undefined),
});

const renderRecognition = (
  recognizer = createRecognizer(),
  onResult = vi.fn(),
) => renderHook(() => useScreenRecognition({
  recognizer,
  onResult,
  intervalMs: 2500,
  getErrorMessage: (error) => error instanceof Error ? error.message : 'capture failed',
  unsupportedMessage: 'unsupported',
}));

const flush = async () => {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};

describe('useScreenRecognition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get: () => HTMLMediaElement.HAVE_CURRENT_DATA,
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'videoWidth', {
      configurable: true,
      get: () => 1920,
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'videoHeight', {
      configurable: true,
      get: () => 1080,
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('starts capture when mounted under React StrictMode', async () => {
    const shared = createStream();
    const getDisplayMedia = vi.fn().mockResolvedValue(shared.stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia },
    });
    const recognizer = createRecognizer();
    const capture = renderHook(() => useScreenRecognition({
      recognizer,
      onResult: vi.fn(),
      intervalMs: 2500,
      getErrorMessage: () => 'capture failed',
      unsupportedMessage: 'unsupported',
    }), {
      wrapper: ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children),
    });

    await act(() => capture.result.current.start());

    expect(getDisplayMedia).toHaveBeenCalledOnce();
    expect(capture.result.current.status).toBe('sharing');
    capture.unmount();
  });

  it('reports unsupported browsers and permission denial without leaving resources', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    const unsupported = renderRecognition();

    await act(() => unsupported.result.current.start());
    expect(unsupported.result.current).toMatchObject({ status: 'error', error: 'unsupported' });
    unsupported.unmount();

    const getDisplayMedia = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia },
    });
    const denied = renderRecognition();
    await act(() => denied.result.current.start());

    expect(denied.result.current).toMatchObject({ status: 'error', error: 'capture failed' });
    expect(vi.getTimerCount()).toBe(0);
    denied.unmount();
  });

  it('skips interval ticks while a frame is still being recognized', async () => {
    let resolveRecognition!: (value: number) => void;
    const recognizer = createRecognizer();
    vi.mocked(recognizer.recognize).mockReturnValue(new Promise((resolve) => {
      resolveRecognition = resolve;
    }));
    const { stream } = createStream();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia: vi.fn().mockResolvedValue(stream) },
    });
    const capture = renderRecognition(recognizer);

    act(() => { void capture.result.current.start(); });
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(7500); });
    expect(recognizer.recognize).toHaveBeenCalledOnce();

    await act(async () => { resolveRecognition(1); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(recognizer.recognize).toHaveBeenCalledTimes(2);
    capture.unmount();
  });

  it('ignores an old frame after reset and disposes after it settles', async () => {
    let resolveRecognition!: (value: number) => void;
    const recognizer = createRecognizer();
    vi.mocked(recognizer.recognize).mockReturnValue(new Promise((resolve) => {
      resolveRecognition = resolve;
    }));
    const onResult = vi.fn();
    const shared = createStream();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia: vi.fn().mockResolvedValue(shared.stream) },
    });
    const capture = renderRecognition(recognizer, onResult);

    act(() => { void capture.result.current.start(); });
    await flush();
    act(() => capture.result.current.reset());
    expect(capture.result.current.status).toBe('idle');
    expect(shared.stop).toHaveBeenCalledOnce();

    await act(async () => { resolveRecognition(7); });
    await flush();
    expect(onResult).not.toHaveBeenCalled();
    expect(recognizer.dispose).toHaveBeenCalledTimes(2);
    capture.unmount();
  });

  it('handles browser sharing end and metadata failure with stream cleanup', async () => {
    const shared = createStream();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia: vi.fn().mockResolvedValue(shared.stream) },
    });
    const capture = renderRecognition();
    await act(() => capture.result.current.start());

    act(() => shared.end());
    await flush();
    expect(capture.result.current.status).toBe('review');
    expect(shared.stop).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    capture.unmount();

    const failed = createStream();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia: vi.fn().mockResolvedValue(failed.stream) },
    });
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('metadata failed'));
    const metadataFailure = renderRecognition();
    await act(() => metadataFailure.result.current.start());

    expect(metadataFailure.result.current).toMatchObject({ status: 'error', error: 'metadata failed' });
    expect(failed.stop).toHaveBeenCalledOnce();
    metadataFailure.unmount();
  });

  it('cleans up on unmount and remains usable after a recognizer error', async () => {
    const recognizer = createRecognizer();
    vi.mocked(recognizer.recognize)
      .mockRejectedValueOnce(new Error('recognition failed'))
      .mockResolvedValueOnce(2);
    const onResult = vi.fn();
    const shared = createStream();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia: vi.fn().mockResolvedValue(shared.stream) },
    });
    const capture = renderRecognition(recognizer, onResult);
    await act(() => capture.result.current.start());

    expect(capture.result.current).toMatchObject({ status: 'sharing', error: 'recognition failed' });
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(onResult).toHaveBeenCalledWith(2);
    expect(capture.result.current.error).toBeNull();

    capture.unmount();
    await flush();
    expect(shared.stop).toHaveBeenCalledOnce();
    expect(recognizer.dispose).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
