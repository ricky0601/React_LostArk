import { useCallback, useMemo, useState } from 'react';
import { useScreenRecognition } from '../screen-recognition';
import { ApplicantFrameRecognizer, type ApplicantFrameObservation } from './ApplicantFrameRecognizer';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'NotAllowedError') return '화면 공유 권한이 거부되었습니다.';
  return '신청자 인식 중 오류가 발생했습니다. 화면 공유를 다시 시작해 주세요.';
};

export const useApplicantScreenCapture = (onResult: (result: ApplicantFrameObservation) => void) => {
  const recognizer = useMemo(() => new ApplicantFrameRecognizer(), []);
  const [framesScanned, setFramesScanned] = useState(0);
  const handleResult = useCallback((result: ApplicantFrameObservation) => {
    setFramesScanned((count) => count + 1);
    onResult(result);
  }, [onResult]);
  const recognition = useScreenRecognition({
    recognizer,
    onResult: handleResult,
    intervalMs: 2500,
    getErrorMessage,
    unsupportedMessage: '이 브라우저에서는 화면 공유를 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요.',
    onSessionStart: () => setFramesScanned(0),
  });
  return { ...recognition, framesScanned };
};
