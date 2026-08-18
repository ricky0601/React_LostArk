import { type KeyboardEvent, type ReactElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  findSpecSelectInitialIndex,
  findSpecSelectNextIndex,
  isSpecSelectOption,
  type SpecSelectItem,
  type SpecSelectOption,
  type SpecSelectValue,
} from './specSelectModel';
import { getSpecSelectPanelStyle } from './specSelectPosition';

export type { SpecSelectItem, SpecSelectOption, SpecSelectSeparator } from './specSelectModel';

interface SpecSelectProps<Value extends SpecSelectValue> {
  readonly value: Value;
  readonly items: readonly SpecSelectItem<Value>[];
  readonly onChange: (value: Value) => void;
  readonly ariaLabel: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly size?: 'compact' | 'default';
  readonly textAlign?: 'left' | 'center';
  readonly triggerElementRef?: (element: HTMLButtonElement | null) => void;
}


const joinClassNames = (...classes: readonly (string | false | undefined)[]): string =>
  classes.filter((className): className is string => typeof className === 'string').join(' ');

export const SpecSelect = <Value extends SpecSelectValue>({
  value,
  items,
  onChange,
  ariaLabel,
  disabled = false,
  className,
  size = 'compact',
  textAlign = 'left',
  triggerElementRef,
}: SpecSelectProps<Value>): ReactElement => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selectedItem = items.find(
    (item): item is SpecSelectOption<Value> => isSpecSelectOption(item) && item.value === value,
  );

  const setTriggerRef = useCallback((element: HTMLButtonElement | null): void => {
    triggerRef.current = element;
    triggerElementRef?.(element);
  }, [triggerElementRef]);

  const close = useCallback((restoreFocus: boolean): void => {
    setOpen(false);
    setPanelStyle({});
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const getPanelStyle = useCallback(() => {
    const trigger = triggerRef.current;
    return trigger ? getSpecSelectPanelStyle(trigger) : null;
  }, []);

  const updatePanelPosition = useCallback((): void => {
    const nextPanelStyle = getPanelStyle();
    if (nextPanelStyle) setPanelStyle(nextPanelStyle);
  }, [getPanelStyle]);

  const openPanel = (): void => {
    if (disabled) return;
    const nextPanelStyle = getPanelStyle();
    if (!nextPanelStyle) return;
    setPanelStyle(nextPanelStyle);
    setActiveIndex(findSpecSelectInitialIndex(items, value));
    setOpen(true);
  };

  const scrollActiveOptionIntoView = useCallback((): void => {
    const listbox = listboxRef.current;
    const activeOption = activeIndex >= 0
      ? document.getElementById(`${listboxId}-option-${activeIndex}`)
      : null;
    if (!listbox || !(activeOption instanceof HTMLElement)) return;

    const optionTop = activeOption.offsetTop;
    const optionBottom = optionTop + activeOption.offsetHeight;
    const visibleTop = listbox.scrollTop;
    const visibleBottom = visibleTop + listbox.clientHeight;

    if (optionTop < visibleTop) {
      listbox.scrollTop = optionTop;
      return;
    }
    if (optionBottom > visibleBottom) {
      listbox.scrollTop = optionBottom - listbox.clientHeight;
    }
  }, [activeIndex, listboxId]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    listboxRef.current?.focus();
    scrollActiveOptionIntoView();
  }, [open, updatePanelPosition, scrollActiveOptionIntoView]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent): void => {
      const path = event.composedPath();
      const root = rootRef.current;
      const listbox = listboxRef.current;
      if ((root && path.includes(root)) || (listbox && path.includes(listbox))) return;
      close(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') close(true);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [close, open, updatePanelPosition]);

  const selectActiveItem = (): void => {
    const item = items[activeIndex];
    if (!item || !isSpecSelectOption(item) || item.disabled) return;
    onChange(item.value);
    close(true);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    openPanel();
  };

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        findSpecSelectNextIndex(items, currentIndex, event.key === 'ArrowDown' ? 1 : -1),
      );
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectActiveItem();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  };

  const panel = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          onKeyDown={handleListboxKeyDown}
          style={panelStyle}
          className="max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-gray-200/80 bg-white/95 p-1.5 text-xs shadow-xl shadow-gray-900/15 outline-none backdrop-blur-md dark:border-white/10 dark:bg-la-dark-card/95 dark:shadow-black/40"
        >
          {items.map((item, index) => {
            if (!isSpecSelectOption(item)) {
              return (
                <div
                  key={item.key}
                  role="separator"
                  aria-label={item.label}
                  className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500"
                >
                  <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                  {item.label && <span>{item.label}</span>}
                  <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                </div>
              );
            }
            const selected = item.value === value;
            const active = index === activeIndex;
            return (
              <button
                key={`${String(item.value)}-${index}`}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={selected}
                disabled={item.disabled}
                onPointerMove={() => {
                  if (!item.disabled) setActiveIndex(index);
                }}
                onClick={() => {
                  onChange(item.value);
                  close(true);
                }}
                className={joinClassNames(
                  'block min-h-8 w-full truncate rounded-lg border-l-2 px-2.5 py-1.5 text-left transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-40',
                  selected
                    ? 'border-la-gold bg-la-gold/10 font-semibold text-la-gold-dark dark:bg-la-gold/15 dark:text-la-gold'
                    : 'border-transparent text-gray-600 dark:text-gray-300',
                  active && !selected && 'bg-gray-100 dark:bg-white/10',
                  textAlign === 'center' && 'text-center',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className={joinClassNames('relative min-w-0', className)}>
      <button
        ref={setTriggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => {
          if (open) close(false);
          else openPanel();
        }}
        onKeyDown={handleTriggerKeyDown}
        className={joinClassNames(
          'spec-control spec-touch-control inline-flex w-full min-w-0 items-center justify-between gap-1 font-medium disabled:cursor-not-allowed disabled:opacity-50',
          size === 'compact' ? 'min-h-8 py-1 text-[11px]' : 'min-h-9 py-1.5 text-xs',
          textAlign === 'center' && 'text-center',
        )}
      >
        <span className={joinClassNames('min-w-0 flex-1 truncate', textAlign === 'left' && 'text-left')}>
          {selectedItem?.label ?? String(value)}
        </span>
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={joinClassNames(
            'h-3 w-3 flex-none transition-transform duration-150 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        >
          <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      </button>
      {panel}
    </div>
  );
};
