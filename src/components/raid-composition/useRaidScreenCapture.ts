import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScreenRecognition } from '../screen-recognition/useScreenRecognition';
import { RaidPartyFrameRecognizer } from './RaidPartyFrameRecognizer';
import { clearRaidArkPassiveLookupCache, lookupRaidArkPassiveCandidates } from './raidArkPassiveLookup';
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
  const [autoArkPassiveLookup, setAutoArkPassiveLookupState] = useState(false);
  const rosterRef = useRef(roster);
  rosterRef.current = roster;
  const activeLookups = useRef(new Map<string, {
    identity: string;
    controller: AbortController;
    timer: number;
  }>());

  const recognizer = useMemo(() => new RaidPartyFrameRecognizer(), []);

  const handleResult = useCallback((result: RaidFrameObservation) => {
    setFramesScanned((count) => count + 1);
    setLastScanAt(result.scannedAt);
    setRoster((current) => applyRecognitionToRoster(current, result.observations, {
      preserveConfirmedNicknames: true,
    }));
  }, []);

  const handleSessionStart = useCallback(() => {
    setFramesScanned(0);
    setLastScanAt(null);
  }, []);

  const cancelLookups = useCallback(() => {
    activeLookups.current.forEach(({ controller, timer }) => {
      window.clearTimeout(timer);
      controller.abort();
    });
    activeLookups.current.clear();
  }, []);

  const setAutoArkPassiveLookup = useCallback((enabled: boolean) => {
    if (!enabled) {
      const cancelledIds = new Set(activeLookups.current.keys());
      cancelLookups();
      setRoster((current) => current.map((slot) => (
        cancelledIds.has(slot.id) && slot.arkPassiveStatus === 'loading'
          ? { ...slot, arkPassiveStatus: 'idle' as const, arkPassiveMessage: '' }
          : slot
      )));
    }
    setAutoArkPassiveLookupState(enabled);
  }, [cancelLookups]);

  useEffect(() => {
    activeLookups.current.forEach((active, id) => {
      const slot = roster.find((candidate) => candidate.id === id);
      const identity = slot ? `${slot.className}:${slot.nickname}` : '';
      if (!autoArkPassiveLookup || identity !== active.identity || slot?.buildSource === 'manual') {
        window.clearTimeout(active.timer);
        active.controller.abort();
        activeLookups.current.delete(id);
      }
    });
    if (!autoArkPassiveLookup || activeLookups.current.size > 0) return;
    const target = roster.find((slot) => (
      slot.className !== ''
      && normalizeRaidNickname(slot.nickname) === slot.nickname
      && slot.arkPassiveStatus === 'idle'
      && slot.buildSource !== 'manual'
    ));
    if (!target) return;

    const controller = new AbortController();
    const identity = `${target.className}:${target.nickname}`;
    const ownsTarget = () => {
      const currentSlot = rosterRef.current.find((slot) => slot.id === target.id);
      return activeLookups.current.get(target.id)?.controller === controller
        && !controller.signal.aborted
        && currentSlot?.buildSource !== 'manual'
        && `${currentSlot?.className}:${currentSlot?.nickname}` === identity;
    };
    const timer = window.setTimeout(() => {
      if (!ownsTarget()) {
        if (activeLookups.current.get(target.id)?.controller === controller) {
          controller.abort();
          activeLookups.current.delete(target.id);
        }
        return;
      }
      setRoster((current) => current.map((slot) => (
        slot.id === target.id && `${slot.className}:${slot.nickname}` === identity && slot.buildSource !== 'manual'
          ? { ...slot, arkPassiveStatus: 'loading' as const, arkPassiveMessage: '아크패시브 조회 중', needsReview: true }
          : slot
      )));
      void lookupRaidArkPassiveCandidates(
        target.nicknameCandidates.length > 0 ? target.nicknameCandidates : [target.nickname],
        target.className,
        controller.signal,
      )
        .then((result) => {
          if (!ownsTarget()) return;
          setRoster((current) => current.map((slot) => {
            if (slot.id !== target.id || `${slot.className}:${slot.nickname}` !== identity || slot.buildSource === 'manual') return slot;
            return {
              ...slot,
              nickname: slot.nicknameSource === 'manual' ? slot.nickname : result.nickname,
              nicknameCandidates: slot.nicknameSource === 'manual' ? slot.nicknameCandidates : [result.nickname],
              arkPassiveTitle: result.title,
              buildSource: 'recognition' as const,
              resolvedRole: result.role,
              resolvedPosition: result.position,
              arkPassiveStatus: result.needsReview ? 'review' as const : 'confirmed' as const,
              arkPassiveMessage: result.needsReview ? '포지션 매핑 확인 필요' : '아크패시브 확인됨',
              needsReview: result.needsReview,
            };
          }));
        })
        .catch((lookupError: unknown) => {
          if (!ownsTarget()) return;
          setRoster((current) => current.map((slot) => {
            if (slot.id !== target.id || `${slot.className}:${slot.nickname}` !== identity || slot.buildSource === 'manual') return slot;
            return {
              ...slot,
              arkPassiveStatus: 'error' as const,
              arkPassiveMessage: lookupError instanceof Error ? lookupError.message : '아크패시브 조회 실패',
              needsReview: true,
            };
          }));
        })
        .finally(() => {
          if (activeLookups.current.get(target.id)?.controller === controller) {
            activeLookups.current.delete(target.id);
          }
        });
    }, 400);
    activeLookups.current.set(target.id, { identity, controller, timer });
  }, [autoArkPassiveLookup, roster]);

  useEffect(() => cancelLookups, [cancelLookups]);

  const recognition = useScreenRecognition<RaidFrameObservation>({
    recognizer,
    onResult: handleResult,
    intervalMs: SCAN_INTERVAL_MS,
    getErrorMessage: getRaidRecognitionErrorMessage,
    unsupportedMessage: UNSUPPORTED_MESSAGE,
    onSessionStart: handleSessionStart,
  });

  const reset = useCallback(() => {
    cancelLookups();
    clearRaidArkPassiveLookupCache();
    recognition.reset();
    setAutoArkPassiveLookupState(false);
    setRoster(createInitialRoster());
    setFramesScanned(0);
    setLastScanAt(null);
  }, [cancelLookups, recognition]);

  return {
    roster,
    setRoster,
    framesScanned,
    lastScanAt,
    autoArkPassiveLookup,
    setAutoArkPassiveLookup,
    ...recognition,
    reset,
  };
};
