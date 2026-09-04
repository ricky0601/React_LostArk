import { useCallback, useEffect, useRef, useState } from 'react';
import { captureVideoFrame } from './frame';
import type { FrameRecognizer, ScreenCaptureStatus } from './types';

const DEFAULT_DISPLAY_MEDIA_OPTIONS: DisplayMediaStreamOptions = {
  video: {
    displaySurface: 'window',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 2, max: 5 },
  },
  audio: false,
};

export interface UseScreenRecognitionOptions<TResult> {
  recognizer: FrameRecognizer<TResult>;
  onResult: (result: TResult) => void;
  intervalMs: number;
  getErrorMessage: (error: unknown) => string;
  unsupportedMessage: string;
  getStartError?: () => string | null;
  onSessionStart?: () => void;
  displayMediaOptions?: DisplayMediaStreamOptions;
}

export const useScreenRecognition = <TResult,>({
  recognizer,
  onResult,
  intervalMs,
  getErrorMessage,
  unsupportedMessage,
  getStartError,
  onSessionStart,
  displayMediaOptions = DEFAULT_DISPLAY_MEDIA_OPTIONS,
}: UseScreenRecognitionOptions<TResult>) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const processingRef = useRef<Promise<void> | null>(null);
  const sessionIdRef = useRef(0);
  const cleanupRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const recognizerRef = useRef(recognizer);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    recognizerRef.current = recognizer;
    onResultRef.current = onResult;
  }, [onResult, recognizer]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
  }, []);

  const queueRecognizerCleanup = useCallback(() => {
    const activeRecognition = processingRef.current;
    const recognizerToDispose = recognizerRef.current;
    const cleanup = async () => {
      await activeRecognition?.catch(() => undefined);
      await recognizerToDispose.dispose();
    };
    const nextCleanup = cleanupRef.current.catch(() => undefined).then(cleanup);
    cleanupRef.current = nextCleanup;
    return nextCleanup;
  }, []);

  const stop = useCallback(async () => {
    sessionIdRef.current += 1;
    clearTimer();
    releaseStream();
    if (mountedRef.current) setStatus('review');
    await queueRecognizerCleanup();
  }, [clearTimer, queueRecognizerCleanup, releaseStream]);

  const scanFrame = useCallback((sessionId: number): Promise<void> => {
    const video = videoRef.current;
    if (sessionId !== sessionIdRef.current
      || !video
      || processingRef.current
      || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();

    const recognition = (async () => {
      try {
        const result = await recognizerRef.current.recognize(captureVideoFrame(video));
        if (sessionId !== sessionIdRef.current || !mountedRef.current) return;
        onResultRef.current(result);
        setError(null);
      } catch (scanError) {
        if (sessionId === sessionIdRef.current && mountedRef.current) {
          setError(getErrorMessage(scanError));
        }
      }
    })();
    processingRef.current = recognition;
    void recognition.finally(() => {
      if (processingRef.current === recognition) processingRef.current = null;
    });
    return recognition;
  }, [getErrorMessage]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus('error');
      setError(unsupportedMessage);
      return;
    }
    const startError = getStartError?.();
    if (startError) {
      setStatus('error');
      setError(startError);
      return;
    }

    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;
    clearTimer();
    releaseStream();
    await queueRecognizerCleanup();
    if (sessionId !== sessionIdRef.current || !mountedRef.current) return;

    setStatus('requesting');
    setError(null);
    onSessionStart?.();

    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      if (sessionId !== sessionIdRef.current || !mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      streamRef.current = stream;
      videoRef.current = video;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (sessionId === sessionIdRef.current) void stop();
      }, { once: true });
      await video.play();
      if (sessionId !== sessionIdRef.current || !mountedRef.current) return;
      setStatus('sharing');
      await scanFrame(sessionId);
      if (sessionId !== sessionIdRef.current || !mountedRef.current) return;
      timerRef.current = window.setInterval(() => { void scanFrame(sessionId); }, intervalMs);
    } catch (startError) {
      stream?.getTracks().forEach((track) => track.stop());
      if (streamRef.current === stream) streamRef.current = null;
      if (video) video.srcObject = null;
      if (videoRef.current === video) videoRef.current = null;
      if (sessionId === sessionIdRef.current && mountedRef.current) {
        setStatus('error');
        setError(getErrorMessage(startError));
      }
    }
  }, [
    clearTimer,
    displayMediaOptions,
    getErrorMessage,
    getStartError,
    intervalMs,
    onSessionStart,
    queueRecognizerCleanup,
    releaseStream,
    scanFrame,
    stop,
    unsupportedMessage,
  ]);

  const reset = useCallback(() => {
    sessionIdRef.current += 1;
    clearTimer();
    releaseStream();
    void queueRecognizerCleanup();
    if (mountedRef.current) {
      setStatus('idle');
      setError(null);
    }
  }, [clearTimer, queueRecognizerCleanup, releaseStream]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionIdRef.current += 1;
      clearTimer();
      releaseStream();
      void queueRecognizerCleanup();
    };
  }, [clearTimer, queueRecognizerCleanup, releaseStream]);

  return { status, error, start, stop, reset };
};
