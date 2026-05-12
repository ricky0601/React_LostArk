/**
 * 장비/장신구 등급·품질 색상 공통 유틸
 * - 캐릭터 페이지, 비교 페이지에서 사용
 *
 * 등급 색상은 hex로 한 곳(GRADE_DEFS)에 정의하고,
 * helper가 CSS variable 기반의 className+style을 반환해서 동적으로 매핑한다.
 * 실제 시각 효과(보더/배경/그라데이션)는 .grade-frame-* CSS 클래스가 담당.
 */

import type { CSSProperties } from 'react';

/** 등급별 색상 정의 */
type GradeDef = {
  /** 1색 (단색 등급) 또는 2색 (그라데이션 등급).
   *  알파를 포함한 hex(#RRGGBBAA)도 가능 — 단색 등급에 알파를 박아 옅게 표현. */
  colors: readonly [string] | readonly [string, string];
  /** 텍스트 색 (라이트/다크 분기) */
  text: { light: string; dark: string };
};

/**
 * 등급별 보더 그라데이션 — 실제 로스트아크 등급 색상 정의(--item-grade-*)와 일치.
 * 모든 등급이 두 색 그라데이션이며 진한 톤 → 밝은 톤 방향(135deg).
 * 텍스트 색은 라이트/다크 모드 가독성을 위해 별도 정의.
 */
const GRADE_DEFS: Record<string, GradeDef> = {
  일반:   { colors: ['#1E1E1E', '#585858'], text: { light: '#6B7280', dark: '#9CA3AF' } },
  고급:   { colors: ['#161E0C', '#3A5A11'], text: { light: '#16A34A', dark: '#4ADE80' } },
  희귀:   { colors: ['#111B27', '#113F5F'], text: { light: '#2563EB', dark: '#60A5FA' } },
  영웅:   { colors: ['#21142C', '#520F68'], text: { light: '#9333EA', dark: '#C084FC' } },
  전설:   { colors: ['#311D01', '#B16800'], text: { light: '#EA580C', dark: '#FB923C' } },
  유물:   { colors: ['#2E1708', '#AB4102'], text: { light: '#DC2626', dark: '#F87171' } },
  고대:   { colors: ['#433829', '#F5DFAB'], text: { light: '#5C4A2E', dark: '#F5DFAB' } },
  에스더: { colors: ['#0C2E2C', '#2FABA8'], text: { light: '#0891B2', dark: '#67E8F9' } },
};

const DEFAULT_DEF: GradeDef = {
  colors: ['#9CA3AF66'],
  text: { light: '#6B7280', dark: '#9CA3AF' },
};

/** 등급 프레임 적용 모드
 *  - 'border': 그라데이션 보더만
 *  - 'subtle': 보더 + 옅은(25%) 배경 — 뱃지/패시브용
 *  - 'bg':     보더 + 진한 그라데이션 배경 + padding — 코어 강조용 */
export type FrameMode = 'border' | 'subtle' | 'bg';

export type FrameProps = { className: string; style: CSSProperties };

const FRAME_CLASS: Record<FrameMode, string> = {
  border: 'grade-frame-border',
  subtle: 'grade-frame-subtle',
  bg: 'grade-frame-bg',
};

/** 등급에 해당하는 프레임 className + CSS variable을 반환.
 *  사용: const { className, style } = gradeFrame(grade); → <div className={`... ${className}`} style={style}> */
export function gradeFrame(grade: string, mode: FrameMode = 'border'): FrameProps {
  const def = GRADE_DEFS[grade] ?? DEFAULT_DEF;
  const [c1, c2 = c1] = def.colors;
  return {
    className: FRAME_CLASS[mode],
    style: { '--grade-c1': c1, '--grade-c2': c2 } as CSSProperties,
  };
}

/** 등급에 해당하는 텍스트 색상 className + CSS variable을 반환 */
export function gradeText(grade: string): FrameProps {
  const def = GRADE_DEFS[grade] ?? DEFAULT_DEF;
  return {
    className: 'grade-frame-text',
    style: { '--grade-text-light': def.text.light, '--grade-text-dark': def.text.dark } as CSSProperties,
  };
}

/** 프레임 + 텍스트를 한꺼번에 적용할 때 사용하는 헬퍼 (style 객체 병합) */
export function gradeStyles(grade: string, mode: FrameMode = 'border'): FrameProps {
  const f = gradeFrame(grade, mode);
  const t = gradeText(grade);
  return {
    className: `${f.className} ${t.className}`,
    style: { ...f.style, ...t.style },
  };
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
