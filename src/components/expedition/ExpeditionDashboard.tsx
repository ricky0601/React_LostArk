import React, { useMemo } from 'react';
import type { SiblingCharacter } from '../../types/lostark';
import { gradeText } from '../../utils/equipmentColors';
import GlassCard from '../GlassCard';
import StateFeedback from '../StateFeedback';
import ExpeditionDashboardControls from './ExpeditionDashboardControls';
import ExpeditionDashboardViews from './ExpeditionDashboardViews';
import { isBoundGem, parseItemLevel } from './expeditionModel';
import { useExpeditionDashboard } from './useExpeditionDashboard';

interface Props {
  readonly nickname: string;
  readonly siblings: readonly SiblingCharacter[];
}

const CORE_GRADE_ORDER = ['고대', '유물', '전설', '영웅', '희귀', '고급', '일반'];

const ExpeditionDashboard: React.FC<Props> = ({ nickname, siblings }) => {
  const dashboard = useExpeditionDashboard(nickname, siblings);
  const selectedRows = useMemo(() => Object.values(dashboard.rows)
    .filter((row) => dashboard.selectedNames.has(row.sibling.CharacterName))
    .sort((left, right) => parseItemLevel(right.sibling.ItemAvgLevel) - parseItemLevel(left.sibling.ItemAvgLevel)),
  [dashboard.rows, dashboard.selectedNames]);
  const groupedRows = useMemo(() => {
    const groups = new Map<string, typeof selectedRows>();
    selectedRows.forEach((row) => groups.set(row.sibling.ServerName, [...(groups.get(row.sibling.ServerName) ?? []), row]));
    return Array.from(groups.entries());
  }, [selectedRows]);
  const highestLevel = selectedRows.length > 0 ? Math.max(...selectedRows.map((row) => parseItemLevel(row.sibling.ItemAvgLevel))) : null;
  const coreGradeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    selectedRows.forEach((row) => (row.arkGrid.data?.Slots ?? []).filter((slot) => slot != null).forEach((slot) => {
      counts.set(slot.Grade, (counts.get(slot.Grade) ?? 0) + 1);
    }));
    return Array.from(counts.entries()).sort(([left], [right]) => {
      const leftIndex = CORE_GRADE_ORDER.indexOf(left);
      const rightIndex = CORE_GRADE_ORDER.indexOf(right);
      return (leftIndex === -1 ? CORE_GRADE_ORDER.length : leftIndex)
        - (rightIndex === -1 ? CORE_GRADE_ORDER.length : rightIndex);
    });
  }, [selectedRows]);
  const gems = useMemo(() => selectedRows.flatMap((row) => row.gems.data?.Gems ?? []).filter((gem) => gem != null), [selectedRows]);
  const boundGemCount = gems.filter(isBoundGem).length;
  const tradeableGemCount = gems.length - boundGemCount;
  const coreSummaryLoading = selectedRows.some((row) => row.arkGrid.status === 'idle' || row.arkGrid.status === 'loading');
  const gemSummaryLoading = selectedRows.some((row) => row.gems.status === 'idle' || row.gems.status === 'loading');
  const coreSummaryError = selectedRows.some((row) => row.arkGrid.status === 'error');
  const gemSummaryError = selectedRows.some((row) => row.gems.status === 'error');
  const gemSummaryHasSuccess = selectedRows.some((row) => row.gems.status === 'success');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <GlassCard className="p-4 text-center">
          <p className="text-xs text-gray-500">최고 레벨</p>
          <p className="mt-1 text-2xl font-bold text-la-gold-deep dark:text-la-gold">{highestLevel?.toFixed(2) ?? '-'}</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-xs text-gray-500">아크그리드 코어</p>
          {coreSummaryLoading ? <p className="mt-1 text-2xl font-bold text-gray-400">…</p> : coreGradeCounts.length > 0 ? (
            <div className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1">
              {coreGradeCounts.map(([grade, count]) => {
                const text = gradeText(grade);
                return <span key={grade} className={`text-sm font-bold ${text.className}`} style={text.style}>{grade} {count}</span>;
              })}
              {coreSummaryError && <span className="w-full text-[10px] text-red-500">일부 조회 실패</span>}
            </div>
          ) : <p className="mt-1 text-sm font-bold text-gray-400">{coreSummaryError ? '조회 실패' : '-'}</p>}
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-xs text-gray-500">거래 가능 보석</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-300">{gemSummaryLoading ? '…' : gemSummaryError && !gemSummaryHasSuccess ? '조회 실패' : `${tradeableGemCount}${gemSummaryError ? '+' : ''}개`}</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-xs text-gray-500">귀속 보석</p>
          <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-300">{gemSummaryLoading ? '…' : gemSummaryError && !gemSummaryHasSuccess ? '조회 실패' : `${boundGemCount}${gemSummaryError ? '+' : ''}개`}</p>
        </GlassCard>
      </div>

      <ExpeditionDashboardControls
        siblings={siblings}
        selectedNames={dashboard.selectedNames}
        collapsedServers={dashboard.collapsedServers}
        isRosterExpanded={dashboard.isRosterExpanded}
        viewMode={dashboard.viewMode}
        onViewModeChange={dashboard.setViewMode}
        onToggleCharacter={dashboard.toggleCharacter}
        onToggleServer={dashboard.toggleServer}
        onToggleServerCollapsed={dashboard.toggleServerCollapsed}
        onToggleRosterExpanded={dashboard.toggleRosterExpanded}
      />

      {dashboard.partialFailureCount > 0 && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <span>{dashboard.partialFailureCount}개 캐릭터의 일부 정보를 불러오지 못했습니다. 조회된 정보는 계속 표시됩니다.</span>
          <span className="text-xs">각 캐릭터의 ‘다시 시도’를 이용해 주세요.</span>
        </div>
      )}

      {selectedRows.length === 0 ? (
        <StateFeedback tone="empty" title="표시할 캐릭터가 선택되지 않았습니다" description="위의 원정대 목록에서 한 명 이상 선택해 주세요." />
      ) : groupedRows.map(([server, rows]) => (
        <section key={server} aria-labelledby={`expedition-server-${server}`} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 id={`expedition-server-${server}`} className="text-lg font-bold text-gray-900 dark:text-white">{server}</h2>
            <span className="rounded-full bg-la-gold/15 px-2 py-0.5 text-xs font-bold text-la-gold-deep dark:text-la-gold">{rows.length}명</span>
          </div>
          <ExpeditionDashboardViews
            rows={rows}
            viewMode={dashboard.viewMode}
            onToggleExpanded={dashboard.toggleExpanded}
            onRetry={dashboard.retryCharacter}
          />
        </section>
      ))}
    </div>
  );
};

export default ExpeditionDashboard;
