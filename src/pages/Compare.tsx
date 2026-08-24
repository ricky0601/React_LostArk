import React, { useState } from 'react';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import GlassCard from '../components/GlassCard';
import QuickLinks from '../components/QuickLinks';
import {
  fetchProfile,
  fetchEquipment,
  fetchGems,
  fetchEngravings,
  fetchArkGrid,
} from '../utils/api';
import type { CompareData } from '../components/compare/compareModel';
import { CharacterInput } from '../components/compare/ComparePrimitives';
import ProfileSection from '../components/compare/CompareProfileSection';
import EquipmentSection from '../components/compare/CompareEquipmentSection';
import GemSection from '../components/compare/CompareGemSection';
import EngravingSection from '../components/compare/CompareEngravingSection';
import ArkGridSection from '../components/compare/CompareArkGridSection';
import CompareSkeleton from '../components/compare/CompareSkeleton';

const Compare: React.FC = () => {
  const [leftName, setLeftName] = useState('');
  const [rightName, setRightName] = useState('');
  const [leftData, setLeftData] = useState<CompareData | null>(null);
  const [rightData, setRightData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialFailMsg, setPartialFailMsg] = useState<string | null>(null);

  const fetchCharacterData = async (name: string): Promise<CompareData> => {
    const [profile, equipment, gems, engravings, arkGrid] = await Promise.all([
      fetchProfile(name),
      fetchEquipment(name),
      fetchGems(name).catch(() => null),
      fetchEngravings(name).catch(() => null),
      fetchArkGrid(name).catch(() => null),
    ]);

    if (!profile?.CharacterName) {
      throw new Error('Invalid character profile payload');
    }

    if (!Array.isArray(equipment)) {
      throw new Error('Invalid character equipment payload');
    }

    return { profile, equipment, gems, engravings, arkGrid };
  };

  const resetResults = (): void => {
    setLeftData(null);
    setRightData(null);
    setPartialFailMsg(null);
  };

  const handleCompare = async () => {
    const lName = leftName.trim();
    const rName = rightName.trim();
    if (!lName || !rName) {
      setError('두 캐릭터의 닉네임을 모두 입력해주세요.');
      resetResults();
      return;
    }
    if (lName === rName) {
      setError('서로 다른 캐릭터를 입력해주세요.');
      resetResults();
      return;
    }

    setLoading(true);
    setError(null);
    resetResults();

    try {
      const [lResult, rResult] = await Promise.allSettled([
        fetchCharacterData(lName),
        fetchCharacterData(rName),
      ]);

      if (lResult.status === 'rejected' && rResult.status === 'rejected') {
        setError('두 캐릭터 모두 조회에 실패했습니다. 닉네임을 확인해주세요.');
        return;
      }

      if (lResult.status === 'fulfilled') setLeftData(lResult.value);
      if (rResult.status === 'fulfilled') setRightData(rResult.value);

      const failedName =
        lResult.status === 'rejected' ? lName :
        rResult.status === 'rejected' ? rName : null;
      if (failedName) {
        setPartialFailMsg(`"${failedName}" 캐릭터를 조회하지 못해 비교할 수 없습니다. 닉네임을 확인해주세요.`);
      }
    } catch {
      setError('조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleCompare();
  };

  const hasLeftName = leftName.trim().length > 0;
  const hasRightName = rightName.trim().length > 0;
  const canCompare = hasLeftName && hasRightName;
  const compareGuidance = hasLeftName || hasRightName
    ? '비교할 캐릭터 닉네임을 한쪽 더 입력해 주세요.'
    : '비교하려면 두 캐릭터 닉네임을 모두 입력해 주세요.';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
      <NavBar />
      <PullToRefresh>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Input Section */}
        <GlassCard className="p-6 mb-8 animate-fade-in">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
            캐릭터 비교
          </h1>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4" onKeyDown={handleKeyDown}>
            <CharacterInput
              label="캐릭터 A"
              value={leftName}
              onChange={setLeftName}
              placeholder="캐릭터 닉네임"
            />

            <div className="flex-shrink-0 self-center sm:self-auto sm:pt-7">
              <div className="w-10 h-10 rounded-full bg-la-gold/10 flex items-center justify-center">
                <span className="text-la-gold-dark dark:text-la-gold font-bold text-sm">VS</span>
              </div>
            </div>

            <CharacterInput
              label="캐릭터 B"
              value={rightName}
              onChange={setRightName}
              placeholder="비교할 캐릭터"
            />
          </div>

          <button
            onClick={handleCompare}
            disabled={loading || !canCompare}
            aria-describedby={!canCompare ? 'compare-submit-guidance' : undefined}
            className="w-full mt-4 btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '조회 중...' : '비교하기'}
          </button>

          {!canCompare && (
            <p
              id="compare-submit-guidance"
              role="status"
              className="mt-2 break-keep text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400"
            >
              {compareGuidance}
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
          )}
        </GlassCard>

        {/* Idle: 검색 전 다른 기능 바로가기 */}
        {!loading && !leftData && !rightData && (
          <div className="flex justify-center">
            <QuickLinks />
          </div>
        )}

        {/* Loading */}
        {loading && <CompareSkeleton />}

        {/* Results */}
        {!loading && leftData && rightData && (
          <div className="space-y-6">
            <ProfileSection left={leftData.profile} right={rightData.profile} />
            <EquipmentSection leftEquip={leftData.equipment} rightEquip={rightData.equipment} />
            <GemSection leftGems={leftData.gems} rightGems={rightData.gems} />
            <ArkGridSection leftArkGrid={leftData.arkGrid} rightArkGrid={rightData.arkGrid} />
            <EngravingSection leftEng={leftData.engravings} rightEng={rightData.engravings} />
          </div>
        )}

        {/* Partial results (one side failed) */}
        {!loading && ((leftData && !rightData) || (!leftData && rightData)) && (
          <div className="space-y-6">
            <GlassCard className="p-5 animate-fade-in">
              <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                {partialFailMsg ?? '한쪽 캐릭터만 조회되었습니다. 비교하려면 양쪽 모두 유효한 닉네임이 필요합니다.'}
              </p>
            </GlassCard>
          </div>
        )}
      </main>
      </PullToRefresh>
    </div>
  );
};

export default Compare;
