import { useCallback, useEffect, useMemo, useState } from 'react';
import { useScreenRecognition } from '../screen-recognition/useScreenRecognition';
import { RaidPartyFrameRecognizer } from './RaidPartyFrameRecognizer';
import { lookupRaidArkPassiveCandidates } from './raidArkPassiveLookup';
import { normalizeRaidNickname, type RaidFrameObservation } from './recognition';
import { applyRecognitionToRoster, createInitialRoster, type RaidRosterSlot } from './roster';

const SCAN_INTERVAL_MS = 2500;

export const getRaidRecognitionErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return '화면 공유 권한이 거부되었습니다. 브라우저 공유 창에서 Lost Ark 화면을 선택해 주세요.';
  }
  if (error instanceof Error && /cancel/i.test(error.message)) {
    return '화면 공유 선택이 취소되었습니다. 다시 시작해 주세요.';
  }
  return '화면 인식 중 오류가 발생했습니다. 화면 공유를 다시 시작해 주세요.';
};

const UNSUPPORTED_MESSAGE = '이 브라우저에서는 화면 공유를 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요.';

export const useRaidScreenCapture = () => {
  const [roster, setRoster] = useState<readonly RaidRosterSlot[]>(createInitialRoster);
  const [framesScanned, setFramesScanned] = useState(0);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [autoArkPassiveLookup, setAutoArkPassiveLookup] = useState(true);

  const recognizer = useMemo(() => new RaidPartyFrameRecognizer(), []);

  const handleResult = useCallback((result: RaidFrameObservation) => {
    setFramesScanned((count) => count + 1);
    setLastScanAt(result.scannedAt);
    setRoster((current) => applyRecognitionToRoster(current, result.observations, {
      preserveConfirmedNicknames: !autoArkPassiveLookup,
    }));
  }, [autoArkPassiveLookup]);

  const handleSessionStart = useCallback(() => {
    setFramesScanned(0);
    setLastScanAt(null);
  }, []);

  useEffect(() => {
    if (!autoArkPassiveLookup) return;
    const targets = roster.filter((slot) => (
      slot.className !== ''
      && normalizeRaidNickname(slot.nickname) === slot.nickname
      && slot.arkPassiveStatus === 'idle'
    )).slice(0, 1);
    if (targets.length === 0) return;

    const timer = window.setTimeout(() => {
      setRoster((current) => current.map((slot) => (
        targets.some((target) => target.id === slot.id && target.nickname === slot.nickname)
          ? { ...slot, arkPassiveStatus: 'loading' as const, arkPassiveMessage: '아크패시브 조회 중', needsReview: true }
          : slot
      )));
      targets.forEach((target) => {
        void lookupRaidArkPassiveCandidates(
          target.nicknameCandidates.length > 0 ? target.nicknameCandidates : [target.nickname],
          target.className,
        )
          .then((result) => {
            setRoster((current) => current.map((slot) => {
              if (slot.id !== target.id || slot.nickname !== target.nickname || slot.className !== target.className) return slot;
              return {
                ...slot,
                nickname: result.nickname,
                nicknameCandidates: [result.nickname],
                arkPassiveTitle: result.title,
                resolvedRole: result.role,
                resolvedPosition: result.position,
                arkPassiveStatus: result.needsReview ? 'review' as const : 'confirmed' as const,
                arkPassiveMessage: result.needsReview ? '포지션 매핑 확인 필요' : '아크패시브 확인됨',
                needsReview: result.needsReview,
              };
            }));
          })
          .catch((lookupError: unknown) => {
            setRoster((current) => current.map((slot) => {
              if (slot.id !== target.id || slot.nickname !== target.nickname || slot.className !== target.className) return slot;
              return {
                ...slot,
                arkPassiveStatus: 'error' as const,
                arkPassiveMessage: lookupError instanceof Error ? lookupError.message : '아크패시브 조회 실패',
                needsReview: true,
              };
            }));
          });
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [autoArkPassiveLookup, roster]);

  const recognition = useScreenRecognition<RaidFrameObservation>({
    recognizer,
    onResult: handleResult,
    intervalMs: SCAN_INTERVAL_MS,
    getErrorMessage: getRaidRecognitionErrorMessage,
    unsupportedMessage: UNSUPPORTED_MESSAGE,
    onSessionStart: handleSessionStart,
  });

  return {
    roster,
    setRoster,
    framesScanned,
    lastScanAt,
    autoArkPassiveLookup,
    setAutoArkPassiveLookup,
    ...recognition,
  };
};
