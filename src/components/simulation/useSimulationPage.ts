import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CharacterProfile, SiblingCharacter } from '../../types/lostark';
import { fetchProfile, fetchSiblings, LS_NICKNAME } from '../../utils/api';
import { KEY_SEP, bonusKey, completedKey, filterPersistedStringArray, migrateLegacyKeys } from '../../utils/simulationKeys';
import { safeLocalStorage } from '../../utils/safeStorage';
import {
  calculateCharacterGold,
  getRaidDataByKey,
  MAX_GOLD_CHARACTERS,
  MAX_GOLD_RAIDS_PER_CHARACTER,
  type CharacterGoldResult,
  type SelectedRaid,
} from '../../data/raidGold';


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
const LS_RAID_SELECTION = 'loaGold_raidSelection';

function readPersistedStringArray(storageKey: string): string[] {
    const rawValue = safeLocalStorage.getItem(storageKey);
    if (!rawValue) return [];

    try {
        const parsed: unknown = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
            const filtered = filterPersistedStringArray(parsed);
            if (filtered.length !== parsed.length) {
                if (filtered.length > 0) {
                    safeLocalStorage.setItem(storageKey, JSON.stringify(filtered));
                } else {
                    safeLocalStorage.removeItem(storageKey);
                }
            }
            return filtered;
        }
    } catch (error: unknown) {
        void error;
        safeLocalStorage.removeItem(storageKey);
        return [];
    }

    safeLocalStorage.removeItem(storageKey);
    return [];
}

function readPersistedRaidSelection(): Record<string, string[]> {
    const rawValue = safeLocalStorage.getItem(LS_RAID_SELECTION);
    if (!rawValue) return {};

    try {
        const parsed: unknown = JSON.parse(rawValue);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const result: Record<string, string[]> = {};
            for (const [charName, keys] of Object.entries(parsed as Record<string, unknown>)) {
                const filtered = filterPersistedStringArray(keys);
                if (filtered.length > 0) result[charName] = filtered;
            }
            return result;
        }
    } catch (error: unknown) {
        void error;
        safeLocalStorage.removeItem(LS_RAID_SELECTION);
        return {};
    }

    safeLocalStorage.removeItem(LS_RAID_SELECTION);
    return {};
}

export const useSimulationPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlNickname = searchParams.get('nickname');
    const [nickname, setNickname] = useState<string | null>(() => {
        return urlNickname || safeLocalStorage.getItem(LS_NICKNAME);
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
    const [customRaidSelection, setCustomRaidSelection] = useState<Record<string, string[]>>(() => {
        return readPersistedRaidSelection();
    });
    const [bonusSelections, setBonusSelections] = useState<Set<string>>(() => {
        const weekKey = getLoaWeekKey();
        const stored = safeLocalStorage.getItem(LS_WEEK_KEY);
        if (stored !== weekKey) {
            safeLocalStorage.setItem(LS_WEEK_KEY, weekKey);
            safeLocalStorage.removeItem(LS_COMPLETED);
            safeLocalStorage.removeItem(LS_BONUS);
            return new Set();
        }
        return new Set(migrateLegacyKeys(readPersistedStringArray(LS_BONUS)));
    });
    const [completedRaids, setCompletedRaids] = useState<Set<string>>(() => {
        const weekKey = getLoaWeekKey();
        const stored = safeLocalStorage.getItem(LS_WEEK_KEY);
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
        safeLocalStorage.setItem(LS_NICKNAME, nickname);
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
        setCustomRaidSelection((prev) => {
            const entries = Object.entries(prev).filter(([name]) => validNames.has(name));
            return entries.length === Object.keys(prev).length ? prev : Object.fromEntries(entries);
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

    // storage 동기화
    useEffect(() => {
        safeLocalStorage.setItem(LS_SELECTED, JSON.stringify(Array.from(selectedNames)));
    }, [selectedNames]);

    useEffect(() => {
        safeLocalStorage.setItem(LS_BONUS, JSON.stringify(Array.from(bonusSelections)));
    }, [bonusSelections]);

    useEffect(() => {
        safeLocalStorage.setItem(LS_COMPLETED, JSON.stringify(Array.from(completedRaids)));
    }, [completedRaids]);

    useEffect(() => {
        if (Object.keys(customRaidSelection).length === 0) {
            safeLocalStorage.removeItem(LS_RAID_SELECTION);
        } else {
            safeLocalStorage.setItem(LS_RAID_SELECTION, JSON.stringify(customRaidSelection));
        }
    }, [customRaidSelection]);

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

  return {
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
  };
};

export type SimulationPageModel = ReturnType<typeof useSimulationPage>;
