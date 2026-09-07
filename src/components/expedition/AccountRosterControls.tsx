import React from 'react';
import type { SiblingCharacter } from '../../types/lostark';
import GlassCard from '../GlassCard';

interface Props {
  readonly siblings: readonly SiblingCharacter[];
  readonly representativeName: string | null;
  readonly lastSyncedAt: string | null;
  readonly message: string | null;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly onRepresentativeChange: (name: string | null) => void;
  readonly onRefresh: () => void;
  readonly onSave: () => void;
  readonly onReleaseRepresentative: () => void;
}

const formatSyncedAt = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const AccountRosterControls: React.FC<Props> = ({
  siblings,
  representativeName,
  lastSyncedAt,
  message,
  loading,
  saving,
  onRepresentativeChange,
  onRefresh,
  onSave,
  onReleaseRepresentative,
}) => {
  const isStale = lastSyncedAt != null
    && Date.now() - new Date(lastSyncedAt).getTime() > 24 * 60 * 60 * 1000;

  return (
    <GlassCard className="mb-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-left text-xs font-bold text-gray-600 dark:text-gray-300">
          대표 캐릭터
          <select value={representativeName ?? ''} onChange={(event) => onRepresentativeChange(event.target.value || null)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:bg-la-dark-soft dark:text-white">
            <option value="">선택 안 함</option>
            {siblings.map((character) => <option key={character.CharacterName} value={character.CharacterName}>{character.CharacterName}</option>)}
          </select>
        </label>
        <button type="button" onClick={onRefresh} disabled={loading || saving} className="rounded-lg border border-la-gold/40 px-4 py-2 text-sm font-bold text-la-gold-deep disabled:opacity-50 dark:text-la-gold">최신 정보 조회</button>
        <button type="button" onClick={onSave} disabled={loading || saving} className="rounded-lg bg-la-gold px-4 py-2 text-sm font-bold text-la-dark disabled:opacity-50">{saving ? '저장 중…' : '원정대 저장'}</button>
        {representativeName && <button type="button" onClick={onReleaseRepresentative} disabled={saving} className="rounded-lg px-3 py-2 text-sm text-gray-500 underline disabled:opacity-50">대표 해제</button>}
      </div>
      {lastSyncedAt && <p className="mt-2 text-left text-xs text-gray-500">마지막 저장: {formatSyncedAt(lastSyncedAt)}{isStale ? ' · 오래된 데이터' : ''}</p>}
      {message && <p role="status" className="mt-2 text-left text-xs text-gray-600 dark:text-gray-300">{message}</p>}
    </GlassCard>
  );
};

export default AccountRosterControls;
