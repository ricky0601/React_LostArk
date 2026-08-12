import React from 'react';
import { createPortal } from 'react-dom';
import type { RaidColumn, SelectedRaid } from '../../data/raidGold';
import FallbackImage from '../FallbackImage';
import StateFeedback from '../StateFeedback';

interface RaidPickerProps {
  readonly allRaids: readonly RaidColumn[];
  readonly availableRaids: readonly SelectedRaid[];
  readonly selectedRaidKeys: readonly string[];
  readonly hasCustomRaids: boolean;
  readonly characterName: string;
  readonly currentRaidNames: readonly string[];
  readonly formatGold: (gold: number) => string;
  readonly onClose: () => void;
  readonly onRaidSelectionChange: (keys: string[]) => void;
  readonly onResetRaidSelection: () => void;
}

const RaidPicker: React.FC<RaidPickerProps> = ({
  allRaids,
  availableRaids,
  selectedRaidKeys,
  hasCustomRaids,
  characterName,
  currentRaidNames,
  formatGold,
  onClose,
  onRaidSelectionChange,
  onResetRaidSelection,
}) => {
  const titleId = React.useId();
  const dialogRef = React.useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = (): void => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (!isMobile) return;

    const root = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root?.setAttribute('aria-hidden', 'true');

    const focusableSelector = 'button:not([disabled]), input:not([disabled]), a[href]';
    const focusFirst = (): void => {
      dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    };
    focusFirst();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      root?.removeAttribute('aria-hidden');
    };
  }, [isMobile]);
  const availableKeys = new Set(
    availableRaids.map((raid) => `${raid.raidName}::${raid.difficulty}`),
  );
  const raidGroups = [
    {
      label: '참여 가능 레이드',
      available: true,
      raids: allRaids.filter((raid) => availableKeys.has(`${raid.raidName}::${raid.difficulty}`)),
    },
    {
      label: '참여 불가 레이드',
      available: false,
      raids: allRaids.filter((raid) => !availableKeys.has(`${raid.raidName}::${raid.difficulty}`)),
    },
  ] as const;

  const picker = (
    <div className="fixed inset-0 z-[9998] flex items-end bg-black/40 md:static md:block md:bg-transparent">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal={isMobile ? 'true' : undefined}
        aria-labelledby={titleId}
        className="flex max-h-[90dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-xl border border-b-0 border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-la-dark-card md:mt-4 md:max-h-none md:rounded-xl md:border-b md:shadow-sm"
      >
        <header className="flex flex-none items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/10">
          <div className="min-w-0">
            <h2 id={titleId} className="break-words text-sm font-bold text-gray-900 dark:text-white">
              {characterName} 레이드 변경
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
              체크한 레이드 중 참여 가능한 골드 상위 3개가 적용됩니다.
            </p>
          </div>
          <button
            type="button"
            aria-label={`${characterName} 레이드 변경 닫기`}
            onClick={onClose}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-gray-400 dark:hover:bg-white/10"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-none border-b border-gray-200 bg-gray-50/70 px-4 py-3 dark:border-white/10 dark:bg-black/20">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">현재 캐릭터</p>
          <p className="mt-0.5 break-words text-sm font-bold text-gray-800 dark:text-gray-100">{characterName}</p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">현재 선택 레이드</p>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            {currentRaidNames.length > 0 ? currentRaidNames.join(' · ') : '선택된 레이드 없음'}
          </p>
          <button
            type="button"
            disabled={!hasCustomRaids}
            onClick={onResetRaidSelection}
            className="mt-3 min-h-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-600 transition-colors hover:border-la-gold/50 hover:text-la-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 disabled:cursor-default disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:text-la-gold"
          >
            {hasCustomRaids ? '기본 선택으로 초기화' : '기본 선택 사용 중'}
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-3 md:max-h-96">
          {allRaids.length === 0 ? (
            <StateFeedback
              tone="empty"
              title="선택할 레이드가 없습니다"
              description="레이드 정보가 준비되면 이곳에서 참여 레이드를 변경할 수 있습니다."
              compact
            />
          ) : (
            raidGroups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200">{group.label}</h3>
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold tabular-nums text-gray-500 dark:bg-white/10 dark:text-gray-400">
                    {group.raids.length}개
                  </span>
                </div>

                {group.raids.length === 0 ? (
                  group.available ? (
                    <StateFeedback
                      tone="empty"
                      title="참여 가능한 레이드가 없습니다"
                      description="현재 아이템 레벨에서 참여할 수 있는 레이드가 없습니다. 참여 불가 목록의 선택 상태는 저장할 수 있습니다."
                      compact
                    />
                  ) : null
                ) : (
                  <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
                    {group.raids.map((raid) => {
                      const key = `${raid.raidName}::${raid.difficulty}`;
                      const checked = selectedRaidKeys.includes(key);
                      return (
                        <label
                          key={key}
                          className={`group relative min-h-28 min-w-0 cursor-pointer overflow-hidden rounded-xl border bg-la-dark text-white shadow-sm transition-[border-color,box-shadow,opacity] duration-200 focus-within:ring-2 focus-within:ring-la-gold/60 active:opacity-90 ${
                            group.available
                              ? checked
                                ? 'border-la-gold shadow-gold-glow ring-1 ring-inset ring-la-gold/70'
                                : 'border-gray-700 hover:border-la-gold/60 dark:border-white/10'
                              : checked
                                ? 'border-gray-400/70 ring-1 ring-inset ring-gray-300/40 dark:border-white/20'
                                : 'border-gray-700/70 hover:border-gray-500 dark:border-white/10'
                          }`}
                        >
                          <FallbackImage
                            src={raid.imagePath}
                            alt={`${raid.raidName} 레이드`}
                            width={480}
                            height={224}
                            loading="lazy"
                            fallbackClassName="bg-la-dark text-gray-500"
                            className={`absolute inset-0 h-full w-full object-cover transition-[filter,opacity,transform] duration-300 group-hover:scale-105 ${
                              group.available ? (checked ? 'opacity-95' : 'opacity-80') : 'opacity-30 grayscale'
                            }`}
                          />
                          <span
                            aria-hidden="true"
                            className={`absolute inset-0 bg-gradient-to-r ${
                              group.available
                                ? 'from-black/90 via-black/55 to-black/10'
                                : 'from-black via-black/80 to-black/55'
                            }`}
                          />
                          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />

                          <span className="relative z-10 flex min-h-28 min-w-0 flex-col justify-between p-3">
                            <span className="flex items-start justify-between gap-2">
                              <span
                                className={`rounded-md border px-2 py-1 text-[10px] font-bold backdrop-blur-sm ${
                                  group.available
                                    ? 'border-white/20 bg-black/45 text-white'
                                    : 'border-gray-400/30 bg-black/60 text-gray-300'
                                }`}
                              >
                                {group.available ? raid.difficulty : `참여 불가 · Lv.${raid.requiredLevel}`}
                              </span>
                              <input
                                type="checkbox"
                                aria-label={`${raid.raidName} ${raid.difficulty} 선택`}
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? selectedRaidKeys.filter((selectedKey) => selectedKey !== key)
                                    : [...selectedRaidKeys, key];
                                  onRaidSelectionChange(next);
                                }}
                                className="sr-only"
                              />
                              <span
                                aria-hidden="true"
                                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 shadow-sm backdrop-blur-md transition-colors ${
                                  checked
                                    ? group.available
                                      ? 'border-la-gold bg-la-gold text-la-dark'
                                      : 'border-gray-300 bg-gray-200 text-gray-700'
                                    : 'border-white/60 bg-black/35 text-transparent group-hover:border-white'
                                }`}
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            </span>

                            <span className="min-w-0">
                              <span className="block truncate text-sm font-black tracking-tight text-white sm:text-base">
                                {raid.raidName}
                              </span>
                              <span className="mt-1 flex items-center gap-2 text-[11px]">
                                <span className={`font-bold tabular-nums ${group.available ? 'text-la-gold-light' : 'text-gray-400'}`}>
                                  {formatGold(raid.totalGold)}G
                                </span>
                                {checked && (
                                  <span className={`font-semibold ${group.available ? 'text-la-gold-light' : 'text-gray-300'}`}>
                                    선택됨
                                  </span>
                                )}
                              </span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>
            ))
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            제한 없이 체크 가능 · 참여 레벨 미달 레이드는 선택 상태만 저장됩니다.
          </p>
        </div>
      </section>
    </div>
  );

  return isMobile
    ? createPortal(picker, document.body)
    : picker;
};

export default RaidPicker;
