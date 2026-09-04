import React, { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  readonly children: React.ReactNode;
  readonly content: React.ReactNode;
  readonly label?: string;
  /** false면 키보드 탭 순서에서 제외하고 hover/터치로만 표시한다(읽기 전용 셀용). 기본값 true. */
  readonly focusable?: boolean;
  readonly className?: string;
}

interface Position {
  readonly left: number;
  readonly top: number;
  readonly above: boolean;
}

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 8;
const TOOLTIP_OPEN_EVENT = 'app-tooltip-open';

const Tooltip: React.FC<Props> = ({ children, content, label, focusable = true, className = '' }) => {
  const id = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ left: 0, top: 0, above: false });

  const updatePosition = useCallback((): void => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tooltipWidth = tooltipRect?.width ?? 288;
    const tooltipHeight = tooltipRect?.height ?? 0;
    const halfWidth = tooltipWidth / 2;
    const left = Math.min(
      Math.max(triggerRect.left + triggerRect.width / 2, VIEWPORT_MARGIN + halfWidth),
      window.innerWidth - VIEWPORT_MARGIN - halfWidth,
    );
    const above = triggerRect.bottom + TRIGGER_GAP + tooltipHeight > window.innerHeight
      && triggerRect.top > tooltipHeight + TRIGGER_GAP;

    setPosition({
      left,
      top: above ? triggerRect.top - TRIGGER_GAP : triggerRect.bottom + TRIGGER_GAP,
      above,
    });
  }, []);

  const showTooltip = useCallback((): void => {
    document.dispatchEvent(new CustomEvent<string>(TOOLTIP_OPEN_EVENT, { detail: id }));
    setOpen(true);
  }, [id]);

  useLayoutEffect(() => {
    const closeWhenAnotherOpens = (event: Event): void => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    document.addEventListener(TOOLTIP_OPEN_EVENT, closeWhenAnotherOpens);
    return () => document.removeEventListener(TOOLTIP_OPEN_EVENT, closeWhenAnotherOpens);
  }, [id]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !tooltipRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <div
        ref={triggerRef}
        {...(focusable
          ? {
            // role 없는 요소는 naming prohibited라 aria-label이 무시되거나 자식 텍스트를 통째로 덮는다.
            role: 'button' as const,
            tabIndex: 0,
            'aria-label': label,
            'aria-expanded': open,
            'aria-describedby': open ? id : undefined,
            onFocus: showTooltip,
            onBlur: (): void => setOpen(false),
            onKeyDown: (event: React.KeyboardEvent): void => {
              if (event.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.blur();
              } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (open) setOpen(false);
                else showTooltip();
              }
            },
          }
          : {})}
        className={`inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={() => {
          if (document.activeElement !== triggerRef.current) setOpen(false);
        }}
        onMouseDown={(event) => {
          // Mouse clicks must not pin a hover tooltip by focusing its trigger.
          event.preventDefault();
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse') {
            if (open) setOpen(false);
            else showTooltip();
          }
        }}
      >
        {children}
      </div>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className="pointer-events-none fixed z-[1000] w-max max-w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-gray-200/80 bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-xl backdrop-blur-md dark:border-white/15 dark:bg-[#202126]/95 dark:text-gray-200"
          style={{
            left: position.left,
            top: position.top,
            transform: position.above ? 'translate(-50%, -100%)' : 'translateX(-50%)',
          }}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
};

export default Tooltip;
