import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SiblingCharacter, CharacterProfile } from '../types/lostark';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import NicknameInput from '../components/NicknameInput';
import NicknameSearchBar from '../components/NicknameSearchBar';
import { fetchSiblings, fetchProfile, LS_NICKNAME } from '../utils/api';
import {
    calculateCharacterGold,
    getRaidDataByKey,
    MAX_GOLD_CHARACTERS,
    MAX_GOLD_RAIDS_PER_CHARACTER,
    RAID_COLUMNS,
    type CharacterGoldResult,
    type RaidColumn,
    type SelectedRaid,
} from '../data/raidGold';

const bonusKey = (charName: string, raidName: string, difficulty: string, gate: number): string =>
    `${charName}::${raidName}::${difficulty}::${gate}`;

const completedKey = (charName: string, raidName: string, difficulty: string): string =>
    `${charName}::${raidName}::${difficulty}`;

function getLoaWeekKey(): string {
    const now = new Date();
    const kstMs = now.getTime() + (now.getTimezoneOffset() + 540) * 60000;
    const adjusted = new Date(kstMs - 21600000); // 06:00 기준 보정
    const day = adjusted.getDay();
    const daysFromWed = (day + 4) % 7;
    const wed = new Date(adjusted);
    wed.setDate(wed.getDate() - daysFromWed);
    const y = wed.getFullYear();
    const m = String(wed.getMonth() + 1).padStart(2, '0');
    const d = String(wed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const LS_WEEK_KEY = 'loaGold_weekKey';
const LS_COMPLETED = 'loaGold_completed';
const LS_BONUS = 'loaGold_bonus';
const LS_SELECTED = 'loaGold_selectedNames';

const Simulation: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlNickname = searchParams.get('nickname');
    const [nickname, setNickname] = useState<string | null>(() => {
        return urlNickname || localStorage.getItem(LS_NICKNAME);
    });
    const [server, setServer] = useState<string | null>(null);
    const [characterNames, setCharacterNames] = useState<SiblingCharacter[]>([]);
    const [characterInfo, setCharacterInfo] = useState<(CharacterProfile | null)[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedNames, setSelectedNames] = useState<Set<string>>(() => {
        const data = localStorage.getItem(LS_SELECTED);
        return data ? new Set(JSON.parse(data)) : new Set();
    });
    const [showMore, setShowMore] = useState(false);
    /** 캐릭터별 커스텀 레이드 3개 선택 (키: "raidName::difficulty"). 있으면 selectedRaids 대신 사용 */
    const [customRaidSelection, setCustomRaidSelection] = useState<Record<string, string[]>>({});
    const [bonusSelections, setBonusSelections] = useState<Set<string>>(() => {
        const weekKey = getLoaWeekKey();
        const stored = localStorage.getItem(LS_WEEK_KEY);
        if (stored !== weekKey) {
            localStorage.setItem(LS_WEEK_KEY, weekKey);
            localStorage.removeItem(LS_COMPLETED);
            localStorage.removeItem(LS_BONUS);
            return new Set();
        }
        const data = localStorage.getItem(LS_BONUS);
        return data ? new Set(JSON.parse(data)) : new Set();
    });
    const [completedRaids, setCompletedRaids] = useState<Set<string>>(() => {
        const weekKey = getLoaWeekKey();
        const stored = localStorage.getItem(LS_WEEK_KEY);
        if (stored !== weekKey) return new Set();
        const data = localStorage.getItem(LS_COMPLETED);
        return data ? new Set(JSON.parse(data)) : new Set();
    });
    // URL 쿼리 파라미터 변경 시 닉네임 동기화
    useEffect(() => {
        if (urlNickname && urlNickname !== nickname) {
            setNickname(urlNickname);
            setServer(null);
            setCharacterNames([]);
            setCharacterInfo([]);
            setSelectedNames(new Set());
            setError(null);
        }
    }, [urlNickname]); // eslint-disable-line react-hooks/exhaustive-deps

    // 닉네임 변경 시 siblings API 호출 + 서버 자동 감지
    useEffect(() => {
        if (nickname) {
            localStorage.setItem(LS_NICKNAME, nickname);
            setLoading(true);
            setError(null);

            fetchSiblings(nickname)
                .then((data) => {
                    if (Array.isArray(data) && data.length > 0) {
                        const serverCounts = new Map<string, number>();
                        data.forEach((c) => {
                            serverCounts.set(c.ServerName, (serverCounts.get(c.ServerName) || 0) + 1);
                        });
                        let maxServer = data[0].ServerName;
                        let maxCount = 0;
                        serverCounts.forEach((count, srv) => {
                            if (count > maxCount) {
                                maxCount = count;
                                maxServer = srv;
                            }
                        });
                        setServer(maxServer);
                        setCharacterNames(data.filter((c) => c.ServerName === maxServer));
                    } else {
                        setError('원정대 캐릭터 정보를 불러올 수 없습니다.');
                    }
                    setLoading(false);
                })
                .catch((err: unknown) => {
                    console.error(err);
                    setError('캐릭터 정보를 불러오는 데 실패했습니다.');
                    setLoading(false);
                });
        }
    }, [nickname]);


    const handleNicknameSubmit = (name: string): void => {
        setSearchParams({ nickname: name });
        setNickname(name);
        setServer(null);
        setCharacterNames([]);
        setCharacterInfo([]);
        setSelectedNames(new Set());
        setError(null);
        setLoading(true);
    };

    const fetchCharacterInfo = useCallback(
        async (characterName: string): Promise<CharacterProfile | null> => {
            try {
                const data = await fetchProfile(characterName);
                if (data && data.CharacterName) {
                    return data;
                }
                return null;
            } catch (err) {
                console.error(err);
                return null;
            }
        },
        []
    );

    useEffect(() => {
        const fetchAll = async (): Promise<void> => {
            if (characterNames.length > 0) {
                setLoading(true);
                const promises = characterNames.map((c) =>
                    fetchCharacterInfo(c.CharacterName)
                );
                const results = await Promise.all(promises);
                results.sort((a, b) => {
                    const lvA = a ? parseFloat(a.ItemAvgLevel.replace(/,/g, '')) : 0;
                    const lvB = b ? parseFloat(b.ItemAvgLevel.replace(/,/g, '')) : 0;
                    return lvB - lvA;
                });
                setCharacterInfo(results);
                setLoading(false);
            }
        };
        fetchAll();
    }, [characterNames, fetchCharacterInfo]);

    const allResults: CharacterGoldResult[] = useMemo(() => {
        const results = characterInfo
            .filter((c): c is CharacterProfile => c !== null)
            .map((c) =>
                calculateCharacterGold(
                    c.CharacterName,
                    c.CharacterClassName,
                    c.ItemAvgLevel,
                    c.CharacterImage
                )
            );
        return [...results].sort((a, b) => b.totalGold - a.totalGold);
    }, [characterInfo]);

    // allResults 로드 시 유효하지 않은 selectedNames 정리
    useEffect(() => {
        if (allResults.length === 0) return;
        const validNames = new Set(allResults.map((r) => r.characterName));
        setSelectedNames((prev) => {
            const filtered = Array.from(prev).filter((name) => validNames.has(name));
            return filtered.length === prev.size ? prev : new Set(filtered);
        });
    }, [allResults]);

    // 초기 선택: 골드 높은 순 6캐릭 자동 선택
    useEffect(() => {
        if (allResults.length > 0 && selectedNames.size === 0) {
            const top6 = allResults
                .slice(0, MAX_GOLD_CHARACTERS)
                .map((r) => r.characterName);
            setSelectedNames(new Set(top6));
        }
    }, [allResults, selectedNames.size]);

    const toggleCharacter = (name: string): void => {
        setSelectedNames((prev) => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else if (next.size < MAX_GOLD_CHARACTERS) {
                next.add(name);
            }
            return next;
        });
    };

    const toggleBonus = (charName: string, raidName: string, difficulty: string, gate: number): void => {
        setBonusSelections((prev) => {
            const key = bonusKey(charName, raidName, difficulty, gate);
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    // 일괄 더보기: 선택된 캐릭터의 모든 관문 더보기 토글
    const toggleAllBonus = (): void => {
        setBonusSelections((prev) => {
            // 모든 가능한 키 계산
            const allKeys: string[] = [];
            for (const result of selectedResults) {
                for (const raid of result.selectedRaids) {
                    for (const gate of raid.gates) {
                        allKeys.push(bonusKey(result.characterName, raid.raidName, raid.difficulty, gate.gate));
                    }
                }
            }
            // 전부 선택되어 있으면 전부 해제, 아니면 전부 선택
            const allSelected = allKeys.every((key) => prev.has(key));
            if (allSelected) {
                return new Set<string>();
            } else {
                return new Set(allKeys);
            }
        });
    };

    const toggleComplete = (charName: string, raidName: string, difficulty: string): void => {
        setCompletedRaids((prev) => {
            const key = completedKey(charName, raidName, difficulty);
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    // selectedNames 변경 시 orphan key 정리 (비어있으면 skip — 초기 로드 중 데이터 보호)
    useEffect(() => {
        if (selectedNames.size === 0) return;
        setBonusSelections((prev) => {
            const arr = Array.from(prev);
            const filtered = arr.filter((key) => selectedNames.has(key.split('::')[0]));
            return filtered.length === arr.length ? prev : new Set(filtered);
        });
        setCompletedRaids((prev) => {
            const arr = Array.from(prev);
            const filtered = arr.filter((key) => selectedNames.has(key.split('::')[0]));
            return filtered.length === arr.length ? prev : new Set(filtered);
        });
    }, [selectedNames]);

    // localStorage 동기화
    useEffect(() => {
        localStorage.setItem(LS_SELECTED, JSON.stringify(Array.from(selectedNames)));
    }, [selectedNames]);

    useEffect(() => {
        localStorage.setItem(LS_BONUS, JSON.stringify(Array.from(bonusSelections)));
    }, [bonusSelections]);

    useEffect(() => {
        localStorage.setItem(LS_COMPLETED, JSON.stringify(Array.from(completedRaids)));
    }, [completedRaids]);

    const goldResults: CharacterGoldResult[] = useMemo(() => {
        return allResults.map((r) => {
            const customKeys = customRaidSelection[r.characterName];
            let selectedRaids = r.selectedRaids;
            let totalGold = r.totalGold;
            if (customKeys && customKeys.length > 0) {
                const raidList: SelectedRaid[] = customKeys
                    .map((key) => {
                        const found = r.availableRaids.find((raid) => `${raid.raidName}::${raid.difficulty}` === key);
                        if (found) return found;
                        const [raidName, difficulty] = key.split('::');
                        return getRaidDataByKey(raidName, difficulty);
                    })
                    .filter((raid): raid is SelectedRaid => raid !== null)
                    .sort((a, b) => b.totalGold - a.totalGold)
                    .slice(0, MAX_GOLD_RAIDS_PER_CHARACTER);
                if (raidList.length > 0) {
                    selectedRaids = raidList;
                    totalGold = raidList.reduce((sum, raid) => sum + raid.totalGold, 0);
                }
            }
            return {
                ...r,
                selectedRaids,
                totalGold,
                isGoldEarner: selectedNames.has(r.characterName),
            };
        });
    }, [allResults, selectedNames, customRaidSelection]);

    const selectedResults = useMemo(() => goldResults.filter((r) => r.isGoldEarner), [goldResults]);
    const unselectedResults = useMemo(() => goldResults.filter((r) => !r.isGoldEarner), [goldResults]);

    const totalWeeklyGold = useMemo(() => {
        return selectedResults.reduce((sum, r) => sum + r.totalGold, 0);
    }, [selectedResults]);

    const boundGold = useMemo(() => {
        return selectedResults.reduce((sum, r) => {
            return sum + r.selectedRaids.reduce((s, raid) => s + raid.boundGold, 0);
        }, 0);
    }, [selectedResults]);

    const totalBonusCost = useMemo(() => {
        let cost = 0;
        for (const result of selectedResults) {
            for (const raid of result.selectedRaids) {
                for (const gate of raid.gates) {
                    const key = bonusKey(result.characterName, raid.raidName, raid.difficulty, gate.gate);
                    if (bonusSelections.has(key)) {
                        cost += gate.bonusCost;
                    }
                }
            }
        }
        return cost;
    }, [selectedResults, bonusSelections]);

    // 실수령 골드 = 주간 총 골드 - 더보기 비용
    const netWeeklyGold = totalWeeklyGold - totalBonusCost;

    // 거래 가능 (실수령) = 실수령 골드 - 귀속 골드  /  귀속은 레이드 기준 고정
    const netTradeableGold = netWeeklyGold - boundGold;
    const netBoundGold = boundGold;

    const characterBonusCosts = useMemo(() => {
        const map = new Map<string, number>();
        for (const result of selectedResults) {
            let charCost = 0;
            for (const raid of result.selectedRaids) {
                for (const gate of raid.gates) {
                    const key = bonusKey(result.characterName, raid.raidName, raid.difficulty, gate.gate);
                    if (bonusSelections.has(key)) {
                        charCost += gate.bonusCost;
                    }
                }
            }
            map.set(result.characterName, charCost);
        }
        return map;
    }, [selectedResults, bonusSelections]);

    // 코어 계산: 캐릭터별 (기본 코어 + 더보기 보너스 코어)
    const characterCores = useMemo(() => {
        const map = new Map<string, { base: number; bonus: number }>();
        for (const result of selectedResults) {
            let base = 0;
            let bonus = 0;
            for (const raid of result.selectedRaids) {
                for (const gate of raid.gates) {
                    base += gate.coreReward;
                    const key = bonusKey(result.characterName, raid.raidName, raid.difficulty, gate.gate);
                    if (bonusSelections.has(key)) {
                        bonus += gate.coreReward;
                    }
                }
            }
            if (base > 0 || bonus > 0) {
                map.set(result.characterName, { base, bonus });
            }
        }
        return map;
    }, [selectedResults, bonusSelections]);

    const totalCores = useMemo(() => {
        let base = 0;
        let bonus = 0;
        characterCores.forEach((v) => {
            base += v.base;
            bonus += v.bonus;
        });
        return { base, bonus, total: base + bonus };
    }, [characterCores]);

    // 완료 진행 계산 (더보기 비용 반영한 실수령 기준)
    const { earnedGold, earnedTradeableRaw, earnedBoundRaw } = useMemo(() => {
        let gold = 0;
        let bonus = 0;
        let tradeable = 0;
        let bound = 0;
        for (const r of selectedResults) {
            for (const raid of r.selectedRaids) {
                if (completedRaids.has(completedKey(r.characterName, raid.raidName, raid.difficulty))) {
                    gold += raid.totalGold;
                    tradeable += raid.totalGold - raid.boundGold;
                    bound += raid.boundGold;
                    for (const gate of raid.gates) {
                        const key = bonusKey(r.characterName, raid.raidName, raid.difficulty, gate.gate);
                        if (bonusSelections.has(key)) {
                            bonus += gate.bonusCost;
                        }
                    }
                }
            }
        }
        return { earnedGold: gold - bonus, earnedTradeableRaw: tradeable, earnedBoundRaw: bound };
    }, [selectedResults, completedRaids, bonusSelections]);

    const remainingGold = netWeeklyGold - earnedGold;

    // 진행률 바용: 획득 골드 중 거래가능/귀속 비율 (귀속은 회색 세그먼트)
    const earnedGoldSplit = useMemo(() => {
        const totalRaw = earnedTradeableRaw + earnedBoundRaw;
        if (totalRaw <= 0) return { tradeableRatio: 1, boundRatio: 0 };
        return {
            tradeableRatio: earnedTradeableRaw / totalRaw,
            boundRatio: earnedBoundRaw / totalRaw,
        };
    }, [earnedTradeableRaw, earnedBoundRaw]);

    // 일괄 더보기 상태: 모든 관문이 선택되어 있는지
    const isAllBonusSelected = useMemo(() => {
        const allKeys: string[] = [];
        for (const result of selectedResults) {
            for (const raid of result.selectedRaids) {
                for (const gate of raid.gates) {
                    allKeys.push(bonusKey(result.characterName, raid.raidName, raid.difficulty, gate.gate));
                }
            }
        }
        return allKeys.length > 0 && allKeys.every((key) => bonusSelections.has(key));
    }, [selectedResults, bonusSelections]);

    const formatGold = (gold: number): string => {
        return gold.toLocaleString();
    };

    // 닉네임이 없으면 NicknameInput 표시
    if (!nickname) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
                <NavBar />
                <NicknameInput
                    title="주간 골드 계산기"
                    description="캐릭터 닉네임을 입력하면 원정대 주간 골드를 계산합니다"
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
                        <span className="text-la-gold-dark dark:text-la-gold">{nickname}</span>님의 주간 골드
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
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
                                    <button
                                        key={r.characterName}
                                        onClick={() => toggleCharacter(r.characterName)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 cursor-pointer border bg-la-gold/20 border-la-gold/50 text-la-gold-dark dark:text-la-gold"
                                    >
                                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 bg-la-gold border-la-gold text-la-dark">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <img
                                            src={r.characterImage}
                                            alt=""
                                            className="w-6 h-6 rounded-md object-cover object-top"
                                        />
                                        <span className="font-medium">{r.characterName}</span>
                                        <span className="text-xs opacity-60">Lv.{r.itemLevel.toFixed(0)}</span>
                                    </button>
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
                                                    <button
                                                        key={r.characterName}
                                                        onClick={() => toggleCharacter(r.characterName)}
                                                        disabled={isFull}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 cursor-pointer border ${
                                                            isFull
                                                                ? 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-white/5 dark:border-white/5 dark:text-gray-600 cursor-not-allowed'
                                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-la-gold/30 dark:bg-white/5 dark:border-white/10 dark:text-gray-400 dark:hover:border-la-gold/30'
                                                        }`}
                                                    >
                                                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 border-gray-300 dark:border-gray-600" />
                                                        <img
                                                            src={r.characterImage}
                                                            alt=""
                                                            className="w-6 h-6 rounded-md object-cover object-top"
                                                        />
                                                        <span className="font-medium">{r.characterName}</span>
                                                        <span className="text-xs opacity-60">Lv.{r.itemLevel.toFixed(0)}</span>
                                                    </button>
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
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">주간 총 골드</p>
                                    <p className="text-3xl font-bold bg-gradient-to-r from-la-gold to-la-gold-light bg-clip-text text-transparent">
                                        {formatGold(totalWeeklyGold)}G
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">더보기 비용</p>
                                    <p className={`text-2xl font-bold ${totalBonusCost > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-600'}`}>
                                        {totalBonusCost > 0 ? '-' : ''}{formatGold(totalBonusCost)}G
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">실수령 골드</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {formatGold(netWeeklyGold)}G
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">거래 가능 / 귀속 (실수령)</p>
                                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                        {formatGold(netTradeableGold)}G
                                        <span className="text-gray-400 dark:text-gray-500 mx-1">/</span>
                                        <span className="text-gray-500 dark:text-gray-400">{formatGold(netBoundGold)}G</span>
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
                                        className={`h-full bg-gradient-to-r from-la-gold to-la-gold-light transition-all duration-500 flex-shrink-0 ${earnedGoldSplit.boundRatio > 0 ? 'rounded-l-full' : 'rounded-full'}`}
                                        style={{ width: `${netWeeklyGold > 0 ? Math.min((earnedGold * earnedGoldSplit.tradeableRatio / netWeeklyGold) * 100, 100) : 0}%` }}
                                    />
                                    <div
                                        className="h-full bg-gray-400 dark:bg-gray-500 rounded-r-full transition-all duration-500 flex-shrink-0"
                                        style={{ width: `${netWeeklyGold > 0 ? Math.min((earnedGold * earnedGoldSplit.boundRatio / netWeeklyGold) * 100, 100) : 0}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2 text-sm">
                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                        획득: {formatGold(earnedGold)}G
                                        {earnedBoundRaw > 0 && (
                                            <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                                                (거래가능 {formatGold(earnedTradeableRaw)} / 귀속 {formatGold(earnedBoundRaw)})
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                        남은 숙제: {formatGold(remainingGold)}G
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
                                        characterEarned={result.selectedRaids
                                            .filter(raid => completedRaids.has(completedKey(result.characterName, raid.raidName, raid.difficulty)))
                                            .reduce((sum, raid) => sum + raid.totalGold, 0)}
                                        selectedRaidKeys={selectedRaidKeys}
                                        onRaidSelectionChange={(keys) => {
                                            setCustomRaidSelection((prev) => {
                                                const next = { ...prev };
                                                if (keys.length === 0) {
                                                    delete next[result.characterName];
                                                } else {
                                                    next[result.characterName] = keys;
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

interface CharacterRaidCardProps {
    result: CharacterGoldResult;
    index: number;
    formatGold: (gold: number) => string;
    dimmed?: boolean;
    bonusSelections: Set<string>;
    onToggleBonus: (raidName: string, difficulty: string, gate: number) => void;
    onToggleAllCharBonus: () => void;
    isAllCharBonusSelected: boolean;
    characterBonusCost: number;
    coreData?: { base: number; bonus: number };
    completedRaids: Set<string>;
    onToggleComplete: (raidName: string, difficulty: string) => void;
    characterEarned: number;
    selectedRaidKeys: string[];
    onRaidSelectionChange: (keys: string[]) => void;
    onResetRaidSelection: () => void;
    hasCustomRaids: boolean;
    allRaids: RaidColumn[];
}

const CharacterRaidCard: React.FC<CharacterRaidCardProps> = ({
    result, index, formatGold, dimmed,
    bonusSelections, onToggleBonus, onToggleAllCharBonus, isAllCharBonusSelected,
    characterBonusCost, coreData, completedRaids, onToggleComplete, characterEarned,
    selectedRaidKeys, onRaidSelectionChange, onResetRaidSelection, hasCustomRaids, allRaids,
}) => {
    const [expandedRaids, setExpandedRaids] = useState<Set<string>>(new Set());
    const [showRaidPicker, setShowRaidPicker] = useState(false);

    const toggleExpand = (raidKey: string): void => {
        setExpandedRaids((prev) => {
            const next = new Set(prev);
            if (next.has(raidKey)) {
                next.delete(raidKey);
            } else {
                next.add(raidKey);
            }
            return next;
        });
    };

    const getRaidBonusCost = (raid: SelectedRaid): number => {
        return raid.gates.reduce((sum, g) => {
            const key = bonusKey(result.characterName, raid.raidName, raid.difficulty, g.gate);
            return sum + (bonusSelections.has(key) ? g.bonusCost : 0);
        }, 0);
    };

    return (
        <div
            className={`glass-card p-4 md:p-5 animate-slide-up ${dimmed ? 'opacity-50' : ''}`}
            style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
        >
            <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Character Info */}
                <div className="flex items-center gap-3 md:w-56 flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 flex-shrink-0">
                        <img
                            src={result.characterImage}
                            alt={result.characterName}
                            className="w-full h-full object-cover object-top"
                        />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">
                            {result.characterName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {result.characterClass}
                        </p>
                        <div className="flex flex-col items-start gap-1 mt-1">
                            <span className="text-xs bg-la-gold/20 text-la-gold-dark dark:text-la-gold px-2 py-0.5 rounded font-medium">
                                Lv.{result.itemLevel.toFixed(2)}
                            </span>
                            {coreData && coreData.base > 0 && (
                                <span className="text-xs bg-purple-500/15 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded font-medium">
                                    코어 {coreData.base}{coreData.bonus > 0 ? `+${coreData.bonus}` : ''}
                                </span>
                            )}
                            {result.selectedRaids.length > 0 && !dimmed && (
                                <button
                                    onClick={onToggleAllCharBonus}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all duration-200 cursor-pointer border ${
                                        isAllCharBonusSelected
                                            ? 'bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400'
                                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-red-400/50 hover:text-red-500 dark:bg-white/5 dark:border-white/10 dark:text-gray-400 dark:hover:text-red-400'
                                    }`}
                                >
                                    {isAllCharBonusSelected ? '더보기 해제' : '일괄 더보기'}
                                </button>
                            )}
                            {!dimmed && result.availableRaids.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowRaidPicker((p) => !p)}
                                    className="px-2 py-0.5 rounded text-[11px] font-medium border bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/15 cursor-pointer"
                                >
                                    {showRaidPicker ? '레이드 선택 닫기' : '레이드 변경'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Raid List */}
                <div className="flex-1 space-y-1.5">
                    {result.selectedRaids.map((raid) => {
                        const raidKey = `${raid.raidName}::${raid.difficulty}`;
                        const isRaidAvailable = result.availableRaids.some((r) => r.raidName === raid.raidName && r.difficulty === raid.difficulty);
                        const isExpanded = expandedRaids.has(raidKey);
                        const raidBonusCost = getRaidBonusCost(raid);
                        const raidHasCores = raid.gates.some((g) => g.coreReward > 0);
                        const isCompleted = completedRaids.has(completedKey(result.characterName, raid.raidName, raid.difficulty));

                        return (
                            <div key={raidKey}>
                                <div
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                                        dimmed ? 'cursor-default' : 'cursor-pointer'
                                    } ${isCompleted ? 'opacity-60' : ''} ${
                                        raid.isBound
                                            ? 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
                                            : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-2" onClick={() => !dimmed && toggleExpand(raidKey)}>
                                        {!dimmed && (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleComplete(raid.raidName, raid.difficulty);
                                                }}
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                                                    isCompleted
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                                                }`}
                                            >
                                                {isCompleted && (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        )}
                                        {!dimmed && (
                                            <svg
                                                className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        )}
                                        <span className={`font-medium ${isCompleted ? 'line-through' : ''}`}>{raid.raidName}</span>
                                        <span className="text-xs opacity-70">{raid.difficulty}</span>
                                        {raidHasCores && (
                                            <span className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">
                                                코어
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2" onClick={() => !dimmed && toggleExpand(raidKey)}>
                                        {isRaidAvailable && raidBonusCost > 0 && (
                                            <span className="text-xs text-red-500 dark:text-red-400">
                                                -{formatGold(raidBonusCost)}
                                            </span>
                                        )}
                                        <span className={`font-bold ${isCompleted ? 'line-through' : ''}`}>{formatGold(raid.totalGold)}G</span>
                                    </div>
                                </div>

                                {/* Gate Detail - 더보기 (참여 가능한 레이드만 적용) */}
                                {isExpanded && !dimmed && isRaidAvailable && (
                                    <div className="mt-1 ml-5 space-y-1">
                                        {raid.gates.map((gate) => {
                                            const gateKey = bonusKey(result.characterName, raid.raidName, raid.difficulty, gate.gate);
                                            const isChecked = bonusSelections.has(gateKey);
                                            return (
                                                <div
                                                    key={gate.gate}
                                                    className="flex items-center justify-between px-3 py-1.5 rounded-md bg-gray-50/50 dark:bg-white/[0.02] text-sm"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-6">
                                                            G{gate.gate}
                                                        </span>
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {formatGold(gate.gold)}G
                                                        </span>
                                                        {gate.coreReward > 0 && (
                                                            <span className="text-[10px] text-purple-500 dark:text-purple-400">
                                                                코어 {gate.coreReward}{isChecked ? `+${gate.coreReward}` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                        <span className={`text-xs ${isChecked ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                            더보기 {isChecked ? `-${formatGold(gate.bonusCost)}G` : `${formatGold(gate.bonusCost)}G`}
                                                        </span>
                                                        <div
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                onToggleBonus(raid.raidName, raid.difficulty, gate.gate);
                                                            }}
                                                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                                                                isChecked
                                                                    ? 'bg-red-500 border-red-500 text-white'
                                                                    : 'border-gray-300 dark:border-gray-600 hover:border-red-400'
                                                            }`}
                                                        >
                                                            {isChecked && (
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {result.selectedRaids.length === 0 && (
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            참여 가능한 레이드가 없습니다
                        </p>
                    )}

                    {/* 레이드 변경: 전체 레이드 제한 없이 체크, 참여 가능한 것 중 골드 상위 3개만 적용 */}
                    {!dimmed && showRaidPicker && allRaids.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">전체 레이드 자유 선택 (체크한 것 중 참여 가능한 레이드 골드 상위 3개가 적용)</p>
                            {hasCustomRaids && (
                                <button
                                    type="button"
                                    onClick={onResetRaidSelection}
                                    className="mb-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer underline"
                                >
                                    기본값(골드 높은 순 3개)으로 되돌리기
                                </button>
                            )}
                            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                                {allRaids.map((col) => {
                                    const key = `${col.raidName}::${col.difficulty}`;
                                    const available = result.availableRaids.some((r) => r.raidName === col.raidName && r.difficulty === col.difficulty);
                                    const checked = selectedRaidKeys.includes(key);
                                    const toggle = () => {
                                        const next = checked
                                            ? selectedRaidKeys.filter((k) => k !== key)
                                            : [...selectedRaidKeys, key];
                                        onRaidSelectionChange(next);
                                    };
                                    return (
                                        <label
                                            key={key}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer border transition-colors ${
                                                available
                                                    ? checked
                                                        ? 'bg-la-gold/20 border-la-gold/50 text-la-gold-dark dark:text-la-gold'
                                                        : 'border-gray-200 dark:border-white/10 hover:border-la-gold/30'
                                                    : checked
                                                        ? 'bg-gray-200 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-600 dark:text-gray-400'
                                                        : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={toggle}
                                                className="rounded border-gray-300 dark:border-gray-600"
                                            />
                                            <span className="font-medium">{col.raidName}</span>
                                            <span className="opacity-80">{col.difficulty}</span>
                                            {!available && <span className="text-[10px]">Lv.{col.requiredLevel}</span>}
                                            <span className={available ? 'text-la-gold-dark dark:text-la-gold' : 'text-la-gold-dark/70 dark:text-la-gold/70'}>
                                                {formatGold(col.totalGold)}G
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">제한 없이 체크 가능 · 골드는 참여 가능한 레이드 중 골드 상위 3개만 적용</p>
                        </div>
                    )}
                </div>

                {/* Total Gold */}
                <div className="md:w-36 text-right flex-shrink-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500">주간 골드</p>
                    <p className={`text-xl font-bold ${
                        dimmed
                            ? 'text-gray-400 dark:text-gray-600'
                            : 'text-la-gold-dark dark:text-la-gold'
                    }`}>
                        {formatGold(result.totalGold)}G
                    </p>
                    {characterBonusCost > 0 && (
                        <>
                            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                더보기 -{formatGold(characterBonusCost)}G
                            </p>
                            <p className="text-sm font-bold text-green-600 dark:text-green-400 border-t border-gray-200 dark:border-white/10 mt-1 pt-1">
                                {formatGold(result.totalGold - characterBonusCost)}G
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const GoldLoadingSkeleton: React.FC = () => (
    <div className="space-y-6">
        {/* Selector skeleton */}
        <div className="glass-card p-5">
            <div className="skeleton h-4 w-40 mb-3" />
            <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="skeleton h-10 w-36 rounded-xl" />
                ))}
            </div>
        </div>
        {/* Summary skeleton */}
        <div className="glass-card p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="text-center space-y-2">
                        <div className="skeleton h-4 w-20 mx-auto" />
                        <div className="skeleton h-8 w-32 mx-auto" />
                    </div>
                ))}
            </div>
        </div>
        {/* Card skeletons */}
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex items-center gap-3 md:w-56">
                        <div className="skeleton w-14 h-14 rounded-xl flex-shrink-0" />
                        <div className="space-y-2">
                            <div className="skeleton h-5 w-24" />
                            <div className="skeleton h-4 w-16" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-10 w-full rounded-lg" />
                        <div className="skeleton h-10 w-full rounded-lg" />
                        <div className="skeleton h-10 w-3/4 rounded-lg" />
                    </div>
                    <div className="md:w-36 text-right">
                        <div className="skeleton h-4 w-14 ml-auto" />
                        <div className="skeleton h-7 w-24 ml-auto mt-1" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export default Simulation;
