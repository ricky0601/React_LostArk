import type { CSSProperties } from 'react';

const VIEWPORT_GUTTER = 8;
const PANEL_GAP = 4;
const PREFERRED_PANEL_HEIGHT = 256;
const MIN_OPEN_SPACE = 160;

export const getSpecSelectPanelStyle = (trigger: HTMLButtonElement): CSSProperties => {
  const rect = trigger.getBoundingClientRect();
  const maxLeft = Math.max(VIEWPORT_GUTTER, window.innerWidth - rect.width - VIEWPORT_GUTTER);
  const left = Math.min(Math.max(rect.left, VIEWPORT_GUTTER), maxLeft);
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER;
  const spaceAbove = rect.top - VIEWPORT_GUTTER;
  const openAbove = spaceBelow < Math.min(PREFERRED_PANEL_HEIGHT, MIN_OPEN_SPACE)
    && spaceAbove > spaceBelow;

  return {
    position: 'fixed',
    left,
    width: rect.width,
    zIndex: 60,
    ...(openAbove
      ? { bottom: window.innerHeight - rect.top + PANEL_GAP }
      : { top: rect.bottom + PANEL_GAP }),
  };
};
