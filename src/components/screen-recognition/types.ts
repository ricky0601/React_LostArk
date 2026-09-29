export type ScreenCaptureStatus = 'idle' | 'requesting' | 'sharing' | 'review' | 'error';

export interface FrameRecognizer<TResult> {
  recognize(frame: HTMLCanvasElement): Promise<TResult>;
  dispose(): Promise<void>;
}
