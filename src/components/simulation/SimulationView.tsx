import React from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../NavBar';
import PullToRefresh from '../PullToRefresh';
import NicknameInput from '../NicknameInput';
import NicknameSearchBar from '../NicknameSearchBar';
import CharacterRaidCard from './CharacterRaidCard';
import GoldLoadingSkeleton from './GoldLoadingSkeleton';
import { MAX_GOLD_CHARACTERS, RAID_COLUMNS } from '../../data/raidGold';
import { bonusKey, normalizeRaidSelection } from '../../utils/simulationKeys';
import type { SimulationPageModel } from './useSimulationPage';

const SimulationView: React.FC<{ model: SimulationPageModel }> = ({ model }) => {
  const {
    nickname,
    server,
    loading,
    error,
    selectedNames,
    showMore,
    setShowMore,
    customRaidSelection,
    setCustomRaidSelection,
    bonusSelections,
    setBonusSelections,
    completedRaids,
    allResults,
    selectedResults,
    unselectedResults,
    totalWeeklyGold,
    totalBonusCost,
    netWeeklyGold,
    characterBonusCosts,
    netBoundGold,
    netTradeableGold,
    characterCores,
    totalCores,
    earnedGold,
    earnedNetTradeable,
    earnedNetBound,
    remainingGold,
    remainingTradeable,
    remainingBound,
    isAllBonusSelected,
    formatGold,
    handleNicknameSubmit,
    toggleCharacter,
    toggleBonus,
    toggleAllBonus,
    toggleComplete,
  } = model;

    // 닉네임이 없으면 NicknameInput 표시
    if (!nickname) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
                <NavBar />
                <NicknameInput
                    title="로아 주간 골드 계산기"
                    description="캐릭터별 레이드 보상과 더보기 비용을 반영해 원정대 주간 골드를 계산하고 숙제 현황을 관리하세요."
                    buttonText="골드 계산 시작"
                    onSubmit={handleNicknameSubmit}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
            <NavBar />
            <PullToRefresh>
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6 text-center animate-fade-in">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        로아 주간 골드 계산기
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        <span className="font-semibold text-la-gold-dark dark:text-la-gold">{nickname}</span>님의 레이드 보상과 더보기 비용을 반영해 원정대 주간 골드를 계산합니다.
                    </p>
                    <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                        {server ? `${server} 서버` : ''} {!loading && allResults.length > 0 && `| ${allResults.length} 캐릭터`}
                    </p>
                    <div className="mt-3">
                        <NicknameSearchBar onSearch={handleNicknameSubmit} />
                    </div>
                </div>

                {loading ? (
                    <GoldLoadingSkeleton />
                ) : error ? (
                    <div className="glass-card p-8 text-center animate-fade-in">
                        <p className="text-red-500 dark:text-red-400 text-lg">{error}</p>
                    </div>
                ) : allResults.length > 0 ? (
                    <>
                        {/* Character Selector - 선택된 캐릭터만 표시 */}
                        <div className="glass-card p-5 mb-6 animate-fade-in">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    골드 획득 캐릭터 ({selectedNames.size}/{MAX_GOLD_CHARACTERS})
                                </h2>
                                {/* 일괄 더보기 버튼 */}
                                <button
                                    onClick={toggleAllBonus}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer border ${
                                        isAllBonusSelected
                                            ? 'bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/30'
                                            : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-red-400/50 hover:text-red-500 dark:bg-white/5 dark:border-white/10 dark:text-gray-400 dark:hover:border-red-400/50 dark:hover:text-red-400'
                                    }`}
                                >
                                    {isAllBonusSelected ? '더보기 전체 해제' : '더보기 전체 선택'}
                                </button>
                            </div>
                            {/* 선택된 캐릭터 */}
                            <div className="flex flex-wrap gap-2">
                                {selectedResults.map((r) => (
                                    <div
                                        key={r.characterName}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 border bg-la-gold/20 border-la-gold/50 text-la-gold-dark dark:text-la-gold"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleCharacter(r.characterName)}
                                            className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 bg-la-gold border-la-gold text-la-dark"
                                            aria-label={`${r.characterName} 골드 캐릭터 선택 해제`}
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </button>
                                        <Link
                                            to={`/character?nickname=${encodeURIComponent(r.characterName)}`}
                                            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                                        >
                                            <img
                                                src={r.characterImage}
                                                alt={r.characterName}
                                                loading="lazy"
                                                className="w-6 h-6 rounded-md object-cover object-top"
                                            />
                                            <span className="font-medium truncate">{r.characterName}</span>
                                            <span className="text-xs opacity-60 flex-shrink-0">Lv.{r.itemLevel.toFixed(0)}</span>
                                        </Link>
                                    </div>
                                ))}
                            </div>

                            {/* 미선택 캐릭터 더보기 */}
                            {unselectedResults.length > 0 && (
                                <div className="mt-3">
                                    <button
                                        onClick={() => setShowMore((prev) => !prev)}
                                        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                                    >
                                        <span>다른 캐릭터 {unselectedResults.length}명</span>
                                        <svg
                                            className={`w-3.5 h-3.5 transition-transform duration-300 ${showMore ? 'rotate-180' : ''}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {showMore && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {unselectedResults.map((r) => {
                                                const isFull = selectedNames.size >= MAX_GOLD_CHARACTERS;
                                                return (
                                                    <div
                                                        key={r.characterName}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 border ${
                                                            isFull
                                                                ? 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-white/5 dark:border-white/5 dark:text-gray-600'
                                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-la-gold/30 dark:bg-white/5 dark:border-white/10 dark:text-gray-400 dark:hover:border-la-gold/30'
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCharacter(r.characterName)}
                                                            disabled={isFull}
                                                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                                isFull ? 'border-gray-200 dark:border-white/10 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'
                                                            }`}
                                                            aria-label={`${r.characterName} 골드 캐릭터 선택`}
                                                        />
                                                        <Link
                                                            to={`/character?nickname=${encodeURIComponent(r.characterName)}`}
                                                            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                                                        >
                                                            <img
                                                                src={r.characterImage}
                                                                alt={r.characterName}
                                                                loading="lazy"
                                                                className="w-6 h-6 rounded-md object-cover object-top"
                                                            />
                                                            <span className="font-medium truncate">{r.characterName}</span>
                                                            <span className="text-xs opacity-60 flex-shrink-0">Lv.{r.itemLevel.toFixed(0)}</span>
                                                        </Link>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Gold Summary */}
                        <div className="glass-card p-6 mb-8 animate-fade-in">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div className="text-center min-w-0">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">주간 총 골드</p>
                                    <p className="text-3xl font-bold bg-gradient-to-r from-la-gold to-la-gold-light bg-clip-text text-transparent">
                                        {formatGold(totalWeeklyGold)}G
                                    </p>
                                </div>
                                <div className="text-center min-w-0">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">더보기 비용</p>
                                    <p className={`text-2xl font-bold ${totalBonusCost > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-600'}`}>
                                        {totalBonusCost > 0 ? '-' : ''}{formatGold(totalBonusCost)}G
                                    </p>
                                </div>
                                <div className="text-center min-w-0">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">실수령 골드</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {formatGold(netWeeklyGold)}G
                                    </p>
                                </div>
                                <div className="text-center min-w-0">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">거래 가능 + 귀속</p>
                                    <p className="text-base md:text-lg font-bold leading-tight">
                                        <span className="inline-block whitespace-nowrap text-la-gold-dark dark:text-la-gold">{formatGold(netTradeableGold)}G</span>
                                        <span className="text-gray-400 dark:text-gray-500 mx-1">+</span>
                                        <span className="inline-block whitespace-nowrap text-sky-600 dark:text-sky-400">{formatGold(netBoundGold)}G</span>
                                    </p>
                                </div>
                            </div>
                            {/* 진행률 바 */}
                            <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/5">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-gray-500 dark:text-gray-400">주간 진행률</span>
                                    <span className="text-gray-600 dark:text-gray-300 font-medium">
                                        {netWeeklyGold > 0 ? Math.round((earnedGold / netWeeklyGold) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-200/70 dark:bg-white/5 rounded-full overflow-hidden flex">
                                    <div
                                        className={`h-full bg-gradient-to-r from-la-gold to-la-gold-light transition-all duration-500 flex-shrink-0 ${earnedNetBound > 0 ? 'rounded-l-full' : 'rounded-full'}`}
                                        style={{ width: `${netWeeklyGold > 0 ? Math.min((earnedNetTradeable / netWeeklyGold) * 100, 100) : 0}%` }}
                                    />
                                    <div
                                        className="h-full bg-sky-500 dark:bg-sky-400 rounded-r-full transition-all duration-500 flex-shrink-0"
                                        style={{ width: `${netWeeklyGold > 0 ? Math.min((earnedNetBound / netWeeklyGold) * 100, 100) : 0}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2 text-sm gap-2">
                                    <span className="text-green-600 dark:text-green-400 font-medium min-w-0">
                                        획득: {formatGold(earnedGold)}G
                                        {earnedNetBound > 0 && (
                                            <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                                                (<span className="text-la-gold-dark dark:text-la-gold">{formatGold(earnedNetTradeable)}</span> + <span className="text-sky-600 dark:text-sky-400">{formatGold(earnedNetBound)}</span>)
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 min-w-0 text-right">
                                        남은 숙제: {formatGold(remainingGold)}G
                                        {remainingBound > 0 && (
                                            <span className="font-normal ml-1">
                                                (<span className="text-la-gold-dark dark:text-la-gold">{formatGold(remainingTradeable)}</span> + <span className="text-sky-600 dark:text-sky-400">{formatGold(remainingBound)}</span>)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                            {/* 코어 요약 - 코어가 있는 경우에만 표시 */}
                            {totalCores.total > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/5 flex items-center justify-center gap-3">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">주간 코어</span>
                                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                        {totalCores.base}개
                                    </span>
                                    {totalCores.bonus > 0 && (
                                        <span className="text-sm text-purple-400 dark:text-purple-300">
                                            +{totalCores.bonus} (더보기)
                                        </span>
                                    )}
                                    {totalCores.bonus > 0 && (
                                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                            = {totalCores.total}개
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 캐릭터별 카드 (레이드 3개 + 완료 체크 + 더보기 + 레이드 변경) */}
                        <div className="space-y-4 mb-6">
                            {selectedResults.map((result, index) => {
                                const charCore = characterCores.get(result.characterName);
                                const charGateKeys = result.selectedRaids.flatMap((raid) =>
                                    raid.gates.map((g) => bonusKey(result.characterName, raid.raidName, raid.difficulty, g.gate))
                                );
                                const isAllChar = charGateKeys.length > 0 && charGateKeys.every((k) => bonusSelections.has(k));
                                const customKeys = customRaidSelection[result.characterName];
                                const selectedRaidKeys = (customKeys?.length ? customKeys : undefined) ?? result.selectedRaids.map((r) => `${r.raidName}::${r.difficulty}`);
                                const hasCustomRaids = Boolean(customKeys?.length);
                                return (
                                    <CharacterRaidCard
                                        key={result.characterName}
                                        result={result}
                                        index={index}
                                        formatGold={formatGold}
                                        bonusSelections={bonusSelections}
                                        onToggleBonus={(raidName, difficulty, gate) =>
                                            toggleBonus(result.characterName, raidName, difficulty, gate)
                                        }
                                        onToggleAllCharBonus={() => {
                                            setBonusSelections((prev) => {
                                                const next = new Set(prev);
                                                if (isAllChar) {
                                                    charGateKeys.forEach((k) => next.delete(k));
                                                } else {
                                                    charGateKeys.forEach((k) => next.add(k));
                                                }
                                                return next;
                                            });
                                        }}
                                        isAllCharBonusSelected={isAllChar}
                                        characterBonusCost={characterBonusCosts.get(result.characterName) ?? 0}
                                        coreData={charCore}
                                        completedRaids={completedRaids}
                                        onToggleComplete={(raidName, difficulty) =>
                                            toggleComplete(result.characterName, raidName, difficulty)
                                        }
                                        selectedRaidKeys={selectedRaidKeys}
                                        onRaidSelectionChange={(keys) => {
                                            setCustomRaidSelection((prev) => {
                                                const next = { ...prev };
                                                const currentKeys = prev[result.characterName]?.length ? prev[result.characterName] : selectedRaidKeys;
                                                const normalizedKeys = normalizeRaidSelection(currentKeys, keys);
                                                if (normalizedKeys.length === 0) {
                                                    delete next[result.characterName];
                                                } else {
                                                    next[result.characterName] = normalizedKeys;
                                                }
                                                return next;
                                            });
                                        }}
                                        onResetRaidSelection={() => {
                                            setCustomRaidSelection((prev) => {
                                                const next = { ...prev };
                                                delete next[result.characterName];
                                                return next;
                                            });
                                        }}
                                        hasCustomRaids={hasCustomRaids}
                                        allRaids={RAID_COLUMNS}
                                    />
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="glass-card p-8 text-center animate-fade-in">
                        <p className="text-gray-500 dark:text-gray-400">원정대 캐릭터가 없습니다.</p>
                    </div>
                )}
            </main>
            </PullToRefresh>
        </div>
    );
};

export default SimulationView;
