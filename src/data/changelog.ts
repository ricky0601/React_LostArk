/** 사용자에게 노출되는 업데이트 내역의 단일 진실 공급원(SoT).
 *  /changelog 페이지와 NavBar 알림 배지가 모두 이 배열을 읽는다.
 *
 *  작성 규칙:
 *  - 개발 용어가 아니라 사용자가 체감하는 변화를 쓴다. ("리팩터링" X, "계산이 더 정확해졌습니다" O)
 *  - id는 날짜와 분리된 불변 revision id로 작성하며 중복하지 않는다.
 *  - date는 화면에 표시할 'YYYY-MM-DD' 형식이다.
 *  - CHANGELOG는 항상 최신 항목이 먼저 오도록 내림차순 유지. */

export type ChangelogTag = 'added' | 'improved' | 'fixed';

export type ChangelogItem = {
  readonly tag: ChangelogTag;
  readonly text: string;
};

export type ChangelogEntry = {
  /** 확인 상태와 React key에 사용하는 불변 revision id. */
  readonly id: string;
  /** 화면에 표시할 날짜. 'YYYY-MM-DD' 형식. */
  readonly date: string;
  /** 목록에 표시할 한 줄 요약. */
  readonly title: string;
  readonly items: readonly ChangelogItem[];
};

export const CHANGELOG_TAG_LABEL: Readonly<Record<ChangelogTag, string>> = {
  added: '추가',
  improved: '개선',
  fixed: '수정',
};

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    id: 'release-004',
    date: '2026-08-03',
    title: '전투력 시뮬레이터 편집과 계산 보정',
    items: [
      { tag: 'added', text: '업데이트 내역 페이지와 새 소식 알림을 추가했습니다.' },
      { tag: 'improved', text: '장비 티어와 공용 선택 옵션을 더 쉽게 조정할 수 있게 정리했습니다.' },
      { tag: 'fixed', text: '공용 각인, 완갑, 97돌 기본 공격력 계산이 더 정확하게 반영되도록 보정했습니다.' },
      { tag: 'fixed', text: '아크 그리드 이름과 광휘 보석 타입 표시가 비어 보이는 문제를 줄였습니다.' },
    ],
  },
  {
    id: 'release-003',
    date: '2026-07-31',
    title: '전투력 시뮬레이터 장비 계산 확장',
    items: [
      { tag: 'added', text: '완갑 장비를 시뮬레이션에 포함해 전투력 변화를 확인할 수 있게 했습니다.' },
      { tag: 'fixed', text: '보석과 연마 효과가 전투력 계산에 반영되는 방식을 보정했습니다.' },
    ],
  },
  {
    id: 'release-002',
    date: '2026-07-28',
    title: '전투력 시뮬레이터 계산 보완',
    items: [
      { tag: 'improved', text: '전투력 시뮬레이터의 아크 그리드 계산 정확도를 높였습니다.' },
      { tag: 'improved', text: '아크 그리드 설정 화면을 분리해 조작이 쉬워졌습니다.' },
    ],
  },
  {
    id: 'release-001',
    date: '2026-07-20',
    title: '전투력 시뮬레이터 공개 (Beta)',
    items: [
      { tag: 'added', text: '장비·보석·각인·아크 그리드를 바꿔가며 전투력 변화를 확인할 수 있습니다.' },
      { tag: 'added', text: '캐릭터 조회 결과를 시뮬레이터로 바로 불러올 수 있습니다.' },
    ],
  },
];

/** 최신 항목의 id. 사용자가 전체 내역을 확인했을 때 저장할 기준값. */
export const LATEST_CHANGELOG_ID: string = CHANGELOG[0]?.id ?? '';

/** 표시용 날짜 문자열. id('2026-07-28')를 '2026.07.28'로 변환. */
export const formatChangelogDate = (id: string): string => id.split('-').join('.');
