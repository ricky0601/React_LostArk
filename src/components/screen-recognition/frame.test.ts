import {
  captureVideoFrame,
  InvalidRecognitionFrameError,
  validateRecognitionFrame,
} from './frame';

describe('recognition frames', () => {
  afterEach(() => vi.restoreAllMocks());

  it('creates a canvas with the current video dimensions', () => {
    const video = document.createElement('video');
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
    });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);

    const frame = captureVideoFrame(video);

    expect([frame.width, frame.height]).toEqual([1920, 1080]);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1920, 1080);
  });

  it('rejects frames below the configured minimum dimensions', () => {
    const frame = document.createElement('canvas');
    frame.width = 799;
    frame.height = 450;

    expect(() => validateRecognitionFrame(frame)).toThrow(InvalidRecognitionFrameError);
    expect(() => validateRecognitionFrame(frame)).toThrow('799×450');
  });
});
