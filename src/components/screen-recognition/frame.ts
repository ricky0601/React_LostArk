export class InvalidRecognitionFrameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRecognitionFrameError';
  }
}

export const captureVideoFrame = (video: HTMLVideoElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new InvalidRecognitionFrameError('공유 화면을 읽을 수 없습니다.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
};

export const validateRecognitionFrame = (
  frame: HTMLCanvasElement,
  minimumWidth = 800,
  minimumHeight = 450,
): void => {
  if (frame.width < minimumWidth || frame.height < minimumHeight) {
    throw new InvalidRecognitionFrameError(
      `공유 화면 해상도가 너무 낮습니다. 감지된 화면: ${frame.width}×${frame.height}`,
    );
  }
};
