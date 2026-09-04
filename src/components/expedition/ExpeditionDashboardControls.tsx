import React from 'react';
import type { SiblingCharacter } from '../../types/lostark';
import type { ExpeditionViewMode } from './expeditionModel';

const VIEW_OPTIONS: readonly { mode: ExpeditionViewMode; label: string; description: string }[] = [
  { mode: 'card', label: '카드', description: '캐릭터별 요약' },
  { mode: 'grid', label: '그리드', description: '핵심 스펙 비교' },
  { mode: 'table', label: '테이블', description: '상세 관리표' },
];

interface Props {
  readonly siblings: readonly SiblingCharacter[];
  readonly selectedNames: ReadonlySet<string>;
  readonly collapsedServers: ReadonlySet<string>;
  readonly isRosterExpanded: boolean;
  readonly viewMode: ExpeditionViewMode;
  readonly onViewModeChange: (mode: ExpeditionViewMode) => void;
  readonly onToggleCharacter: (name: string) => void;
  readonly onToggleServer: (server: string) => void;
  readonly onToggleServerCollapsed: (server: string) => void;
  readonly onToggleRosterExpanded: () => void;
}

const ExpeditionDashboardControls: React.FC<Props> = ({
  siblings,
  selectedNames,
  collapsedServers,
  isRosterExpanded,
  viewMode,
  onViewModeChange,
  onToggleCharacter,
  onToggleServer,
  onToggleServerCollapsed,
  onToggleRosterExpanded,
}) => {
  const servers = Array.from(new Set(siblings.map((sibling) => sibling.ServerName)));
  const optionButtonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">보기 설정</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">선택한 보기와 캐릭터는 이 브라우저에 저장됩니다.</p>
        </div>
        <div
          className="grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-label="원정대 보기 방식"
          onKeyDown={(event) => {
            const currentIndex = Math.max(0, VIEW_OPTIONS.findIndex((option) => option.mode === viewMode));
            const move = (delta: number): void => {
              const next = VIEW_OPTIONS[(currentIndex + delta + VIEW_OPTIONS.length) % VIEW_OPTIONS.length];
              if (!next) return;
              onViewModeChange(next.mode);
              optionButtonRefs.current[VIEW_OPTIONS.indexOf(next)]?.focus();
            };
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault();
              move(1);
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault();
              move(-1);
            } else if (event.key === 'Home') {
              event.preventDefault();
              const first = VIEW_OPTIONS[0];
              if (first) {
                onViewModeChange(first.mode);
                optionButtonRefs.current[0]?.focus();
              }
            } else if (event.key === 'End') {
              event.preventDefault();
              const last = VIEW_OPTIONS[VIEW_OPTIONS.length - 1];
              if (last) {
                onViewModeChange(last.mode);
                optionButtonRefs.current[VIEW_OPTIONS.length - 1]?.focus();
              }
            }
          }}
        >
          {VIEW_OPTIONS.map((option, index) => (
            <button
              key={option.mode}
              ref={(element) => { optionButtonRefs.current[index] = element; }}
              type="button"
              role="radio"
              aria-checked={viewMode === option.mode}
              tabIndex={viewMode === option.mode ? 0 : -1}
              onClick={() => onViewModeChange(option.mode)}
              className={`min-h-11 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 ${viewMode === option.mode
                ? 'border-la-gold bg-la-gold/15 text-la-gold-deep dark:text-la-gold'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5'}`}
            >
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="hidden text-[10px] opacity-70 sm:block">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className={`flex items-center justify-between ${isRosterExpanded ? 'mb-3' : ''}`}>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">표시할 캐릭터</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{selectedNames.size}/{siblings.length}명 선택</p>
          </div>
          <button
            type="button"
            aria-label={`표시할 캐릭터 ${isRosterExpanded ? '접기' : '펼치기'}`}
            aria-expanded={isRosterExpanded}
            onClick={onToggleRosterExpanded}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <span aria-hidden="true">{isRosterExpanded ? '▲' : '▼'}</span>
          </button>
        </div>
        {isRosterExpanded && <div className="grid gap-3 lg:grid-cols-2">
          {servers.map((server) => {
            const members = siblings.filter((sibling) => sibling.ServerName === server);
            const selectedCount = members.filter((member) => selectedNames.has(member.CharacterName)).length;
            const collapsed = collapsedServers.has(server);
            return (
              <section key={server} className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                <div className="flex min-h-11 items-center gap-2 bg-gray-50 px-3 dark:bg-white/[0.04]">
                  <input
                    type="checkbox"
                    aria-label={`${server} 서버 전체 선택`}
                    checked={selectedCount === members.length}
                    ref={(input) => { if (input) input.indeterminate = selectedCount > 0 && selectedCount < members.length; }}
                    onChange={() => onToggleServer(server)}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <button type="button" className="flex min-w-0 flex-1 items-center justify-between rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40" onClick={() => onToggleServerCollapsed(server)} aria-expanded={!collapsed}>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{server}</span>
                    <span className="text-xs text-gray-500">{selectedCount}/{members.length} {collapsed ? '펼치기' : '접기'}</span>
                  </button>
                </div>
                {!collapsed && (
                  <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3">
                    {members.map((member) => (
                      <label key={member.CharacterName} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/5">
                        <input type="checkbox" checked={selectedNames.has(member.CharacterName)} onChange={() => onToggleCharacter(member.CharacterName)} className="h-4 w-4 shrink-0 accent-amber-500" />
                        <span className="min-w-0 truncate text-xs text-gray-700 dark:text-gray-300">{member.CharacterName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>}
      </div>
    </div>
  );
};

export default ExpeditionDashboardControls;
