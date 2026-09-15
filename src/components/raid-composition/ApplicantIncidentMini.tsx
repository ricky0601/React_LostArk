import React from 'react';
import type { ScreenCaptureStatus } from '../screen-recognition';
import ApplicantReviewList from './ApplicantReviewList';
import type { ApplicantReview } from './applicantIncidentSearch';

const STATUS_LABEL: Record<ScreenCaptureStatus, string> = {
  idle: '화면 공유 대기',
  requesting: '공유 화면 선택 중',
  sharing: '실시간 인식 중',
  review: '공유 종료 · 결과 검토 중',
  error: '화면 공유 오류',
};

interface ApplicantIncidentMiniProps {
  readonly applicants: readonly ApplicantReview[];
  readonly status: ScreenCaptureStatus;
  readonly error: string | null;
  readonly framesScanned: number;
  readonly start: (mediaDevices?: MediaDevices) => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly editNickname: (id: string, nickname: string) => void;
  readonly search: (id: string) => void;
  readonly close: () => void;
}

const ApplicantIncidentMini: React.FC<ApplicantIncidentMiniProps> = ({
  applicants,
  status,
  error,
  framesScanned,
  start,
  stop,
  editNickname,
  search,
  close,
}) => {
  const isSharing = status === 'sharing' || status === 'requesting';
  const startFromThisWindow = (event: React.MouseEvent<HTMLButtonElement>) => {
    const mediaDevices = event.currentTarget.ownerDocument.defaultView?.navigator.mediaDevices;
    void start(mediaDevices);
  };

  return (
    <main className="flex min-h-screen flex-col gap-3 p-3 text-sm">
      <header className="sticky top-0 z-10 -mx-3 -mt-3 border-b border-gray-200 bg-gray-50/95 p-3 backdrop-blur dark:border-white/10 dark:bg-la-dark/95">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-bold">신청자 사사게 조회</h1>
            <p className={`mt-0.5 text-xs ${status === 'sharing' ? 'font-semibold text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {STATUS_LABEL[status]}{framesScanned > 0 && ` · ${framesScanned}회 분석`}
            </p>
          </div>
          <button type="button" onClick={close} className="min-h-9 rounded-md border border-gray-300 px-2 dark:border-white/10">
            닫기
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          {isSharing ? (
            <button type="button" onClick={() => { void stop(); }} className="min-h-9 flex-1 rounded-md bg-red-500 px-3 font-semibold text-white">
              화면 공유 중지
            </button>
          ) : (
            <button type="button" onClick={startFromThisWindow} className="min-h-9 flex-1 rounded-md bg-la-gold px-3 font-semibold text-white">
              화면 공유 시작
            </button>
          )}
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
      </header>

      <p className="rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
        인식된 닉네임은 자동 검색됩니다. 결과만으로 차단하지 말고 인벤 원문을 직접 확인하세요.
      </p>
      <ApplicantReviewList
        applicants={applicants}
        emptyMessage={framesScanned === 0 ? '화면 공유를 시작해 주세요.' : '현재 화면에서 인식된 신청자가 없습니다.'}
        onEditNickname={editNickname}
        onSearch={search}
        compact
      />
    </main>
  );
};

export default ApplicantIncidentMini;
