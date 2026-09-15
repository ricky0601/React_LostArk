import React from 'react';
import { createPortal } from 'react-dom';
import NavBar from '../components/NavBar';
import ApplicantIncidentMini from '../components/raid-composition/ApplicantIncidentMini';
import ApplicantReviewList from '../components/raid-composition/ApplicantReviewList';
import RaidCompositionTabs from '../components/raid-composition/RaidCompositionTabs';
import { useApplicantIncidentLookup } from '../components/raid-composition/useApplicantIncidentLookup';
import { useApplicantScreenCapture } from '../components/raid-composition/useApplicantScreenCapture';
import { useDocumentPictureInPicture } from '../hooks/useDocumentPictureInPicture';

const CAPTURE_STATUS_LABEL = {
  idle: '화면 공유 대기',
  requesting: '공유 화면 선택 중',
  sharing: '실시간 인식 중',
  review: '화면 공유 종료 · 인식 결과 검토 중',
  error: '화면 공유 오류',
} as const;

const RaidApplicantsPage: React.FC = () => {
  const lookup = useApplicantIncidentLookup();
  const capture = useApplicantScreenCapture(lookup.applyRecognition);
  const miniWindow = useDocumentPictureInPicture({
    title: '신청자 사사게 조회',
    rootId: 'raid-applicants-mini-root',
  });
  const isSharing = capture.status === 'sharing' || capture.status === 'requesting';

  const reset = () => {
    capture.reset();
    lookup.reset();
  };

  return (
    <>
      <NavBar />
      <RaidCompositionTabs />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
        <header className="rounded-xl bg-gradient-to-br from-red-500/10 via-la-gold/10 to-transparent p-4 sm:p-5">
          <p className="text-xs font-bold text-red-600 dark:text-red-300">신청자 확인 보조</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">신청자 사건·사고 게시글 조회</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            파티 찾기 신청자 탭을 화면 공유로 읽으면 인식된 닉네임을 자동으로 검색합니다.
          </p>
        </header>

        <aside aria-label="필수 안내" className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <h2 className="font-bold">조회 전 반드시 확인해 주세요</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 leading-6">
            <li>공유 이미지는 브라우저 안에서만 인식하며 저장하거나 서버로 전송하지 않습니다.</li>
            <li>OCR이 안정화되면 인식된 닉네임이 인벤 검색을 위해 자동 전송됩니다. OCR은 틀릴 수 있으므로 결과를 확인하고 필요하면 수정해 주세요.</li>
            <li>검색 결과가 없어도 안전한 사용자임을 보장하지 않습니다.</li>
            <li>검색 결과가 있어도 동일 인물 또는 게시글 내용이 사실임을 보장하지 않습니다.</li>
            <li>검색 결과만으로 사용자를 자동 차단하지 않습니다. 인벤 원문을 직접 확인해 판단해 주세요.</li>
          </ul>
        </aside>

        <section aria-label="신청자 화면 공유" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto">
              <h2 className="font-bold text-gray-900 dark:text-white"><span className="mr-2 text-la-gold-dark dark:text-la-gold">1</span>신청자 화면 불러오기</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">1920×1080 Lost Ark 창에서 파티 찾기 &gt; 신청자 탭을 열어 주세요.</p>
            </div>
            {isSharing ? (
              <button type="button" onClick={() => { void capture.stop(); }} className="min-h-10 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white">화면 공유 중지</button>
            ) : (
              <button type="button" onClick={() => { void capture.start(); }} className="min-h-10 rounded-md bg-la-gold px-4 py-2 text-sm font-bold text-white">화면 공유 시작</button>
            )}
            <button type="button" onClick={reset} className="min-h-10 rounded-md border border-gray-300 px-3 text-sm dark:border-white/10">초기화</button>
            <button
              type="button"
              onClick={() => { void miniWindow.open(); }}
              disabled={!miniWindow.isSupported}
              className="min-h-10 rounded-md border border-la-gold px-3 text-sm font-semibold text-la-gold-dark disabled:cursor-not-allowed disabled:opacity-50 dark:text-la-gold"
            >
              {miniWindow.pictureInPictureWindow ? '미니 창으로 이동' : '미니 창 열기'}
            </button>
          </div>
          <p aria-live="polite" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {CAPTURE_STATUS_LABEL[capture.status]}
            {capture.status === 'sharing' ? ` · ${capture.framesScanned}회 분석` : ''}
          </p>
          {capture.error && <p role="alert" className="mt-1 text-xs text-red-500">{capture.error}</p>}
          {miniWindow.error && <p role="alert" className="mt-1 text-xs text-amber-600 dark:text-amber-300">{miniWindow.error}</p>}
          {!miniWindow.isSupported && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">미니 창은 데스크톱 Chrome 또는 Edge에서 지원됩니다.</p>
          )}
        </section>

        <section aria-label="신청자 검토 및 검색" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="font-bold text-gray-900 dark:text-white"><span className="mr-2 text-la-gold-dark dark:text-la-gold">2</span>닉네임 자동 검색 및 검토</h2>
          <div className="mt-3">
            <ApplicantReviewList
              applicants={lookup.applicants}
              emptyMessage={capture.framesScanned === 0
                ? '화면 공유를 시작하면 신청자 닉네임이 여기에 표시됩니다.'
                : '현재 화면에서 인식된 신청자가 없습니다.'}
              onEditNickname={lookup.editNickname}
              onSearch={lookup.search}
            />
          </div>
        </section>
      </main>
      {miniWindow.portalRoot && createPortal(
        <ApplicantIncidentMini
          applicants={lookup.applicants}
          status={capture.status}
          error={capture.error}
          framesScanned={capture.framesScanned}
          start={capture.start}
          stop={capture.stop}
          editNickname={lookup.editNickname}
          search={lookup.search}
          close={miniWindow.close}
        />,
        miniWindow.portalRoot,
      )}
    </>
  );
};

export default RaidApplicantsPage;
