import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ApplicantIncidentMini from './ApplicantIncidentMini';
import { createApplicantReview } from './applicantIncidentSearch';

const applicant = {
  ...createApplicantReview(0, '백정핑', ['백정핑']),
  searchStatus: 'review' as const,
  results: [{
    title: '백정핑 관련 게시글',
    url: 'https://www.inven.co.kr/board/lostark/5355/236999',
    matchedNicknames: ['원정대부캐'],
  }],
};

describe('ApplicantIncidentMini', () => {
  it('shows a green, scoped PASS state without claiming the applicant is safe', () => {
    render(<ApplicantIncidentMini
      applicants={[{
        ...createApplicantReview(0, '검색닉'),
        searchStatus: 'empty',
        checkedNicknames: ['검색닉', '원정대부캐'],
      }]}
      status="review"
      error={null}
      framesScanned={2}
      start={async () => {}}
      stop={async () => {}}
      editNickname={() => {}}
      search={() => {}}
      close={() => {}}
    />);

    expect(screen.getByText('인벤 검색 기준 PASS')).toHaveClass('text-emerald-700');
    expect(screen.getByText('원정대 제목·대상자 구간 일치 결과 없음')).toBeInTheDocument();
    expect(screen.getByText(/원정대 2개 캐릭터의 게시글 제목과 본문 대상자 구간/)).toBeInTheDocument();
    expect(screen.getByText(/검색 결과 없음이 안전을 보장하지는 않습니다/)).toBeInTheDocument();
  });

  it('shares applicant editing, search results, and capture controls with the main page', () => {
    const start = vi.fn(async () => {});
    const editNickname = vi.fn();
    const search = vi.fn();

    render(<ApplicantIncidentMini
      applicants={[applicant]}
      status="review"
      error={null}
      framesScanned={2}
      start={start}
      stop={async () => {}}
      editNickname={editNickname}
      search={search}
      close={() => {}}
    />);

    expect(screen.getByText('일치 원정대 캐릭터: 원정대부캐')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /백정핑 관련 게시글/ })).toHaveAttribute(
      'href',
      'https://www.inven.co.kr/board/lostark/5355/236999',
    );
    fireEvent.change(screen.getByRole('combobox', { name: '신청자 1 닉네임' }), {
      target: { value: '수정닉' },
    });
    expect(editNickname).toHaveBeenCalledWith('applicant-0', '수정닉');
    fireEvent.click(screen.getByRole('button', { name: '다시 검색' }));
    expect(search).toHaveBeenCalledWith('applicant-0');
    fireEvent.click(screen.getByRole('button', { name: '화면 공유 시작' }));
    expect(start).toHaveBeenCalledOnce();
  });
});
