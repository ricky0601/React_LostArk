import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  QuickMenuState,
  readQuickMenuState,
  reorderQuickMenuItem,
  resetQuickMenuState,
  saveQuickMenuState,
} from './quickMenuOrder';

const QUICK_ACTIONS = [
  {
    to: '/simulation', title: '주간 골드 계산', description: '주간 골드와 숙제 현황', action: '계산하기',
    iconBg: 'bg-amber-500/15', iconText: 'text-amber-700 dark:text-amber-400', ctaText: 'text-amber-700 dark:text-amber-400',
    path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', featured: true,
  },
  {
    to: '/enhancement', title: '재련 계산', description: '재료 시세 기반 강화 비용', action: '계산하기',
    iconBg: 'bg-emerald-500/15', iconText: 'text-emerald-600 dark:text-emerald-400', ctaText: 'text-emerald-600 dark:text-emerald-400',
    path: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M19 14.5l-2.14 3.21a2.25 2.25 0 01-1.873 1.002H9.013A2.25 2.25 0 017.14 17.71L5 14.5m14 0H5', featured: false,
  },
  {
    to: '/spec-simulator', title: '전투력 시뮬', description: '장비와 세팅별 전투력 비교', action: '시뮬하기',
    iconBg: 'bg-violet-500/15', iconText: 'text-violet-600 dark:text-violet-400', ctaText: 'text-violet-600 dark:text-violet-400',
    path: 'M13 10V3L4 14h7v7l9-11h-7z', featured: false,
  },
  {
    to: '/market', title: '시세', description: '각인서·보석 최저가 순위', action: '시세 보기',
    iconBg: 'bg-la-gold/20', iconText: 'text-la-gold-dark dark:text-la-gold', ctaText: 'text-la-gold-dark dark:text-la-gold',
    path: 'M3 10h18M7 15h1m4 0h1m4 0h1M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z', featured: false,
  },
  {
    to: '/compare', title: '캐릭터 비교', description: '두 캐릭터 스펙 비교', action: '비교하기',
    iconBg: 'bg-sky-500/15', iconText: 'text-sky-600 dark:text-sky-400', ctaText: 'text-sky-600 dark:text-sky-400',
    path: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', featured: false,
  },
  {
    to: '/character', title: '캐릭터 검색', description: '캐릭터 정보와 장비 확인', action: '검색하기',
    iconBg: 'bg-cyan-500/15', iconText: 'text-cyan-600 dark:text-cyan-400', ctaText: 'text-cyan-600 dark:text-cyan-400',
    path: 'M15.75 15.75L19.5 19.5m-1.5-8.25a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z', featured: false,
  },
  {
    to: '/expedition', title: '원정대', description: '원정대 캐릭터를 한눈에 확인', action: '확인하기',
    iconBg: 'bg-rose-500/15', iconText: 'text-rose-600 dark:text-rose-400', ctaText: 'text-rose-600 dark:text-rose-400',
    path: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.941 3.198v.001c0 .504-.123.996-.36 1.432A9.056 9.056 0 0112 21c-2.1 0-4.034-.715-5.57-1.915A3 3 0 019 16.5m9 2.22a3 3 0 00-.941-3.198M15 9.75a3 3 0 11-6 0 3 3 0 016 0z', featured: false,
  },
  {
    to: '/spending', title: '결제 내역', description: '결제 내역과 소비 현황 관리', action: '확인하기',
    iconBg: 'bg-fuchsia-500/15', iconText: 'text-fuchsia-600 dark:text-fuchsia-400', ctaText: 'text-fuchsia-600 dark:text-fuchsia-400',
    path: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.75A.75.75 0 013 4.5h.75m0 0h12m0 0h.75a.75.75 0 01.75.75V6m0 0v.75a.75.75 0 01-.75.75h-.75m0-3H3.75M6 12h9', featured: false,
  },
] as const;

type QuickAction = (typeof QUICK_ACTIONS)[number];
const DEFAULT_ACTION_IDS = QUICK_ACTIONS.map((action) => action.to);
const DEFAULT_VISIBLE_IDS = ['/simulation', '/enhancement', '/spec-simulator', '/market'];
const ACTIONS_BY_ID = new Map<string, QuickAction>(QUICK_ACTIONS.map((action) => [action.to, action]));
const TOUCH_LONG_PRESS_DELAY_MS = 350;
const TOUCH_SCROLL_CANCEL_THRESHOLD_PX = 8;
const TOUCH_DRAG_START_THRESHOLD_PX = 12;
const EDGE_SCROLL_ZONE_PX = 64;
const EDGE_SCROLL_DWELL_MS = 250;
const MAX_EDGE_SCROLL_PX = 6;
const REORDER_COOLDOWN_MS = 120;

const CardContents: React.FC<{ readonly action: QuickAction }> = ({ action }) => (
  <>
    <div className="mb-3 flex items-center gap-3">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${action.iconBg}`}>
        <svg className={`h-5 w-5 ${action.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d={action.path} />
        </svg>
      </div>
      <h3 className="text-base font-bold text-gray-900 dark:text-white">{action.title}</h3>
    </div>
    <p className="break-keep text-sm leading-relaxed text-gray-500 dark:text-gray-400">{action.description}</p>
    <div className={`mt-3 flex items-center gap-1 text-sm font-medium opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 ${action.ctaText}`}>
      <span>{action.action}</span>
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </>
);

const QuickMenu: React.FC = () => {
  const [menuState, setMenuState] = useState<QuickMenuState>(() =>
    readQuickMenuState(DEFAULT_ACTION_IDS, DEFAULT_VISIBLE_IDS));
  const [isEditing, setIsEditing] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const menuStateRef = useRef(menuState);
  const draggedIdRef = useRef<string | null>(null);
  const dragTargetIdRef = useRef<string | null>(null);
  const touchPointerIdRef = useRef<number | null>(null);
  const touchCandidateIdRef = useRef<string | null>(null);
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const touchLongPressReadyRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const edgeScrollDirectionRef = useRef<-1 | 0 | 1>(0);
  const edgeScrollEnteredAtRef = useRef<number | null>(null);
  const lastReorderAtRef = useRef(Number.NEGATIVE_INFINITY);
  const visibleSet = new Set(menuState.visibleIds);

  const updateMenuState = (updater: (current: QuickMenuState) => QuickMenuState) => {
    const next = updater(menuStateRef.current);
    if (next === menuStateRef.current) return;

    menuStateRef.current = next;
    setMenuState(next);
    saveQuickMenuState(next);
  };

  const moveTo = (movingId: string, targetId: string) => {
    updateMenuState((current) => {
      const order = reorderQuickMenuItem(current.order, movingId, targetId);
      if (order.every((id, index) => id === current.order[index])) return current;
      const currentVisibleSet = new Set(current.visibleIds);
      return { order, visibleIds: order.filter((id) => currentVisibleSet.has(id)) };
    });
  };

  const moveBy = (id: string, offset: -1 | 1) => {
    const currentOrder = menuStateRef.current.order;
    const currentIndex = currentOrder.indexOf(id);
    const targetId = currentOrder[currentIndex + offset];
    if (targetId) moveTo(id, targetId);
  };

  const toggleVisibility = (id: string) => {
    updateMenuState((current) => {
      const nextVisibleSet = new Set(current.visibleIds);
      if (nextVisibleSet.has(id)) nextVisibleSet.delete(id);
      else nextVisibleSet.add(id);
      return { ...current, visibleIds: current.order.filter((menuId) => nextVisibleSet.has(menuId)) };
    });
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current === null) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const stopAutoScroll = () => {
    if (autoScrollFrameRef.current !== null) cancelAnimationFrame(autoScrollFrameRef.current);
    autoScrollFrameRef.current = null;
    edgeScrollDirectionRef.current = 0;
    edgeScrollEnteredAtRef.current = null;
  };

  const resetTouchCandidate = () => {
    clearLongPressTimer();
    touchPointerIdRef.current = null;
    touchCandidateIdRef.current = null;
    touchStartPointRef.current = null;
    touchLongPressReadyRef.current = false;
  };

  const stopDragging = () => {
    resetTouchCandidate();
    stopAutoScroll();
    draggedIdRef.current = null;
    dragTargetIdRef.current = null;
    dragPointerRef.current = null;
    setDraggedId(null);
  };

  const updateDragTarget = (clientX: number, clientY: number) => {
    const movingId = draggedIdRef.current;
    if (!movingId) return;

    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-quick-menu-id]');
    const targetId = target?.dataset.quickMenuId;
    if (!targetId) return;
    if (targetId === movingId) {
      dragTargetIdRef.current = movingId;
      return;
    }
    if (targetId === dragTargetIdRef.current) return;

    const now = performance.now();
    if (now - lastReorderAtRef.current < REORDER_COOLDOWN_MS) return;

    const currentOrder = menuStateRef.current.order;
    const movingIndex = currentOrder.indexOf(movingId);
    const targetIndex = currentOrder.indexOf(targetId);
    if (movingIndex < 0 || targetIndex < 0) return;

    const movingElement = Array.from(document.querySelectorAll<HTMLElement>('[data-quick-menu-id]'))
      .find((element) => element.dataset.quickMenuId === movingId);
    if (!movingElement) return;

    const movingRect = movingElement.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const sameRow = Math.abs(movingRect.top - targetRect.top)
      < Math.min(movingRect.height, targetRect.height) / 2;
    const movingForward = movingIndex < targetIndex;
    const crossedTargetCenter = sameRow
      ? (movingForward
        ? clientX >= targetRect.left + targetRect.width / 2
        : clientX <= targetRect.left + targetRect.width / 2)
      : (movingForward
        ? clientY >= targetRect.top + targetRect.height / 2
        : clientY <= targetRect.top + targetRect.height / 2);
    if (!crossedTargetCenter) return;

    dragTargetIdRef.current = targetId;
    lastReorderAtRef.current = now;
    moveTo(movingId, targetId);
  };

  const runAutoScroll = () => {
    const point = dragPointerRef.current;
    if (!point || !draggedIdRef.current) {
      autoScrollFrameRef.current = null;
      return;
    }

    const direction: -1 | 0 | 1 = point.y < EDGE_SCROLL_ZONE_PX
      ? -1
      : point.y > window.innerHeight - EDGE_SCROLL_ZONE_PX ? 1 : 0;
    const now = performance.now();

    if (direction === 0) {
      edgeScrollDirectionRef.current = 0;
      edgeScrollEnteredAtRef.current = null;
    } else if (direction !== edgeScrollDirectionRef.current) {
      edgeScrollDirectionRef.current = direction;
      edgeScrollEnteredAtRef.current = now;
    } else if (
      edgeScrollEnteredAtRef.current !== null
      && now - edgeScrollEnteredAtRef.current >= EDGE_SCROLL_DWELL_MS
    ) {
      const edgeDistance = direction < 0
        ? EDGE_SCROLL_ZONE_PX - point.y
        : point.y - (window.innerHeight - EDGE_SCROLL_ZONE_PX);
      const speed = Math.max(1, Math.ceil(
        MAX_EDGE_SCROLL_PX * Math.min(1, edgeDistance / EDGE_SCROLL_ZONE_PX),
      ));
      window.scrollBy(0, direction * speed);
      updateDragTarget(point.x, point.y);
    }

    autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll);
  };

  const beginDragging = (id: string, clientX: number, clientY: number) => {
    clearLongPressTimer();
    draggedIdRef.current = id;
    dragTargetIdRef.current = id;
    dragPointerRef.current = { x: clientX, y: clientY };
    lastReorderAtRef.current = Number.NEGATIVE_INFINITY;
    setDraggedId(id);
    if (autoScrollFrameRef.current === null) {
      autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>, id: string) => {
    if (event.button !== 0 || (event.target as Element).closest('button')) return;

    if (event.pointerType !== 'touch') {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      beginDragging(id, event.clientX, event.clientY);
      return;
    }

    const pointerId = event.pointerId;
    touchPointerIdRef.current = pointerId;
    touchCandidateIdRef.current = id;
    touchStartPointRef.current = { x: event.clientX, y: event.clientY };
    touchLongPressReadyRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      if (touchPointerIdRef.current !== pointerId) return;
      longPressTimerRef.current = null;
      touchLongPressReadyRef.current = true;
    }, TOUCH_LONG_PRESS_DELAY_MS);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (touchPointerIdRef.current === event.pointerId && !draggedIdRef.current) {
      const startPoint = touchStartPointRef.current;
      const candidateId = touchCandidateIdRef.current;
      if (!startPoint || !candidateId) return;

      const distance = Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y);
      if (!touchLongPressReadyRef.current) {
        if (distance > TOUCH_SCROLL_CANCEL_THRESHOLD_PX) resetTouchCandidate();
        return;
      }
      if (distance < TOUCH_DRAG_START_THRESHOLD_PX) return;

      event.preventDefault();
      beginDragging(candidateId, event.clientX, event.clientY);
      updateDragTarget(event.clientX, event.clientY);
      return;
    }

    if (!draggedIdRef.current) return;
    event.preventDefault();
    dragPointerRef.current = { x: event.clientX, y: event.clientY };
    updateDragTarget(event.clientX, event.clientY);
  };

  useEffect(() => {
    const preventNativeScrollWhileDragging = (event: TouchEvent) => {
      if (touchLongPressReadyRef.current || draggedIdRef.current) event.preventDefault();
    };

    document.addEventListener('touchmove', preventNativeScrollWhileDragging, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventNativeScrollWhileDragging);
      if (longPressTimerRef.current !== null) clearTimeout(longPressTimerRef.current);
      if (autoScrollFrameRef.current !== null) cancelAnimationFrame(autoScrollFrameRef.current);
    };
  }, []);

  const handleReset = () => {
    const next: QuickMenuState = {
      order: [...DEFAULT_ACTION_IDS],
      visibleIds: [...DEFAULT_VISIBLE_IDS],
    };
    resetQuickMenuState();
    menuStateRef.current = next;
    setMenuState(next);
    stopDragging();
  };

  const toggleEditing = () => {
    stopDragging();
    setIsEditing((editing) => !editing);
  };

  const renderedIds = isEditing
    ? menuState.order
    : menuState.order.filter((id) => visibleSet.has(id));

  return (
    <section aria-labelledby="home-quick-menu-title" className="animate-fade-in">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="home-quick-menu-title" className="text-xl font-bold text-gray-900 dark:text-white">빠른 메뉴</h2>
          <p id="quick-menu-edit-instructions" className="mt-1 break-keep text-sm text-gray-500 dark:text-gray-400">
            {isEditing
              ? '눈 아이콘으로 노출 여부를 정하고, 카드 전체를 드래그해 순서를 바꾸세요. 터치는 카드를 길게 누른 뒤 이동하고, 키보드는 Alt와 좌우 방향키를 사용합니다.'
              : '선택한 성장 도구로 바로 이동합니다.'}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <button type="button" onClick={handleReset} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-la-gold dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/10">
              기본 설정으로 초기화
            </button>
          )}
          <button type="button" aria-pressed={isEditing} onClick={toggleEditing} className="rounded-lg border border-la-gold/40 bg-la-gold/10 px-3 py-2 text-sm font-bold text-la-gold-dark hover:bg-la-gold/20 focus:outline-none focus:ring-2 focus:ring-la-gold dark:text-la-gold">
            {isEditing ? '편집 완료' : '순서 편집'}
          </button>
        </div>
      </div>
      <nav
        aria-label={isEditing ? '빠른 메뉴 편집' : '빠른 메뉴'}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        {renderedIds.map((id) => {
          const action = ACTIONS_BY_ID.get(id);
          if (!action) return null;
          const isVisible = visibleSet.has(id);
          const cardClassName = `glass-card group p-5 text-left transition-all duration-300 ${action.featured ? 'ring-1 ring-la-gold/20' : ''}`;

          if (!isEditing) {
            return (
              <Link key={id} to={action.to} className={`${cardClassName} cursor-pointer hover:border-la-gold/30 hover:shadow-gold-glow dark:hover:border-la-gold/20`}>
                <CardContents action={action} />
              </Link>
            );
          }

          return (
            <div
              key={id}
              data-quick-menu-id={id}
              role="group"
              tabIndex={0}
              aria-label={`${action.title}, ${isVisible ? '노출' : '미노출'}, 순서 편집`}
              aria-describedby="quick-menu-edit-instructions"
              onKeyDown={(event) => {
                if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
                event.preventDefault();
                moveBy(id, event.key === 'ArrowLeft' ? -1 : 1);
              }}
              onPointerDown={(event) => handlePointerDown(event, id)}
              className={`${cardClassName} relative cursor-grab select-none border-dashed pr-14 focus:outline-none focus:ring-2 focus:ring-la-gold active:cursor-grabbing ${draggedId === id ? 'touch-none' : 'touch-pan-y'} ${
                isVisible
                  ? 'border-la-gold/50'
                  : 'border-gray-300 opacity-55 grayscale dark:border-gray-600'
              } ${draggedId === id ? 'scale-[1.02] shadow-gold-glow ring-2 ring-la-gold' : ''}`}
            >
              <div className={isVisible ? '' : 'opacity-70'}>
                <CardContents action={action} />
              </div>
              <button
                type="button"
                aria-label={`${action.title} ${isVisible ? '미노출로 변경' : '노출로 변경'}`}
                aria-pressed={isVisible}
                title={isVisible ? '빠른 메뉴에서 숨기기' : '빠른 메뉴에 표시하기'}
                onClick={() => toggleVisibility(id)}
                className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border focus:outline-none focus:ring-2 focus:ring-la-gold ${
                  isVisible
                    ? 'border-la-gold/40 bg-la-gold/15 text-la-gold-dark dark:text-la-gold'
                    : 'border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-white/5 dark:text-gray-500'
                }`}
              >
                {isVisible ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.7A2 2 0 0012 14a2 2 0 001.3-.5M9.9 5.5A10.8 10.8 0 0112 5.25c6 0 9.75 6.75 9.75 6.75a17 17 0 01-2.1 2.8M6.2 6.2C3.7 8.1 2.25 12 2.25 12S6 18.75 12 18.75a9.8 9.8 0 004.1-.9" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </nav>
      {!isEditing && renderedIds.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          노출할 빠른 메뉴가 없습니다. 순서 편집에서 메뉴를 선택해 주세요.
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {isEditing
          ? `편집 모드. ${menuState.visibleIds.length}개 메뉴 노출 중.`
          : `일반 탐색 모드. ${menuState.visibleIds.length}개 메뉴 노출 중.`}
      </p>
    </section>
  );
};

export default QuickMenu;
