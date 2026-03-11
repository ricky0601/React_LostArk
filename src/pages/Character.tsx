import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import PullToRefresh from '../components/PullToRefresh';
import type {
  CharacterProfile,
  EquipmentItem,
  GemData,
  EngravingData,
  ArkGridData,
} from '../types/lostark';
import NavBar from '../components/NavBar';
import NicknameInput from '../components/NicknameInput';
import NicknameSearchBar from '../components/NicknameSearchBar';
import GlassCard from '../components/GlassCard';
import { fetchProfile, fetchEquipment, fetchGems, fetchEngravings, fetchArkGrid, LS_NICKNAME } from '../utils/api';
import { type EffectSegment, stripHtml, htmlColorToGrade, parseBraceletLine } from '../utils/tooltipParser';
import { gradeStyle, EFFECT_GRADE_COLORS, qualityTextColor, qualityBgColor } from '../utils/equipmentColors';

interface EquipmentEffect { grade: string | null; text: string; segments?: EffectSegment[] }

/* ── 장비 툴팁 파싱 (품질 + 강화레벨 + 초월 + 추가효과) ── */
interface ParsedEquipmentInfo {
  quality: number | null;
  enchantLevel: number | null;
  transcendenceLevel: number | null;
  effects: EquipmentEffect[];
}

/** item.Name 에서 강화레벨 파싱 (+20 운명의... → 20) */
function parseEnchantFromName(name: string): number | null {
  const m = name.match(/^\+(\d+)\s/);
  return m ? parseInt(m[1], 10) : null;
}

function parseEquipmentInfo(itemName: string, tooltip: string): ParsedEquipmentInfo {
  const enchantLevel = parseEnchantFromName(itemName);
  try {
    const obj = JSON.parse(tooltip);
    let quality: number | null = null;
    let transcendenceLevel: number | null = null;
    const effects: EquipmentEffect[] = [];

    for (const key of Object.keys(obj)) {
      const el = obj[key];

      if (el?.type === 'ItemTitle') {
        const qv: number | undefined = el.value?.qualityValue;
        quality = (qv != null && qv >= 0) ? qv : null;
      }

      // 초월 단계: SingleTextBox 에 "[상급 재련] 40단계" 형식
      if (el?.type === 'SingleTextBox' && typeof el.value === 'string') {
        const text = stripHtml(el.value);
        const tm = text.match(/\[상급 재련\]\s+(\d+)단계/);
        if (tm) transcendenceLevel = parseInt(tm[1], 10);
      }

      if (el?.type === 'ItemPartBox' && el.value) {
        const headText = stripHtml(el.value.Element_000 || '');
        const contentHtml: string = el.value.Element_001 || '';
        // 연마 효과(장신구)만 등급 배지 표시, 팔찌/방어구 효과는 텍스트만
        const withGrade = headText.includes('연마 효과');
        const isBracelet = headText.includes('팔찌 효과');
        const isEffectSection = withGrade || isBracelet ||
          headText.includes('추가 효과');
        if (isEffectSection) {
          const lines = contentHtml.split(/<br\s*\/?>/gi);
          for (const line of lines) {
            const text = stripHtml(line).trim();
            if (!text) continue;
            if (isBracelet || withGrade) {
              effects.push({ grade: withGrade ? htmlColorToGrade(line) : null, text, segments: parseBraceletLine(line) });
            } else {
              effects.push({ grade: null, text });
            }
          }
        }
      }

      // 어빌리티 스톤 각인 효과 (IndentStringGroup)
      if (el?.type === 'IndentStringGroup' && el.value) {
        for (const vk of Object.keys(el.value)) {
          const group = el.value[vk];
          const topStr = stripHtml(group?.topStr || '');
          if (!topStr.includes('각인')) continue;
          const contentObj = group?.contentStr;
          if (!contentObj || typeof contentObj !== 'object') continue;
          for (const ck of Object.keys(contentObj)) {
            const entry = (contentObj as Record<string, { contentStr?: string }>)[ck];
            const raw = entry?.contentStr || '';
            const text = stripHtml(raw).trim();
            if (text) effects.push({ grade: null, text, segments: parseBraceletLine(raw) });
          }
        }
      }
    }
    return { quality, enchantLevel, transcendenceLevel, effects };
  } catch {}
  return { quality: null, enchantLevel, transcendenceLevel: null, effects: [] };
}

/* ── 장비 그룹 ── */
const ARMOR_TYPES = ['무기', '투구', '어깨', '상의', '하의', '장갑'];
const ACCESSORY_TYPES = ['목걸이', '귀걸이', '반지'];

function shortCoreName(fullName: string): string {
  const m = fullName.match(/^(.+?)\s*코어/);
  return m ? m[1].trim() : fullName;
}

/* ═══════════════════════════════
   Left Column Components
═══════════════════════════════ */

const ProfileCard: React.FC<{ profile: CharacterProfile; nickname: string }> = ({ profile, nickname }) => (
  <GlassCard className="overflow-hidden animate-slide-up">
    {/* 캐릭터 이미지 + 이름 오버레이 */}
    <div className="relative">
      <img
        src={profile.CharacterImage}
        alt={profile.CharacterName}
        className="w-full h-auto object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h1 className="text-2xl font-bold text-white leading-tight">{profile.CharacterName}</h1>
        <span className="text-sm text-la-gold">{profile.CharacterClassName}</span>
      </div>
    </div>

    {/* 아이템레벨 + 전투력 */}
    <div className="flex gap-6 px-4 py-3 border-b border-gray-200/30 dark:border-white/5">
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">아이템</p>
        <p className="text-lg font-bold text-la-gold-dark dark:text-la-gold">{profile.ItemAvgLevel}</p>
      </div>
      {profile.CombatPower && (
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">전투력</p>
          <p className="text-lg font-bold text-la-gold-dark dark:text-la-gold">{profile.CombatPower}</p>
        </div>
      )}
    </div>

    {/* 캐릭터 정보 */}
    <div className="px-4 py-3 space-y-2 text-sm">
      {[
        { label: '캐릭터 레벨', value: `Lv.${profile.CharacterLevel}` },
        { label: '원정대 레벨', value: `Lv.${profile.ExpeditionLevel}` },
        { label: '서버', value: profile.ServerName },
        ...(profile.GuildName ? [{ label: '길드', value: profile.GuildName }] : []),
        ...(profile.Title ? [{ label: '칭호', value: profile.Title }] : []),
        ...(profile.PvpGradeName ? [{ label: 'PvP', value: profile.PvpGradeName }] : []),
      ].map(({ label, value }) => (
        <div key={label} className="flex justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
          <span className="font-medium text-gray-900 dark:text-white text-right truncate">{value}</span>
        </div>
      ))}
    </div>

    {/* 주간 골드 계산 버튼 */}
    <div className="px-4 pb-4">
      <Link
        to={`/simulation?nickname=${encodeURIComponent(nickname)}`}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium
                   bg-la-gold/20 text-la-gold-dark dark:text-la-gold hover:bg-la-gold/30 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        주간 골드 계산
      </Link>
    </div>
  </GlassCard>
);

const ArkPassiveCard: React.FC<{ data: EngravingData }> = ({ data }) => {
  const passives = data.ArkPassiveEffects ?? [];
  if (passives.length === 0) return null;
  return (
    <GlassCard className="p-4 animate-fade-in">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">아크 패시브</p>
      <div className="flex flex-wrap gap-2">
        {passives.map((effect, i) => {
          const style = gradeStyle(effect.Grade);
          return (
            <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${style.border} ${style.bg}`}>
              <span className={`text-sm font-medium ${style.text}`}>{effect.Name}</span>
              <span className={`text-xs font-bold px-1 py-0.5 rounded bg-white/10 ${style.text}`}>
                Lv.{effect.Level}
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

const ArkGridCard: React.FC<{ data: ArkGridData }> = ({ data }) => {
  if (!data.Slots || data.Slots.length === 0) return null;
  return (
    <GlassCard className="p-4 animate-fade-in">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">아크 그리드</p>
      <div className="grid grid-cols-3 gap-3">
        {data.Slots.map((slot) => {
          const style = gradeStyle(slot.Grade);
          const name = shortCoreName(slot.Name);
          return (
            <div key={slot.Index} className="flex flex-col items-center gap-1 text-center">
              <div className={`w-12 h-12 rounded-xl border-2 ${style.border} overflow-hidden`}>
                {slot.Icon
                  ? <img src={slot.Icon} alt={name} className="w-full h-full object-cover" />
                  : <div className={`w-full h-full ${style.bg}`} />
                }
              </div>
              <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight line-clamp-2 w-full">{name}</p>
              <span className="text-[10px] font-bold text-la-gold-dark dark:text-la-gold">{slot.Point}P</span>
            </div>
          );
        })}
      </div>
      {data.Effects && data.Effects.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200/30 dark:border-white/5 flex flex-wrap gap-1.5">
          {data.Effects.map((effect, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-la-gold/10 text-la-gold-dark dark:text-la-gold font-medium">
              {effect.Name} Lv.{effect.Level}
            </span>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

const EngravingsCard: React.FC<{ data: EngravingData }> = ({ data }) => {
  const effects = data.Effects ?? [];
  if (effects.length === 0) return null;
  return (
    <GlassCard className="p-4 animate-fade-in">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">각인</p>
      <div className="space-y-1.5">
        {effects.map((effect, i) => (
          <div key={i} className="flex items-center gap-2 text-sm py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-la-gold flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-200">{effect.Name}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

const StatsCard: React.FC<{ profile: CharacterProfile }> = ({ profile }) => {
  const combatStatNames = ['치명', '특화', '제압', '신속', '인내', '숙련'];
  const stats = (profile.Stats ?? []).filter((s) => combatStatNames.includes(s.Type));
  if (stats.length === 0) return null;
  return (
    <GlassCard className="p-4 animate-fade-in">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">전투 스탯</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {stats.map((stat) => (
          <div key={stat.Type} className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{stat.Type}</span>
            <span className="font-bold text-gray-900 dark:text-white">{Number(stat.Value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

/* ═══════════════════════════════
   Right Column Components
═══════════════════════════════ */

const GemsCard: React.FC<{ data: GemData }> = ({ data }) => {
  if (!data.Gems || data.Gems.length === 0) return null;
  return (
    <GlassCard className="p-4 animate-fade-in">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        보석 <span className="normal-case font-normal text-gray-400">{data.Gems.length}개</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {data.Gems.map((gem) => {
          const style = gradeStyle(gem.Grade);
          return (
            <div
              key={gem.Slot}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border-2 ${style.border} cursor-default`}
              title={gem.Name}
            >
              <img src={gem.Icon} alt={gem.Name} className="w-9 h-9 rounded-lg" />
              <span className={`text-[10px] font-bold ${style.text}`}>Lv.{gem.Level}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

const EquipmentItemCard: React.FC<{ item: EquipmentItem }> = ({ item }) => {
  const { quality, enchantLevel, transcendenceLevel, effects } = parseEquipmentInfo(item.Name, item.Tooltip);
  const style = gradeStyle(item.Grade);
  // +N 강화레벨 뱃지로 별도 표시하므로 아이템명에서 prefix 제거
  const displayName = enchantLevel != null ? item.Name.replace(/^\+\d+\s/, '') : item.Name;
  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${style.border} bg-white/[0.02] hover:bg-white/5 transition-colors`}>
      {/* 아이콘 + 강화레벨 뱃지 + 품질 숫자 */}
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <div className="relative">
          {item.Icon && (
            <img src={item.Icon} alt={item.Name} className={`w-11 h-11 rounded-lg border-2 ${style.border}`} />
          )}
          {enchantLevel != null && (
            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold text-white bg-gray-900 border border-gray-600 rounded px-0.5 leading-tight">
              +{enchantLevel}
            </span>
          )}
        </div>
        {quality != null && (
          <span className={`text-[9px] font-bold tabular-nums leading-none ${qualityTextColor(quality)}`}>{quality}</span>
        )}
      </div>
      {/* 텍스트 정보 */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{item.Type}</p>
        <div className="flex items-baseline gap-1 flex-wrap">
          <p className="text-xs font-medium text-gray-900 dark:text-white leading-snug">{displayName}</p>
          {transcendenceLevel != null && (
            <span className="text-[10px] font-bold text-orange-400 flex-shrink-0">+{transcendenceLevel}</span>
          )}
        </div>
        {quality != null && (
          <div className="mt-1 h-1 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${qualityBgColor(quality)}`} style={{ width: `${quality}%` }} />
          </div>
        )}
        {effects.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {effects.map((eff, i) => {
              const gc = eff.grade ? EFFECT_GRADE_COLORS[eff.grade] : null;
              return (
                <div key={i} className="flex items-center gap-1 min-w-0">
                  {gc && (
                    <span className={`text-[9px] font-bold px-1 py-px rounded-sm flex-shrink-0 ${gc.bg} ${gc.text}`}>
                      {eff.grade}
                    </span>
                  )}
                  {eff.segments ? (
                    <span className="text-[10px] leading-snug">
                      {eff.segments.map((seg, j) => (
                        <span
                          key={j}
                          style={seg.color ? { color: seg.color } : undefined}
                          className={!seg.color ? 'text-gray-500 dark:text-gray-400' : ''}
                        >
                          {seg.text}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate">{eff.text}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{label}</p>
);

const EquipmentCard: React.FC<{ items: EquipmentItem[] }> = ({ items }) => {
  if (items.length === 0) return null;

  const armor       = items.filter((it) => ARMOR_TYPES.some((t) => it.Type.includes(t)));
  const accessories = items.filter((it) => ACCESSORY_TYPES.some((t) => it.Type.includes(t)));
  const stone       = items.filter((it) => it.Type === '어빌리티 스톤');
  const bracelet    = items.filter((it) => it.Type === '팔찌');
  const extras      = items.filter(
    (it) =>
      !ARMOR_TYPES.some((t) => it.Type.includes(t)) &&
      !ACCESSORY_TYPES.some((t) => it.Type.includes(t)) &&
      it.Type !== '어빌리티 스톤' &&
      it.Type !== '팔찌'
  );

  return (
    <GlassCard className="p-4 animate-fade-in">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">장비</p>

      {/* ① 전투 장비 + 장신구 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <SectionLabel label="전투 장비" />
          {armor.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
        </div>
        <div className="space-y-2">
          <SectionLabel label="장신구" />
          {accessories.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
        </div>
      </div>

      {/* ② 어빌리티 스톤 + 팔찌 */}
      {(stone.length > 0 || bracelet.length > 0) && (
        <>
          <div className="border-t border-gray-200/30 dark:border-white/5 my-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stone.length > 0 && (
              <div className="space-y-2">
                <SectionLabel label="어빌리티 스톤" />
                {stone.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
              </div>
            )}
            {bracelet.length > 0 && (
              <div className="space-y-2">
                <SectionLabel label="팔찌" />
                {bracelet.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
              </div>
            )}
          </div>
        </>
      )}

      {/* ③ 기타 (나침반, 부적, 보주 등) */}
      {extras.length > 0 && (
        <>
          <div className="border-t border-gray-200/30 dark:border-white/5 my-3" />
          <SectionLabel label="기타" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {extras.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
          </div>
        </>
      )}

    </GlassCard>
  );
};

/* ═══════════════════════════════
   Skeleton
═══════════════════════════════ */
const PageSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 animate-fade-in">
    <div className="space-y-4">
      <GlassCard className="overflow-hidden">
        <div className="skeleton h-80 w-full" />
        <div className="p-4 space-y-2">
          <div className="skeleton h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-4 w-full" />)}
        </div>
      </GlassCard>
      {Array.from({ length: 3 }).map((_, i) => (
        <GlassCard key={i} className="p-4">
          <div className="skeleton h-3 w-20 mb-3" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, j) => <div key={j} className="skeleton h-14 rounded-lg" />)}
          </div>
        </GlassCard>
      ))}
    </div>
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="skeleton h-3 w-12 mb-3" />
        <div className="flex gap-2">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton w-12 h-14 rounded-xl" />)}
        </div>
      </GlassCard>
      <GlassCard className="p-4">
        <div className="skeleton h-3 w-12 mb-3" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
);

/* ═══════════════════════════════
   Main Component
═══════════════════════════════ */
const Character: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlNickname = searchParams.get('nickname');
  const [nickname, setNickname] = useState<string | null>(
    () => urlNickname || localStorage.getItem(LS_NICKNAME)
  );

  const [profile, setProfile] = useState<CharacterProfile | null>(null);
  const [equipment, setEquipment] = useState<EquipmentItem[] | null>(null);
  const [gems, setGems] = useState<GemData | null>(null);
  const [engravings, setEngravings] = useState<EngravingData | null>(null);
  const [arkGrid, setArkGrid] = useState<ArkGridData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nickname) return;
    localStorage.setItem(LS_NICKNAME, nickname);
    setLoading(true);
    setError(null);
    setProfile(null);
    setEquipment(null);
    setGems(null);
    setEngravings(null);
    setArkGrid(null);

    Promise.allSettled([
      fetchProfile(nickname),
      fetchEquipment(nickname),
      fetchGems(nickname),
      fetchEngravings(nickname),
      fetchArkGrid(nickname),
    ]).then(([profileRes, equipRes, gemsRes, engravRes, arkRes]) => {
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
      else setError('캐릭터 정보를 가져오는 중 오류가 발생했습니다.');
      if (equipRes.status === 'fulfilled') setEquipment(equipRes.value);
      if (gemsRes.status === 'fulfilled') setGems(gemsRes.value);
      if (engravRes.status === 'fulfilled') setEngravings(engravRes.value);
      if (arkRes.status === 'fulfilled') setArkGrid(arkRes.value);
    }).finally(() => setLoading(false));
  }, [nickname]);

  const handleSearch = (name: string) => {
    setSearchParams({ nickname: name });
    setNickname(name);
  };

  if (!nickname) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
        <NavBar />
        <NicknameInput
          title="캐릭터 프로필"
          description="캐릭터 닉네임을 입력하면 상세 정보를 조회합니다"
          buttonText="캐릭터 조회"
          onSubmit={handleSearch}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
      <NavBar />
      <PullToRefresh>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 text-center animate-fade-in">
          <NicknameSearchBar onSearch={handleSearch} placeholder="다른 캐릭터 검색" />
        </div>

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <GlassCard className="p-8 text-center animate-fade-in">
            <p className="text-red-500 dark:text-red-400 text-lg">{error}</p>
          </GlassCard>
        ) : profile ? (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
            {/* 왼쪽 컬럼 */}
            <div className="space-y-4">
              <ProfileCard profile={profile} nickname={nickname} />
              {engravings && <ArkPassiveCard data={engravings} />}
              {arkGrid && <ArkGridCard data={arkGrid} />}
              {engravings && <EngravingsCard data={engravings} />}
              <StatsCard profile={profile} />
            </div>
            {/* 오른쪽 컬럼 */}
            <div className="space-y-4">
              {gems && <GemsCard data={gems} />}
              {equipment && <EquipmentCard items={equipment} />}
            </div>
          </div>
        ) : (
          <GlassCard className="p-8 text-center animate-fade-in">
            <p className="text-gray-500 dark:text-gray-400">캐릭터 정보를 불러오는 데 실패했습니다.</p>
          </GlassCard>
        )}
      </main>
      </PullToRefresh>
    </div>
  );
};

export default Character;
