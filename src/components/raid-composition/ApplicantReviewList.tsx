import React from 'react';
import {
  isValidApplicantNickname,
  type ApplicantReview,
} from './applicantIncidentSearch';

const STATUS_PRESENTATION = {
  idle: {
    label: '검색 전 · 자동 검색 대기',
    card: 'border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]',
    badge: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  },
  loading: {
    label: '검색 중',
    card: 'border-blue-200 bg-blue-50/40 dark:border-blue-400/20 dark:bg-blue-500/5',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  },
  empty: {
    label: '인벤 검색 기준 PASS',
    card: 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-400/30 dark:bg-emerald-500/10',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  },
  review: {
    label: '원문 확인 필요',
    card: 'border-amber-300 bg-amber-50/40 dark:border-amber-400/30 dark:bg-amber-500/10',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  },
  error: {
    label: '조회 실패',
    card: 'border-red-300 bg-red-50/40 dark:border-red-400/30 dark:bg-red-500/10',
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200',
  },
} as const;

interface ApplicantReviewListProps {
  readonly applicants: readonly ApplicantReview[];
  readonly emptyMessage: string;
  readonly onEditNickname: (id: string, nickname: string) => void;
  readonly onSearch: (id: string) => void;
  readonly compact?: boolean;
}

const ApplicantReviewList: React.FC<ApplicantReviewListProps> = ({
  applicants,
  emptyMessage,
  onEditNickname,
  onSearch,
  compact = false,
}) => {
  if (applicants.length === 0) {
    return (
      <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {applicants.map((applicant) => {
        const invalid = applicant.nickname !== '' && !isValidApplicantNickname(applicant.nickname);
        const status = STATUS_PRESENTATION[applicant.searchStatus];
        return (
          <li key={applicant.id} className={`rounded-lg border p-3 transition-colors ${status.card}`}>
            <div className={`flex gap-2 ${compact ? 'flex-col' : 'flex-col sm:flex-row sm:items-center'}`}>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                신청자 {applicant.row + 1} 닉네임
                <input
                  aria-label={`신청자 ${applicant.row + 1} 닉네임`}
                  aria-invalid={invalid}
                  aria-describedby={`${applicant.id}-review${invalid ? ` ${applicant.id}-validation` : ''}`}
                  value={applicant.nickname}
                  list={`${applicant.id}-candidates`}
                  maxLength={12}
                  onChange={(event) => onEditNickname(applicant.id, event.target.value)}
                  className="min-h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <datalist id={`${applicant.id}-candidates`}>
                  {applicant.nicknameCandidates.slice(0, 12).map((candidate) => <option key={candidate} value={candidate} />)}
                </datalist>
              </label>
              <button
                type="button"
                disabled={!isValidApplicantNickname(applicant.nickname) || applicant.searchStatus === 'loading'}
                onClick={() => onSearch(applicant.id)}
                className="min-h-10 rounded-md bg-red-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applicant.searchStatus === 'loading' ? '검색 중...' : '다시 검색'}
              </button>
            </div>
            <p id={`${applicant.id}-review`} className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {applicant.source === 'recognition' ? 'OCR 자동 인식 결과입니다. 필요하면 닉네임을 수정해 주세요.' : '수정한 닉네임으로 자동 검색합니다.'}
            </p>
            {invalid && (
              <p id={`${applicant.id}-validation`} className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                한글·영문·숫자 2~12자로 확인해 주세요.
              </p>
            )}
            <div className="mt-2" aria-live="polite">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status.badge}`}>
                {status.label}
              </span>
            </div>
            {applicant.searchStatus === 'empty' && (
              <div className="mt-2 rounded-md border border-emerald-200 bg-white/70 p-3 dark:border-emerald-400/20 dark:bg-black/10">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">제목·대상자 구간 일치 결과 없음</p>
                <p className="mt-1 text-xs leading-5 text-emerald-800/80 dark:text-emerald-100/80">
                  게시글 제목과 본문의 대상자 구간에서 일치 닉네임을 찾지 못했습니다. 검색 결과 없음이 안전을 보장하지는 않습니다.
                </p>
              </div>
            )}
            {applicant.searchStatus === 'error' && <p role="alert" className="mt-2 text-sm text-red-500">{applicant.error}</p>}
            {applicant.searchStatus === 'review' && (
              <ul className="mt-2 space-y-2">
                {applicant.results.map((result) => (
                  <li key={result.url}>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${result.title} (새 창에서 열림)`}
                      className="text-sm font-semibold text-la-gold-dark underline dark:text-la-gold"
                    >
                      {result.title} <span className="text-xs font-normal">(새 창)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default ApplicantReviewList;
