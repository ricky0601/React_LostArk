import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MaterialType } from '../../../data/enhancement';
import type { FrameRecognizer } from '../../screen-recognition/types';
import { useScreenRecognition } from '../../screen-recognition/useScreenRecognition';
import { disposeMaterialRecognizer, recognizeMaterialFrame } from './recognizeMaterialFrame';
import {
  addRecognitionFrame,
  createRecognitionSessionResults,
  summarizeRecognitionSession,
  type RecognitionSessionResults,
} from './sessionResults';
import type { MaterialIconMap, RecognitionFrame } from './types';

const SCAN_INTERVAL_MS = 2500;
const UNSUPPORTED_MESSAGE = '이 브라우저는 화면 공유를 지원하지 않습니다. 최신 Chrome 또는 Edge를 사용해 주세요.';

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
  const [session, setSession] = useState<RecognitionSessionResults>(createRecognitionSessionResults);
  const [scanCount, setScanCount] = useState(0);
  const iconsRef = useRef(icons);
  const targetsRef = useRef(targetMaterials);
  const confirmedMaterialsRef = useRef(new Set<MaterialType>());

  useEffect(() => {
    iconsRef.current = icons;
    targetsRef.current = targetMaterials;
  }, [icons, targetMaterials]);

  const recognizer = useMemo<FrameRecognizer<RecognitionFrame | null>>(() => ({
    recognize: async (frame) => {
      const pendingTargets = targetsRef.current.filter((material) => (
        !confirmedMaterialsRef.current.has(material)
      ));
      if (pendingTargets.length === 0) return null;
      return recognizeMaterialFrame(frame, iconsRef.current, pendingTargets);
    },
    dispose: disposeMaterialRecognizer,
  }), []);

  const addFrame = useCallback((frame: RecognitionFrame | null) => {
    if (!frame) return;
    frame.observations.forEach((observation) => {
      if (!observation.needsTooltip
        && !observation.needsReview
        && observation.confidence >= 0.8) {
        confirmedMaterialsRef.current.add(observation.material);
      }
    });
    setSession((current) => addRecognitionFrame(current, frame.observations));
    setScanCount((current) => current + 1);
  }, []);

  const getStartError = useCallback((): string | null => {
    if (targetsRef.current.length === 0) {
      return '먼저 재련 목표를 설정해 인식할 재료를 선택해 주세요.';
    }
    if (targetsRef.current.every((material) => (
      material !== '운명의 파편' && !iconsRef.current[material]
    ))) {
      return '재료 아이콘을 준비하지 못했습니다. 시세 조회 후 다시 시도해 주세요.';
    }
    return null;
  }, []);

  const clearSession = useCallback(() => {
    setSession(createRecognitionSessionResults());
    setScanCount(0);
    confirmedMaterialsRef.current.clear();
  }, []);

  const capture = useScreenRecognition({
    recognizer,
    onResult: addFrame,
    intervalMs: SCAN_INTERVAL_MS,
    getErrorMessage: errorMessage,
    unsupportedMessage: UNSUPPORTED_MESSAGE,
    getStartError,
    onSessionStart: clearSession,
  });

  const reset = useCallback(() => {
    capture.reset();
    clearSession();
  }, [capture, clearSession]);

  const results = useMemo(() => summarizeRecognitionSession(session), [session]);

  return {
    status: capture.status,
    error: capture.error,
    results,
    scanCount,
    start: capture.start,
    stop: capture.stop,
    reset,
  };
};
