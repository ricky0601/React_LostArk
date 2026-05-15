import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { SiblingCharacter, CharacterProfile } from '../types/lostark';
import NavBar from '../components/NavBar';
import PullToRefresh from '../components/PullToRefresh';
import NicknameInput from '../components/NicknameInput';
import NicknameSearchBar from '../components/NicknameSearchBar';
import CharacterRaidCard from '../components/simulation/CharacterRaidCard';
import GoldLoadingSkeleton from '../components/simulation/GoldLoadingSkeleton';
import { fetchSiblings, fetchProfile, LS_NICKNAME } from '../utils/api';
import { KEY_SEP, bonusKey, completedKey, migrateLegacyKeys } from '../utils/simulationKeys';
import {
    calculateCharacterGold,
    getRaidDataByKey,
    MAX_GOLD_CHARACTERS,
    MAX_GOLD_RAIDS_PER_CHARACTER,
    RAID_COLUMNS,
    type CharacterGoldResult,
    type SelectedRaid,
} from '../data/raidGold';

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

function readPersistedStringArray(storageKey: string): string[] {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) return [];

    try {
        const parsed: unknown = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
            return parsed as string[];
        }
    } catch (error: unknown) {
        void error;
        localStorage.removeItem(storageKey);
        return [];
    }

    localStorage.removeItem(storageKey);
    return [];
}

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
        return new Set(readPersistedStringArray(LS_SELECTED));
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
        return new Set(migrateLegacyKeys(readPersistedStringArray(LS_BONUS)));
    });
    const [completedRaids, setCompletedRaids] = useState<Set<string>>(() => {
        const weekKey = getLoaWeekKey();
        const stored = localStorage.getItem(LS_WEEK_KEY);
        if (stored !== weekKey) return new Set();
        return new Set(migrateLegacyKeys(readPersistedStringArray(LS_COMPLETED)));
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

    // 닉네임 변경 시 siblings API 호출 + 서버 자동 감지.
    // cancelled 플래그로 race 방지: 닉네임을 빠르게 바꾸면 이전 요청의 응답이 늦게 도착해도 무시.
    useEffect(() => {
        if (!nickname) return;
        let cancelled = false;
        localStorage.setItem(LS_NICKNAME, nickname);
        setLoading(true);
        setError(null);

        fetchSiblings(nickname)
            .then((data) => {
                if (cancelled) return;
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
                if (cancelled) return;
                console.error(err);
                setError('캐릭터 정보를 불러오는 데 실패했습니다.');
                setLoading(false);
            });

        return () => { cancelled = true; };
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

    // characterNames 팬아웃 fetchProfile. 동일 race 방지 패턴.
    // fetchCharacterInfo는 내부 try/catch로 null을 리턴하지만 시그니처 변경 회귀 방지 위해 .catch 가드.
    useEffect(() => {
        if (characterNames.length === 0) return;
        let cancelled = false;
        setLoading(true);

        Promise.all(characterNames.map((c) => fetchCharacterInfo(c.CharacterName)))
            .then((results) => {
                if (cancelled) return;
                results.sort((a, b) => {
                    const lvA = a ? parseFloat(a.ItemAvgLevel.replace(/,/g, '')) : 0;
                    const lvB = b ? parseFloat(b.ItemAvgLevel.replace(/,/g, '')) : 0;
                    return lvB - lvA;
                });
                setCharacterInfo(results);
                setLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error(err);
                setLoading(false);
            });

        return () => { cancelled = true; };
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
            const filtered = arr.filter((key) => selectedNames.has(key.split(KEY_SEP)[0]));
            return filtered.length === arr.length ? prev : new Set(filtered);
        });
        setCompletedRaids((prev) => {
            const arr = Array.from(prev);
            const filtered = arr.filter((key) => selectedNames.has(key.split(KEY_SEP)[0]));
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

    // 실수령 분리: 더보기 비용은 귀속 골드부터 우선 차감 (캐릭터 단위로 차감 후 합산)
    const netBoundGold = useMemo(() => {
        return selectedResults.reduce((acc, r) => {
            const charBound = r.selectedRaids.reduce((s, raid) => s + raid.boundGold, 0);
            const charBonus = characterBonusCosts.get(r.characterName) ?? 0;
            return acc + Math.max(0, charBound - charBonus);
        }, 0);
    }, [selectedResults, characterBonusCosts]);
    const netTradeableGold = netWeeklyGold - netBoundGold;

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

    // 완료 진행 계산: 더보기 비용은 캐릭터 단위로 귀속부터 차감 후 합산 (글로벌 분리표기와 일치)
    const { earnedGold, earnedNetTradeable, earnedNetBound } = useMemo(() => {
        let totalNet = 0;
        let netTradeable = 0;
        let netBound = 0;
        for (const r of selectedResults) {
            let charGold = 0;
            let charBound = 0;
            let charBonus = 0;
            for (const raid of r.selectedRaids) {
                if (completedRaids.has(completedKey(r.characterName, raid.raidName, raid.difficulty))) {
                    charGold += raid.totalGold;
                    charBound += raid.boundGold;
                    for (const gate of raid.gates) {
                        const key = bonusKey(r.characterName, raid.raidName, raid.difficulty, gate.gate);
                        if (bonusSelections.has(key)) {
                            charBonus += gate.bonusCost;
                        }
                    }
                }
            }
            const charNet = charGold - charBonus;
            const charNetBound = Math.max(0, charBound - charBonus);
            totalNet += charNet;
            netTradeable += charNet - charNetBound;
            netBound += charNetBound;
        }
        return { earnedGold: totalNet, earnedNetTradeable: netTradeable, earnedNetBound: netBound };
    }, [selectedResults, completedRaids, bonusSelections]);

    const remainingGold = netWeeklyGold - earnedGold;
    const remainingTradeable = Math.max(0, netTradeableGold - earnedNetTradeable);
    const remainingBound = Math.max(0, netBoundGold - earnedNetBound);

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


export default Simulation;
