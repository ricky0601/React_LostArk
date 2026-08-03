# Lost Ark Combat Power Authority

이 문서는 현재 스펙 시뮬레이터의 전투력과 일반 재련 계산을 설명하는 짧은 권위 문서다. 실행 가능한 규칙은 `src/utils/lopecBaseAttack.ts`, `src/utils/lopecCombatPower.ts`, `src/utils/lopecEquipmentDelta.ts`, `src/utils/lopecGemDelta.ts`, `src/components/simulation/specScoreSimulatorParsing.ts`, `src/components/simulation/specScoreSimulatorModel.ts`, 그리고 `src/data/specScore/lopecCoefficients.ts`가 우선한다. 테스트는 같은 동작을 고정하는 증거다.

## Canonical Formula

### Combat power

```text
combat_power = displayed_base_attack * 0.00288 * factor_product * direct_factor_ratio
```

`0.00288`은 `COMBAT_POWER_CONSTANT`다. 현재 상태에서 `factor_product`는 `current_combat_power / (displayed_base_attack * 0.00288)`로 한 번 구한다. 직접 변경 비율은 각인, gem pure power, advanced honing, accessory polishing, bracelet, Ark Grid의 변경분을 곱한다. 이 구조는 `calcCombatPowerBreakdown`의 반환값과 `calcDirectFactorRatio`의 라우팅을 따른다.

### Pure and displayed base attack

```text
pure_base_attack = sqrt(main_stat * effective_weapon_attack / 6)
displayed_base_attack = pure_base_attack * (1 + base_attack_percent_sum / 100)
```

구현에서 `displayed_base_attack`는 입력 `pureBaseAttack` 필드에 보관될 수 있다. 이름과 관계없이 `resolvePureBaseAttack`는 base-attack percent bucket을 제거하고, `buildCurrentSnapshot`은 그 값을 공식의 표시 기본 공격력 항으로 사용한다. 입력이 없거나 유효 무기 공격력이 0 이하이면 절대 재구성은 추측하지 않고 실패한다.

### Effective weapon attack

```text
effective_weapon_attack =
  (weapon_tooltip_attack
   + accessory_flat_weapon_attack
   + standalone_bracelet_flat_weapon_attack)
  * (1 + weapon_attack_percent_sum / 100)
```

flat 무기 공격력은 accessory polishing의 `무기 공격력_abs`와 standalone bracelet의 `무기 공격력`을 퍼센트 적용 전에 더한다. 두 값은 parser와 combat-power source에서 각각 합산된다. bracelet의 조건부 또는 direct combat-power 옵션은 여기에 넣지 않고 direct factor ratio로 보낸다.

### Percent buckets

```text
weapon_attack_percent_sum = accessory_polishing_weapon_attack_percent
                          + enlightenment_karma_level * 0.1

base_attack_percent_sum = sum(T4_gem_base_attack_percent_by_level)
                        + ability_stone_base_attack_percent
```

각 bucket은 합산한 뒤 한 번만 적용한다. stone의 `기본 공격력 +N%`는 tooltip에서 양수로 파싱하며, 현재 데이터에 값이 없으면 `1.5`를 parse fallback으로 사용할 수 있다. T4 gem 기본 공격력 값은 level별 coefficient source를 사용하며, 현재 표는 source data에 둔다.

### Integer API precision and main-stat inversion

API의 정수 기본 공격력과 tooltip 값은 소수점 이하를 노출하지 않을 수 있다. 따라서 역산 결과는 표시값의 반올림 오차를 포함하며, 소스에 없는 소수 정밀도를 만들어내지 않는다.

```text
pure_base_attack = displayed_base_attack / (1 + base_attack_percent_sum / 100)
main_stat = pure_base_attack^2 * 6 / effective_weapon_attack
```

main stat은 flat source를 다시 합산하지 않고, 게임이 합산해 표시한 기본 공격력에서 역산한다. `invertMainStat`는 입력이 없거나 유효하지 않으면 0을 반환한다.

### Main-stat multiplier rule

avatar의 현재 inner tooltip 퍼센트와 pet multiplier는 additive-once로 결합한다. 구현의 avatar 8%와 assumed pet 1%는 다음과 같다.

```text
main_stat_multiplier = 1 + 0.08 + 0.01 = 1.09
```

pet 1%는 API에서 직접 읽은 확정값이 아니라 parser의 명시적 가정이다. 일반 재련의 armor main-stat delta에 이 multiplier를 적용한다.

### Two Simulation Modes

#### Primary: absolute reconstruction

`calculateSpecScore`는 먼저 `calcCombatPowerBreakdown`을 호출한다. 기본 공격력 입력이 있으면 현재 main stat, effective weapon attack, 두 percent bucket, factor product를 복원하고 변경된 base-attack 측을 다시 계산한다. 장비 재련의 raw weapon delta에는 현재 weapon-attack multiplier를, armor main-stat delta에는 `1.09`를 적용한다.

#### Fallback: direct-factor ratio

절대 재구성에 필요한 base-attack 입력이 없으면 `calcLopecDelta`를 사용한다. 이 ratio 경로도 stone과 gem의 base-attack ratio, `calcNormalHoningBaseStatDelta`를 통한 일반 재련 base-stat 변화, accessory polishing, bracelet, Ark Grid, 각인 변경을 적용한다. 다만 absolute reconstruction처럼 표시 기본 공격력과 main stat을 중간값으로 복원하지 않으므로 결과의 중간값을 해석하지 않는다.

#### Serka Equipment Status

Serka 장비 재련은 현재 테스트로 고정된 absolute reconstruction 경로를 사용한다. armor 재련은 raw main-stat delta에 `1.09`를 적용하고, weapon 재련은 raw weapon delta에 weapon-attack percent multiplier를 적용한다. standalone bracelet flat weapon attack은 effective weapon attack에 정확히 한 번 반영된다. 조건부 bracelet 효과는 direct ratio에만 반영된다.

### Direct-factor routing

현재 direct ratio에는 다음만 포함한다.

- engraving set delta
- gem pure-power delta
- advanced honing set delta
- accessory polishing direct delta
- bracelet direct delta
- Ark Grid delta

무기 공격력 퍼센트, base-attack 퍼센트, main-stat multiplier, standalone bracelet flat weapon attack은 base-attack 계산에 남긴다. 같은 변경을 두 경로에 넣지 않는다.

## Current honing and gem rules

- 일반 재련 표의 raw armor main-stat 및 weapon-attack delta를 사용한다. `lopecEquipmentDelta.ts`가 `equipmentState.ts`를 통해 해석한 normal-honing delta를 사용하며, family/level table은 `equipmentPowerTables.ts`와 그 family별 table modules가 소유한다.
- weapon raw delta는 `(1 + weapon_attack_percent_sum / 100)`으로 증폭한다.
- armor raw main-stat delta는 avatar와 assumed pet의 결합 multiplier로 증폭한다.
- T4 gem base-attack percent는 level coefficient를 읽어 base-attack bucket에 합산한다.
- gem pure-power 변화는 current slot과 modified slot의 순수 전투력 비율로 direct factor에 반영한다.
- stone의 base-attack percent는 tooltip parse 결과를 사용하고, parse 가능한 값이 없을 때만 명시된 `1.5` fallback을 사용한다.

## Evidence hierarchy

1. 현재 게임/API의 재현 가능한 controlled evidence
2. 현재 구현과 colocated tests
3. 프로젝트의 coefficient source와 parser contract
4. 독립적인 외부 수치 자료
5. 요약 글이나 단일 캐릭터 관측

하위 단계 자료가 구현과 충돌하면 상위 단계와 현재 테스트를 따른다. 외부 자료는 구현 근거가 아니라 검증 보조 자료로만 링크한다.

## Assumptions

- pet main-stat multiplier `1.01`은 parser의 명시적 가정이다.
- API 정수 표시로 인한 역산 오차는 허용되는 표시 정밀도 한계로 본다.
- 직접 factor의 절대 계수 전체를 재구성하지 않고 현재 상태의 factor product와 변경 비율을 사용한다.

## Limitations

- base-attack 입력이 없으면 absolute reconstruction을 수행할 수 없다.
- tooltip이 malformed이거나 active main-stat label을 식별하지 못하면 해당 값을 추측하지 않는다.
- coefficient source에 없는 신규 장비, gem, 옵션은 자동으로 현재 규칙이 되지 않는다.
- current source와 test가 말하지 않는 수치, 보정, 슬롯 효과는 권위 규칙으로 추가하지 않는다.

## Deprecated history

다음 항목은 과거 연구 흔적이며 현재 계산 규칙이 아니다.

- Serka `+3%` 주장
- secondary-stat correction
- 숨은 `baseAttackPercent` 가정
- midpoint correction
- `regular_gems_naive` 경로
- reverse-solved constant를 고정 계수로 사용하는 방식

이 문서에는 캐릭터 식별자, raw payload, coefficient table 복사본, 삭제된 산출물 링크를 보관하지 않는다. 새 규칙은 먼저 source와 test에 반영한 뒤 이 문서에 요약한다.
