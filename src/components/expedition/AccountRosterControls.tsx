import React from 'react';
import GlassCard from '../GlassCard';

interface Props {
  readonly lastSyncedAt: string | null;
  readonly message: string | null;
  readonly messageTone: 'status' | 'alert';
  readonly loading: boolean;
  readonly saving: boolean;
  readonly onRefresh: () => void;
  readonly onSave: () => void;
}

const formatSyncedAt = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const AccountRosterControls: React.FC<Props> = ({
  lastSyncedAt,
  message,
  messageTone,
  loading,
  saving,
  onRefresh,
  onSave,
}) => {
  const isStale = lastSyncedAt != null
    && Date.now() - new Date(lastSyncedAt).getTime() > 24 * 60 * 60 * 1000;

  return (
    <GlassCard className="mb-4 p-4">
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onRefresh} disabled={loading || saving} className="rounded-lg border border-la-gold/40 px-4 py-2 text-sm font-bold text-la-gold-deep disabled:opacity-50 dark:text-la-gold">최신 정보 조회</button>
        <button type="button" onClick={onSave} disabled={loading || saving} className="rounded-lg bg-la-gold px-4 py-2 text-sm font-bold text-la-dark disabled:opacity-50">{saving ? '저장 중…' : '내 원정대 저장'}</button>
      </div>
      {lastSyncedAt && <p className="mt-2 text-left text-xs text-gray-500">마지막 저장: {formatSyncedAt(lastSyncedAt)}{isStale ? ' · 오래된 데이터' : ''}</p>}
      {message && <p role={messageTone} className="mt-2 text-left text-xs text-gray-600 dark:text-gray-300">{message}</p>}
    </GlassCard>
  );
};

export default AccountRosterControls;
