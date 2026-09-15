import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApplicantFrameObservation } from './ApplicantFrameRecognizer';
import {
  createApplicantReview,
  editApplicantNickname,
  fetchApplicantIncidents,
  isValidApplicantNickname,
  type ApplicantReview,
} from './applicantIncidentSearch';

const AUTO_SEARCH_DELAY_MS = 500;

export const useApplicantIncidentLookup = () => {
  const [applicants, setApplicants] = useState<readonly ApplicantReview[]>([]);
  const applicantsRef = useRef(applicants);
  applicantsRef.current = applicants;
  const requests = useRef(new Map<string, { controller: AbortController; identity: symbol }>());
  const searchTimers = useRef(new Map<string, number>());
  const absentFrames = useRef(new Map<number, number>());

  const cancelLookup = useCallback((id: string) => {
    const timer = searchTimers.current.get(id);
    if (timer != null) window.clearTimeout(timer);
    searchTimers.current.delete(id);
    requests.current.get(id)?.controller.abort();
    requests.current.delete(id);
  }, []);

  const applyRecognition = useCallback((observation: ApplicantFrameObservation) => {
    const current = applicantsRef.current;
    const idsToAbort: string[] = [];
    const next = observation.rows.flatMap((row) => {
      const existing = current.find((candidate) => candidate.row === row.row);
      if (!row.occupied) {
        const absentCount = (absentFrames.current.get(row.row) ?? 0) + 1;
        absentFrames.current.set(row.row, absentCount);
        if (absentCount < 2) return existing ? [existing] : [];
        if (existing) idsToAbort.push(existing.id);
        return [];
      }
      absentFrames.current.delete(row.row);
      if (!row.nickname) return [existing ?? createApplicantReview(row.row, '', row.nicknameCandidates)];
      // A user correction is authoritative until the row is confirmed vacant or reset.
      if (existing?.source === 'manual') return [existing];
      if (existing?.nickname === row.nickname) return [existing];
      if (existing) idsToAbort.push(existing.id);
      return [createApplicantReview(row.row, row.nickname, row.nicknameCandidates)];
    });
    idsToAbort.forEach(cancelLookup);
    applicantsRef.current = next;
    setApplicants(next);
  }, [cancelLookup]);

  const editNickname = useCallback((id: string, nickname: string) => {
    cancelLookup(id);
    const next = applicantsRef.current.map((applicant) => (
      applicant.id === id ? editApplicantNickname(applicant, nickname) : applicant
    ));
    applicantsRef.current = next;
    setApplicants(next);
  }, [cancelLookup]);

  const search = useCallback((id: string) => {
    const target = applicantsRef.current.find((applicant) => applicant.id === id);
    const nickname = target?.nickname.trim();
    if (!target || !nickname || !isValidApplicantNickname(nickname)) return;
    cancelLookup(id);
    const controller = new AbortController();
    const identity = Symbol(id);
    requests.current.set(id, { controller, identity });
    const loading = applicantsRef.current.map((applicant) => (
      applicant.id === id
        ? { ...applicant, searchStatus: 'loading' as const, results: [], error: '' }
        : applicant
    ));
    applicantsRef.current = loading;
    setApplicants(loading);

    void fetchApplicantIncidents(nickname, controller.signal)
      .then((results) => {
        const active = requests.current.get(id);
        const current = applicantsRef.current.find((applicant) => applicant.id === id);
        if (active?.identity !== identity
          || controller.signal.aborted
          || current?.nickname.trim() !== nickname) return;
        const next = applicantsRef.current.map((applicant) => (
          applicant.id === id
            ? { ...applicant, searchStatus: results.length ? 'review' as const : 'empty' as const, results }
            : applicant
        ));
        applicantsRef.current = next;
        setApplicants(next);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requests.current.get(id)?.identity !== identity) return;
        const next = applicantsRef.current.map((applicant) => (
          applicant.id === id
            ? { ...applicant, searchStatus: 'error' as const, error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.' }
            : applicant
        ));
        applicantsRef.current = next;
        setApplicants(next);
      })
      .finally(() => {
        if (requests.current.get(id)?.identity === identity) requests.current.delete(id);
      });
  }, [cancelLookup]);

  useEffect(() => {
    const searchableIds = new Set<string>();
    applicants.forEach((applicant) => {
      if (applicant.searchStatus !== 'idle' || !isValidApplicantNickname(applicant.nickname)) return;
      searchableIds.add(applicant.id);
      if (searchTimers.current.has(applicant.id) || requests.current.has(applicant.id)) return;
      const timer = window.setTimeout(() => {
        searchTimers.current.delete(applicant.id);
        search(applicant.id);
      }, AUTO_SEARCH_DELAY_MS);
      searchTimers.current.set(applicant.id, timer);
    });
    searchTimers.current.forEach((timer, id) => {
      if (searchableIds.has(id)) return;
      window.clearTimeout(timer);
      searchTimers.current.delete(id);
    });
  }, [applicants, search]);

  const abortAll = useCallback(() => {
    searchTimers.current.forEach((timer) => window.clearTimeout(timer));
    searchTimers.current.clear();
    requests.current.forEach(({ controller }) => controller.abort());
    requests.current.clear();
  }, []);

  const reset = useCallback(() => {
    abortAll();
    absentFrames.current.clear();
    applicantsRef.current = [];
    setApplicants([]);
  }, [abortAll]);

  useEffect(() => abortAll, [abortAll]);

  return { applicants, applyRecognition, editNickname, search, reset };
};
