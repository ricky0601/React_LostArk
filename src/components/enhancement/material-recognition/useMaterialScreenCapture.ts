import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MaterialType } from '../../../data/enhancement';
import { disposeMaterialRecognizer, recognizeMaterialFrame } from './recognizeMaterialFrame';
import {
  addRecognitionFrame,
  createRecognitionSessionResults,
  summarizeRecognitionSession,
  type RecognitionSessionResults,
} from './sessionResults';
import type { CaptureStatus, MaterialIconMap } from './types';

const SCAN_INTERVAL_MS = 2500;

interface UseMaterialScreenCaptureOptions {
  icons: MaterialIconMap;
  targetMaterials: MaterialType[];
}

const errorMessage = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return '화면 공유가 취소되었거나 권한이 허용되지 않았습니다.';
    if (error.name === 'NotFoundError') return '공유할 수 있는 화면을 찾지 못했습니다.';
  }
  return error instanceof Error ? error.message : '화면 인식을 시작하지 못했습니다.';
};

export const useMaterialScreenCapture = ({
  icons,
  targetMaterials,
}: UseMaterialScreenCaptureOptions) => {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<RecognitionSessionResults>(createRecognitionSessionResults);
  const [scanCount, setScanCount] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const sessionIdRef = useRef(0);
  const cleanupRef = useRef<Promise<void>>(Promise.resolve());
  const iconsRef = useRef(icons);
  const targetsRef = useRef(targetMaterials);
  const confirmedMaterialsRef = useRef(new Set<MaterialType>());

  useEffect(() => {
    iconsRef.current = icons;
    targetsRef.current = targetMaterials;
  }, [icons, targetMaterials]);

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
    const cleanup = async () => {
      while (processingRef.current) {
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }
      await disposeMaterialRecognizer();
    };
    const nextCleanup = cleanupRef.current.catch(() => undefined).then(cleanup);
    cleanupRef.current = nextCleanup;
    return nextCleanup;
  }, []);

  const finish = useCallback(async () => {
    sessionIdRef.current += 1;
    clearTimer();
    releaseStream();
    setStatus('review');
    await queueRecognizerCleanup();
  }, [clearTimer, queueRecognizerCleanup, releaseStream]);

  const scanFrame = useCallback(async (sessionId: number) => {
    const video = videoRef.current;
    if (sessionId !== sessionIdRef.current
      || !video
      || processingRef.current
      || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    processingRef.current = true;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('공유 화면을 읽을 수 없습니다.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const pendingTargets = targetsRef.current.filter((material) => (
        !confirmedMaterialsRef.current.has(material)
      ));
      if (pendingTargets.length === 0) return;
      const frame = await recognizeMaterialFrame(canvas, iconsRef.current, pendingTargets);
      if (sessionId !== sessionIdRef.current) return;
      frame.observations.forEach((observation) => {
        if (!observation.needsTooltip
          && !observation.needsReview
          && observation.confidence >= 0.8) {
          confirmedMaterialsRef.current.add(observation.material);
        }
      });
      setSession((current) => addRecognitionFrame(current, frame.observations));
      setScanCount((current) => current + 1);
      setError(null);
    } catch (scanError) {
      if (sessionId === sessionIdRef.current) setError(errorMessage(scanError));
    } finally {
      processingRef.current = false;
    }
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus('error');
      setError('이 브라우저는 화면 공유를 지원하지 않습니다. 최신 Chrome 또는 Edge를 사용해 주세요.');
      return;
    }
    if (targetsRef.current.length === 0) {
      setStatus('error');
      setError('먼저 재련 목표를 설정해 인식할 재료를 선택해 주세요.');
      return;
    }
    if (targetsRef.current.every((material) => (
      material !== '운명의 파편' && !iconsRef.current[material]
    ))) {
      setStatus('error');
      setError('재료 아이콘을 준비하지 못했습니다. 시세 조회 후 다시 시도해 주세요.');
      return;
    }

    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;
    clearTimer();
    releaseStream();
    await queueRecognizerCleanup();
    if (sessionId !== sessionIdRef.current) return;

    setStatus('requesting');
    setError(null);
    setSession(createRecognitionSessionResults());
    setScanCount(0);
    confirmedMaterialsRef.current.clear();

    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 2, max: 5 },
        },
        audio: false,
      });
      if (sessionId !== sessionIdRef.current) {
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
        if (sessionId === sessionIdRef.current) void finish();
      }, { once: true });
      await video.play();
      if (sessionId !== sessionIdRef.current) return;
      setStatus('sharing');
      await scanFrame(sessionId);
      if (sessionId !== sessionIdRef.current) return;
      timerRef.current = window.setInterval(() => { void scanFrame(sessionId); }, SCAN_INTERVAL_MS);
    } catch (startError) {
      stream?.getTracks().forEach((track) => track.stop());
      if (streamRef.current === stream) streamRef.current = null;
      if (video) video.srcObject = null;
      if (videoRef.current === video) videoRef.current = null;
      if (sessionId === sessionIdRef.current) {
        setStatus('error');
        setError(errorMessage(startError));
      }
    }
  }, [clearTimer, finish, queueRecognizerCleanup, releaseStream, scanFrame]);

  const reset = useCallback(() => {
    sessionIdRef.current += 1;
    clearTimer();
    releaseStream();
    void queueRecognizerCleanup();
    setStatus('idle');
    setError(null);
    setSession(createRecognitionSessionResults());
    setScanCount(0);
    confirmedMaterialsRef.current.clear();
  }, [clearTimer, queueRecognizerCleanup, releaseStream]);

  useEffect(() => () => {
    sessionIdRef.current += 1;
    clearTimer();
    releaseStream();
    void queueRecognizerCleanup();
  }, [clearTimer, queueRecognizerCleanup, releaseStream]);

  const results = useMemo(() => summarizeRecognitionSession(session), [session]);

  return {
    status,
    error,
    results,
    scanCount,
    start,
    stop: finish,
    reset,
  };
};
