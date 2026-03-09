/**
 * 장비/장신구 등급·품질 색상 공통 유틸
 * - 캐릭터 페이지, 비교 페이지에서 사용
 */

export type GradeStyle = { border: string; bg: string; text: string };

/** 장비 등급 색상 (일반 ~ 에스더) */
export const GRADE_COLORS: Record<string, GradeStyle> = {
  일반: { border: 'border-gray-400/60', bg: 'bg-gray-400/15', text: 'text-gray-500' },
  고급: { border: 'border-green-500/60', bg: 'bg-green-500/15', text: 'text-green-500' },
  희귀: { border: 'border-blue-500/60', bg: 'bg-blue-500/15', text: 'text-blue-500' },
  영웅: { border: 'border-purple-500/60', bg: 'bg-purple-500/15', text: 'text-purple-400' },
  전설: { border: 'border-orange-500/60', bg: 'bg-orange-500/15', text: 'text-orange-400' },
  유물: { border: 'border-red-500/60', bg: 'bg-red-500/15', text: 'text-red-400' },
  고대: { border: 'border-amber-400/60', bg: 'bg-amber-400/15', text: 'text-amber-400' },
  에스더: { border: 'border-cyan-400/60', bg: 'bg-cyan-400/15', text: 'text-cyan-400' },
};

const DEFAULT_GRADE: GradeStyle = { border: 'border-gray-400/40', bg: 'bg-gray-400/15', text: 'text-gray-400' };

export function gradeStyle(grade: string): GradeStyle {
  return GRADE_COLORS[grade] ?? DEFAULT_GRADE;
}

/** 추가효과(연마 효과 등) 등급 색상: 하/중/상/최상 */
export const EFFECT_GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  하: { bg: 'bg-gray-500/60', text: 'text-gray-200' },
  중: { bg: 'bg-blue-600/60', text: 'text-blue-100' },
  상: { bg: 'bg-orange-500/60', text: 'text-orange-100' },
  최상: { bg: 'bg-red-500/60', text: 'text-red-100' },
};

/** 품질(0~100) 텍스트 색상 클래스: 100 노랑, 90~99 보라, 70~89 하늘, 30~69 연두, 10~29 연한노랑, 0~9 빨강 */
export function qualityTextColor(q: number): string {
  if (q >= 100) return 'text-yellow-400';
  if (q >= 90) return 'text-purple-400';
  if (q >= 70) return 'text-sky-400';
  if (q >= 30) return 'text-lime-400';
  if (q >= 10) return 'text-yellow-200';
  return 'text-red-500';
}

/** 품질(0~100) 게이지 바 배경 색상 클래스 */
export function qualityBgColor(q: number): string {
  if (q >= 100) return 'bg-yellow-400';
  if (q >= 90) return 'bg-purple-500';
  if (q >= 70) return 'bg-sky-400';
  if (q >= 30) return 'bg-lime-400';
  if (q >= 10) return 'bg-yellow-200';
  return 'bg-red-500';
}
