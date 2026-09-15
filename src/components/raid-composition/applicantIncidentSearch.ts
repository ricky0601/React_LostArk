export type ApplicantSearchStatus = 'idle' | 'loading' | 'empty' | 'review' | 'error';

export interface InvenIncidentResult {
  readonly title: string;
  readonly url: string;
}

export interface ApplicantReview {
  readonly id: string;
  readonly row: number;
  readonly nickname: string;
  readonly nicknameCandidates: readonly string[];
  readonly source: 'recognition' | 'manual';
  readonly needsReview: boolean;
  readonly searchStatus: ApplicantSearchStatus;
  readonly results: readonly InvenIncidentResult[];
  readonly error: string;
}

export const createApplicantReview = (
  row: number,
  nickname = '',
  nicknameCandidates: readonly string[] = [],
): ApplicantReview => ({
  id: `applicant-${row}`,
  row,
  nickname,
  nicknameCandidates,
  source: 'recognition',
  needsReview: true,
  searchStatus: 'idle',
  results: [],
  error: '',
});

export const editApplicantNickname = (applicant: ApplicantReview, nickname: string): ApplicantReview => ({
  ...applicant,
  nickname,
  nicknameCandidates: nickname ? [nickname] : [],
  source: 'manual',
  needsReview: !isValidApplicantNickname(nickname),
  searchStatus: 'idle',
  results: [],
  error: '',
});

export const isValidApplicantNickname = (nickname: string): boolean => (
  /^[가-힣A-Za-z0-9]{2,12}$/.test(nickname.trim())
);

export const fetchApplicantIncidents = async (
  nickname: string,
  signal: AbortSignal,
): Promise<readonly InvenIncidentResult[]> => {
  const response = await fetch(`/api/inven-incidents?nickname=${encodeURIComponent(nickname)}`, { signal });
  const payload = await response.json().catch(() => null) as { results?: InvenIncidentResult[]; message?: string } | null;
  if (!response.ok) throw new Error(payload?.message || '검색 중 오류가 발생했습니다.');
  return Array.isArray(payload?.results) ? payload.results : [];
};
