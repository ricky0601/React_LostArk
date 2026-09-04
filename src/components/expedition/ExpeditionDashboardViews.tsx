import React from 'react';
import { Link } from 'react-router-dom';
import FallbackImage from '../FallbackImage';
import GlassCard from '../GlassCard';
import Tooltip from '../Tooltip';
import { ExpeditionCharacterDetails } from './ExpeditionCharacterDetails';
import {
  equipmentCells,
  type EquipmentCell,
  type ExpeditionCharacterState,
  type ExpeditionViewMode,
} from './expeditionModel';

interface Props {
  readonly rows: readonly ExpeditionCharacterState[];
  readonly viewMode: ExpeditionViewMode;
  readonly onToggleExpanded: (name: string) => void;
  readonly onRetry: (name: string) => void;
}

const statusClass = (status: string, successClass = ''): string => status === 'error'
  ? 'text-red-500 dark:text-red-400'
  : status === 'success' ? successClass : 'animate-pulse text-gray-400';
const rowHasError = (row: ExpeditionCharacterState): boolean => [
  row.profile, row.equipment, row.arkPassive, row.arkGrid, row.gems, row.engravings,
].some((state) => state.status === 'error');

const equipmentDetailLine = (cell: EquipmentCell): string => cell.label === '완갑'
  ? `${cell.grade ?? '-'} / 품질 ${cell.quality ?? '-'}`
  : `상급 ${cell.advancedLevel ?? '-'} / 품질 ${cell.quality ?? '-'}`;

const equipmentTooltip = (cell: EquipmentCell): { label: string; content: React.ReactNode } => ({
  label: cell.name ?? `${cell.label} 장비 정보`,
  content: (
    <div className="min-w-40 space-y-1">
      <strong className="block text-sm text-gray-900 dark:text-white">{cell.name ?? cell.label}</strong>
      <span className="text-[11px] text-gray-500 dark:text-gray-400">{equipmentDetailLine(cell)}</span>
    </div>
  ),
});

const EquipmentStrip: React.FC<{ readonly row: ExpeditionCharacterState; readonly compact?: boolean }> = ({ row, compact }) => (
  <div className={`grid gap-1 ${compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-7'}`}>
    {equipmentCells(row.equipment.data).map((cell) => {
      const tip = equipmentTooltip(cell);
      return (
      <div key={cell.label} className="rounded-lg bg-gray-100/80 px-1.5 py-2 text-center dark:bg-white/5">
        <Tooltip label={tip.label} content={tip.content} className="w-full">
          <div className="w-full">
            <div className="flex items-center justify-center gap-1">
              {cell.icon && <img src={cell.icon} alt="" loading="lazy" className="h-5 w-5 rounded object-cover" />}
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{cell.label}</p>
            </div>
            <p className={`mt-0.5 text-xs font-bold ${statusClass(row.equipment.status, 'text-gray-800 dark:text-gray-200')}`}>
              {row.equipment.status === 'error' ? '조회 실패' : row.equipment.status !== 'success' ? '…' : cell.normalLevel === null ? '-' : `+${cell.normalLevel}`}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{cell.label === '완갑' ? `${cell.grade ?? '-'} · 품질 ${cell.quality ?? '-'}` : `상급 ${cell.advancedLevel ?? '-'} · 품질 ${cell.quality ?? '-'}`}</p>
          </div>
        </Tooltip>
      </div>
      );
    })}
  </div>
);

const DetailButton: React.FC<{ readonly row: ExpeditionCharacterState; readonly onClick: () => void; readonly controlsId: string }> = ({ row, onClick, controlsId }) => (
  <button
    type="button"
    aria-expanded={row.expanded}
    aria-controls={controlsId}
    onClick={onClick}
    className="min-h-10 rounded-lg bg-la-gold/15 px-3 py-2 text-xs font-bold text-la-gold-deep transition-colors hover:bg-la-gold/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-la-gold"
  >
    {row.expanded ? '상세 닫기' : '상세 보기'}
  </button>
);

const RetryButton: React.FC<{ readonly onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} className="min-h-10 rounded-lg px-2 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40">다시 시도</button>
);

const CardView: React.FC<Omit<Props, 'viewMode'>> = ({ rows, onToggleExpanded, onRetry }) => (
  <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
    {rows.map((row) => {
      const profile = row.profile.data;
      const hasError = rowHasError(row);
      const detailsId = `expedition-details-${row.sibling.CharacterName.replace(/\s+/g, '-')}`;
      return (
        <GlassCard key={row.sibling.CharacterName} className={`overflow-hidden ${row.expanded ? 'md:col-span-2 xl:col-span-3' : ''}`}>
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-white/5">
                {profile?.CharacterImage ? <FallbackImage src={profile.CharacterImage} alt={row.sibling.CharacterName} className="h-full w-full object-cover object-top" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/character?nickname=${encodeURIComponent(row.sibling.CharacterName)}`} className="font-bold text-gray-900 hover:text-la-gold-deep dark:text-white dark:hover:text-la-gold">{row.sibling.CharacterName}</Link>
                <p className="text-xs text-gray-500 dark:text-gray-400">{row.sibling.CharacterClassName} · {row.sibling.ServerName}</p>
                <p className="mt-1 text-sm font-bold text-la-gold-deep dark:text-la-gold">Lv. {profile?.ItemAvgLevel ?? row.sibling.ItemAvgLevel}</p>
                <p className={`text-xs ${statusClass(row.profile.status, 'text-gray-500 dark:text-gray-400')}`}>전투력 {profile?.CombatPower ?? (row.profile.status === 'error' ? '조회 실패' : '…')}</p>
              </div>
            </div>
            <div className="mt-4"><EquipmentStrip row={row} compact /></div>
            <div className="mt-4 flex items-center justify-between">
              <DetailButton row={row} onClick={() => onToggleExpanded(row.sibling.CharacterName)} controlsId={detailsId} />
              {hasError && <RetryButton onClick={() => onRetry(row.sibling.CharacterName)} />}
            </div>
          </div>
          {row.expanded && <ExpeditionCharacterDetails row={row} id={detailsId} />}
        </GlassCard>
      );
    })}
  </div>
);

const GridView: React.FC<Omit<Props, 'viewMode'>> = ({ rows, onToggleExpanded, onRetry }) => (
  <div className="space-y-3">
    {rows.map((row) => {
      const profile = row.profile.data;
      const hasError = rowHasError(row);
      const detailsId = `expedition-details-${row.sibling.CharacterName.replace(/\s+/g, '-')}`;
      return (
        <GlassCard key={row.sibling.CharacterName} className="overflow-hidden">
          <div className="grid gap-3 p-4 lg:grid-cols-[180px_minmax(420px,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-2">
              {profile?.CharacterImage && <FallbackImage src={profile.CharacterImage} alt={row.sibling.CharacterName} className="h-12 w-12 shrink-0 rounded-xl object-cover object-top" />}
              <div className="min-w-0"><p className="truncate font-bold text-gray-900 dark:text-white">{row.sibling.CharacterName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{row.sibling.CharacterClassName} · {row.sibling.ServerName}</p>
                <p className={`mt-1 text-xs font-bold ${statusClass(row.profile.status, 'text-la-gold-deep dark:text-la-gold')}`}>Lv. {profile?.ItemAvgLevel ?? row.sibling.ItemAvgLevel} · 전투력 {profile?.CombatPower ?? (row.profile.status === 'error' ? '조회 실패' : '…')}</p>
              </div>
            </div>
            <EquipmentStrip row={row} />
            <div className="flex gap-1 lg:flex-col">
              <DetailButton row={row} onClick={() => onToggleExpanded(row.sibling.CharacterName)} controlsId={detailsId} />
              {hasError && <RetryButton onClick={() => onRetry(row.sibling.CharacterName)} />}
            </div>
          </div>
          {row.expanded && <ExpeditionCharacterDetails row={row} id={detailsId} />}
        </GlassCard>
      );
    })}
  </div>
);

const TableView: React.FC<Omit<Props, 'viewMode'>> = ({ rows, onToggleExpanded, onRetry }) => (
  <GlassCard className="overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] w-full border-collapse text-left text-xs">
        <thead className="bg-gray-100/90 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
          <tr>
            <th className="sticky left-0 z-10 min-w-44 bg-gray-100/95 px-3 py-3 dark:bg-[#25262b]">캐릭터</th>
            <th className="px-3 py-3">아이템 레벨</th><th className="px-3 py-3">전투력</th>
            {['무기', '투구', '어깨', '상의', '하의', '장갑', '완갑'].map((label) => <th key={label} className="min-w-24 px-2 py-3 text-center">{label}<span className="block text-[9px] font-normal">{label === '완갑' ? '등급/강화/품질' : '재련/상급/품질'}</span></th>)}
            <th className="px-3 py-3">상세</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
          {rows.map((row) => {
            const profile = row.profile.data;
            const hasError = rowHasError(row);
            const detailsId = `expedition-details-${row.sibling.CharacterName.replace(/\s+/g, '-')}`;
            return (
              <React.Fragment key={row.sibling.CharacterName}>
                <tr className="bg-white/60 align-middle dark:bg-white/[0.02]">
                  <td className="sticky left-0 z-[1] bg-white/95 px-3 py-3 dark:bg-[#1c1d21]">
                    <div className="flex items-center gap-2">
                      {profile?.CharacterImage && <FallbackImage src={profile.CharacterImage} alt={row.sibling.CharacterName} className="h-9 w-9 shrink-0 rounded-lg object-cover object-top" />}
                      <div><Link to={`/character?nickname=${encodeURIComponent(row.sibling.CharacterName)}`} className="font-bold text-gray-900 hover:text-la-gold-deep dark:text-white">{row.sibling.CharacterName}</Link>
                        <span className="block text-[10px] text-gray-500 dark:text-gray-400">{row.sibling.CharacterClassName} · {row.sibling.ServerName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-bold text-la-gold-deep dark:text-la-gold">{profile?.ItemAvgLevel ?? row.sibling.ItemAvgLevel}</td>
                  <td className={`px-3 py-3 ${statusClass(row.profile.status)}`}>{profile?.CombatPower ?? (row.profile.status === 'error' ? '조회 실패' : '…')}</td>
                  {equipmentCells(row.equipment.data).map((cell) => {
                    const tip = equipmentTooltip(cell);
                    return (
                    <td key={cell.label} className={`px-2 py-3 text-center ${statusClass(row.equipment.status)}`}>
                      <Tooltip label={tip.label} content={tip.content} className="w-full">
                        <span className="block w-full">{row.equipment.status === 'success' ? <><span className="inline-flex items-center justify-center gap-1">{cell.icon && <img src={cell.icon} alt="" loading="lazy" className="h-6 w-6 rounded object-cover" />}<strong>{cell.normalLevel === null ? '-' : `+${cell.normalLevel}`}</strong></span><span className="block text-[10px] text-gray-500 dark:text-gray-400">{cell.label === '완갑' ? `${cell.grade ?? '-'} / ${cell.quality ?? '-'}` : `${cell.advancedLevel ?? '-'} / ${cell.quality ?? '-'}`}</span></> : row.equipment.status === 'error' ? '조회 실패' : '…'}</span>
                      </Tooltip>
                    </td>
                    );
                  })}
                  <td className="px-3 py-3"><div className="flex gap-1"><DetailButton row={row} onClick={() => onToggleExpanded(row.sibling.CharacterName)} controlsId={detailsId} />{hasError && <RetryButton onClick={() => onRetry(row.sibling.CharacterName)} />}</div></td>
                </tr>
                {row.expanded && <tr><td colSpan={11} className="bg-gray-50/70 p-0 dark:bg-black/10"><ExpeditionCharacterDetails row={row} id={detailsId} /></td></tr>}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  </GlassCard>
);

const ExpeditionDashboardViews: React.FC<Props> = (props) => {
  if (props.viewMode === 'card') return <CardView {...props} />;
  if (props.viewMode === 'grid') return <GridView {...props} />;
  return <TableView {...props} />;
};

export default ExpeditionDashboardViews;
