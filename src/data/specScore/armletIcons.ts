const ARMLET_ICON_CDN_BASE = 'https://cdn-lostark.game.onstove.com/efui_iconatlas/bracer/bracer_';

const CLASS_TO_BRACER_BASE_NUMBER: Readonly<Record<string, number>> = {
  디스트로이어: 1,
  버서커: 1,
  워로드: 1,
  홀리나이트: 1,
  발키리: 2,
  슬레이어: 2,
  바드: 3,
  서머너: 3,
  소서리스: 3,
  아르카나: 3,
  인파이터: 4,
  배틀마스터: 4,
  창술사: 4,
  기공사: 4,
  브레이커: 5,
  스트라이커: 5,
  데모닉: 6,
  리퍼: 6,
  블레이드: 6,
  소울이터: 6,
  호크아이: 7,
  스카우터: 7,
  블래스터: 7,
  데빌헌터: 7,
  건슬링어: 8,
  도화가: 9,
  기상술사: 9,
  환수사: 9,
  차원술사: 10,
  가디언나이트: 11,
};

const ARMLET_GRADE_OFFSET: Readonly<Record<string, number>> = {
  미착용: 0,
  영웅: 0,
  전설: 11,
  유물: 22,
  고대: 33,
};

export const resolveArmletIconUrl = (characterClassName: string, grade: string): string | null => {
  const baseNumber = CLASS_TO_BRACER_BASE_NUMBER[characterClassName];
  const gradeOffset = ARMLET_GRADE_OFFSET[grade];
  if (baseNumber === undefined || gradeOffset === undefined) return null;

  return `${ARMLET_ICON_CDN_BASE}${baseNumber + gradeOffset}.png`;
};
