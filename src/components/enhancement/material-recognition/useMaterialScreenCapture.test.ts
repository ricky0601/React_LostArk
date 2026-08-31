import { act, renderHook } from '@testing-library/react';
import type { RecognitionFrame } from './types';
import { disposeMaterialRecognizer, recognizeMaterialFrame } from './recognizeMaterialFrame';
import { useMaterialScreenCapture } from './useMaterialScreenCapture';

vi.mock('./recognizeMaterialFrame', () => ({
  disposeMaterialRecognizer: vi.fn().mockResolvedValue(undefined),
  recognizeMaterialFrame: vi.fn(),
}));

const emptyFrame: RecognitionFrame = {
  observations: [],
  frameWidth: 1920,
  frameHeight: 1080,
};

describe('useMaterialScreenCapture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(disposeMaterialRecognizer).mockResolvedValue(undefined);
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

  it('does not leave an interval when sharing ends during the initial scan', async () => {
    let resolveRecognition!: (frame: RecognitionFrame) => void;
    vi.mocked(recognizeMaterialFrame).mockReturnValue(new Promise((resolve) => {
      resolveRecognition = resolve;
    }));

    const stopTrack = vi.fn();
    const track = {
      stop: stopTrack,
      addEventListener: vi.fn(),
    };
    const stream = {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia: vi.fn().mockResolvedValue(stream) },
    });

    const { result, unmount } = renderHook(() => useMaterialScreenCapture({
      icons: { 수호석: '/guardian.png' },
      targetMaterials: ['수호석'],
    }));

    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start();
    });
    await act(async () => {
      for (let i = 0; i < 5; i += 1) await Promise.resolve();
    });
    expect(recognizeMaterialFrame).toHaveBeenCalledOnce();

    let stopPromise!: Promise<void>;
    act(() => {
      stopPromise = result.current.stop();
    });
    await act(async () => {
      resolveRecognition(emptyFrame);
      await startPromise;
      await vi.runAllTimersAsync();
      await stopPromise;
    });

    expect(result.current.status).toBe('review');
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);

    unmount();
    await act(async () => {
      await vi.runAllTimersAsync();
    });
  });
});
