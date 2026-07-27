# Lost Ark Combat Power Research Notes

This document records the current working model, measured samples, and unresolved assumptions for Lost Ark combat power calculation. It is intended as a memory anchor for later implementation and verification.

Product and implementation planning for the simulator page lives in [`lostark-combat-simulator-plan.md`](./lostark-combat-simulator-plan.md). Keep this file focused on formula research, source notes, measured samples, and unresolved calculation assumptions.

## Current Character Snapshot

- Current combat power: `4933.35`
- Displayed attack power: `197,023`
- Pure base attack shown in stat details: `180,391`
- Attack power increase effect: `+16,632`
- Weapon attack power: `218,667`
- Main stat inferred from pure base attack: `~892,890`
- Combat stats:
  - Crit: `1826`
  - Specialization: `75`
  - Swiftness: `577`
  - Domination: `75`
  - Endurance: `71`
  - Expertise: `71`
- Card set: Light of Salvation 30 awakening, `+15%`, factor `1.15`

Pure base attack verification:

```text
pure_base_attack = sqrt(main_stat * weapon_attack / 6)
main_stat = 180391^2 * 6 / 218667 = 892889.5411
sqrt(892889.5411 * 218667 / 6) = 180391
```

So `180,391` is treated as the real pure base attack value.

## Formula Interpretation

The working structure is:

```text
combat_power = pure_base_attack * adjustment_constant * factor_1 * factor_2 * ...
```

The often-quoted `0.0288` constant does not match the current character once all known factors are multiplied directly. For the current character, the adjustment constant must be solved empirically.

Important distinction from Inven articles:

- Actual combat power calculation uses multiplicative factors.
- Contribution/share charts use `log(combat_power)` and `log(factor)` to convert multiplication into additive shares.
- A percent share in those charts is not the same as a direct combat power increase percent.

Example from comments:

```text
base = 10
A = 10x
B = 10x

Applying A first: 10 * 10 = 100, point gain +90
Applying B second: 100 * 10 = 1000, point gain +900

The point gains differ because of order, but A and B are equally strong.
Log-share analysis makes base/A/B each 33.3%.
```

## Known Current Factors

### Ark Passive

Current ark passive state:

- Evolution total: `140` points, but T1 crit/swift `40` points are excluded from combat-power evolution point calculation.
- Evolution T2+ points: `100`
- Enlightenment points: `101`
- Leap points: `70`

Patch-era formula used:

```text
Evolution:      100 * 0.75% = +75.0%  => 1.75
Enlightenment:  101 * 0.70% = +70.7%  => 1.707
Leap:            70 * 0.20% = +14.0%  => 1.14

Ark passive factor = 1.75 * 1.707 * 1.14 = 3.405465
Ark passive increase = +240.5465%
```

### Karma

Known direct combat power effects:

```text
Evolution karma rank: 6 * 0.6% = +3.6% => 1.036
Enlightenment karma rank: 6 * 1 point * 0.7% = +4.2% => 1.042
Leap karma level: 25 * 0.02% = +0.5% => 1.005
Leap karma rank: 6 * 2 points * 0.2% = +2.4% => 1.024

Karma direct factor = 1.036 * 1.042 * 1.005 * 1.024 = 1.11094738944
Karma direct increase = +11.094739%
```

Not included here: enlightenment karma weapon attack percent. That raises base attack and must be handled through the base-attack side, not as a direct combat-power factor.

### Engravings

Source anchor:

- Inven: <https://www.inven.co.kr/board/lostark/4821/106546>
- Article title: `딜러 전투력 로직 분석 (25년 7월 9일 패치 반영)`
- Author comment on 2025-07-13: `7월 9일 패치 반영 - 예둔 점수 반영 / 모든 각인 계수 기재`

Notation:

- `X0`, `X1`, `X2`, `X3`, `X4` mean relic/ancient engraving-book stages at `0`, `5`, `10`, `15`, `20` books.
- `stone Lv.N` means ability-stone level `N` for that engraving.
- The table values are direct combat-power increases. Use factor `1 + percent / 100`.
- Do not reuse a single character snapshot as a general engraving table. This caused the Timkiyoot `Hit Master` / `타격의 대가` error: `Raid Captain X0 = 16.00%` was incorrectly applied to `Hit Master X0`, whose real table value is `14.00%`.

Confirmed source rules:

```text
Each equipped engraving independently increases combat power.
The achieved engraving-book stage and the ability-stone level are both reflected.
Grudge, Cursed Doll, Hit Master (`타격의 대가`), and MP Efficiency-like engravings use their displayed table values directly.
Ether Predator is evaluated at 30 stacks.
```

#### Timkiyoot Current Engraving State

Current Timkiyoot combat power baseline: `2181.84`.

```text
Grudge:          X0, stone Lv2 => +21.75% => 1.2175
Keen Blunt:      X0, stone Lv2 => +17.89% => 1.1789
Adrenaline:      X3, stone Lv0 => +18.35% => 1.1835
Hit Master:      X0, stone Lv0 => +14.00% => 1.14
Cursed Doll:     X4, stone Lv0 => +17.00% => 1.17

Current engraving factor = 1.2175 * 1.1789 * 1.1835 * 1.14 * 1.17
                         = 2.265713085627
```

If all five equipped engravings are completed to `X4` while stone levels stay the same:

```text
Grudge:          X4, stone Lv2 => +24.75% => 1.2475
Keen Blunt:      X4, stone Lv2 => +20.86% => 1.2086
Adrenaline:      X4, stone Lv0 => +19.40% => 1.1940
Hit Master:      X4, stone Lv0 => +17.00% => 1.17
Cursed Doll:     X4, stone Lv0 => +17.00% => 1.17

All-X4 engraving factor = 1.2475 * 1.2086 * 1.1940 * 1.17 * 1.17
                        = 2.464331875118

Predicted CP = 2181.84 * 2.464331875118 / 2.265713085627
             = 2373.11
Increase     = +191.27
Increase %   = +8.766281607%
```

Single-change validation:

```text
Hit Master (`타격의 대가`) X0 -> X4 only:
Predicted CP = 2181.84 * 1.17 / 1.14
             = 2239.26
Increase     = +57.42
Increase %   = +2.631723683%
```

#### Engraving Tables Used For Current Samples

Grudge:

| Books | stone Lv0 | Lv1 | Lv2 | Lv3 | Lv4 |
|---|---:|---:|---:|---:|---:|
| X0 | 18.00% | 21.00% | 21.75% | 23.25% | 24.00% |
| X1 | 18.75% | 21.75% | 22.50% | 24.00% | 24.75% |
| X2 | 19.50% | 22.50% | 23.25% | 24.75% | 25.50% |
| X3 | 20.25% | 23.25% | 24.00% | 25.50% | 26.25% |
| X4 | 21.00% | 24.00% | 24.75% | 26.25% | 27.00% |

Adrenaline:

| Books | stone Lv0 | Lv1 | Lv2 | Lv3 | Lv4 |
|---|---:|---:|---:|---:|---:|
| X0 | 15.20% | 18.08% | 18.80% | 20.18% | 20.90% |
| X1 | 16.25% | 19.13% | 19.85% | 21.23% | 21.95% |
| X2 | 17.30% | 20.18% | 20.90% | 22.28% | 23.00% |
| X3 | 18.35% | 21.23% | 21.95% | 23.33% | 24.05% |
| X4 | 19.40% | 22.28% | 23.00% | 24.38% | 25.10% |

Keen Blunt Weapon:

| Books | stone Lv0 | Lv1 | Lv2 | Lv3 | Lv4 |
|---|---:|---:|---:|---:|---:|
| X0 | 14.39% | 17.18% | 17.89% | 19.31% | 19.98% |
| X1 | 15.13% | 17.92% | 18.63% | 20.05% | 20.72% |
| X2 | 15.88% | 18.67% | 19.38% | 20.80% | 21.47% |
| X3 | 16.62% | 19.41% | 20.12% | 21.54% | 22.21% |
| X4 | 17.36% | 20.15% | 20.86% | 22.28% | 22.95% |

`Master's Tenacity`, `Barricade`, `Stabilized Status`, `Cursed Doll`, `Hit Master` (`타격의 대가`):

| Books | stone Lv0 | Lv1 | Lv2 | Lv3 | Lv4 |
|---|---:|---:|---:|---:|---:|
| X0 | 14.00% | 17.00% | 17.75% | 19.25% | 20.00% |
| X1 | 14.75% | 17.75% | 18.50% | 20.00% | 20.75% |
| X2 | 15.50% | 18.50% | 19.25% | 20.75% | 21.50% |
| X3 | 16.25% | 19.25% | 20.00% | 21.50% | 22.25% |
| X4 | 17.00% | 20.00% | 20.75% | 22.25% | 23.00% |

Raid Captain, included here only to prevent another table mix-up:

| Books | stone Lv0 | Lv1 | Lv2 | Lv3 | Lv4 |
|---|---:|---:|---:|---:|---:|
| X0 | 16.00% | 19.00% | 19.76% | 21.28% | 22.00% |
| X1 | 16.80% | 19.80% | 20.56% | 22.08% | 22.80% |
| X2 | 17.60% | 20.60% | 21.36% | 22.88% | 23.60% |
| X3 | 18.40% | 21.40% | 22.16% | 23.68% | 24.40% |
| X4 | 19.20% | 22.20% | 22.96% | 24.48% | 25.20% |

### Accessory Polishing Direct Effects

Base stat and weapon attack percent options are excluded here because they are already reflected in pure base attack. Direct combat-power effects are:

Necklace:

```text
Damage to foes medium: +1.20%
Additional damage medium: +1.23072%
Attack power +390 upper: +0.2730%
```

Earrings, two pieces:

```text
Attack power % medium: +0.95% each
Attack power +390 upper: +0.2730% each
Weapon attack +1.80% each excluded from direct factor
```

Rings, two pieces:

```text
Critical damage medium: +0.7200% each
Critical rate medium: +0.73549% each
Attack power +390 upper: +0.2730% each
```

Computed factor:

```text
Accessory direct factor = 1.08948678818912
Accessory direct increase = +8.948679%
```

### Combat Stats

Formula:

```text
(Crit + Specialization + Swiftness) * 0.03%
```

Current:

```text
1826 + 75 + 577 = 2478
2478 * 0.03% = +74.34%
Combat stat factor = 1.7434
```

Domination, endurance, and expertise are excluded by this formula.

### Bracelet

Bracelet options must be routed by effect type. A bracelet is not a single direct
combat-power multiplier.

Routing rules:

```text
Combat stats: crit / specialization / swiftness
=> handled by the Combat Stats formula.

Base-attack-side stats: strength / dexterity / intelligence / weapon attack
=> handled by pure base attack.

Grade leap points: relic / ancient leap-point difference
=> handled by ark passive leap points.

Special damage options: crit rate, crit damage, additional damage, damage to foes,
positional damage, demon damage, staggered-foe damage, combo special options
=> handled as independent direct bracelet combat-power factors.

Weapon-attack buff options: stack/condition/time-based weapon attack granted as a buff
=> the buff portion is a direct bracelet combat-power factor, separate from the
   base weapon-attack portion.
```

Current bracelet example:

```text
Ancient
Crit 90
Strength 11904
Upper: Crit rate +5.0% | critical damage to foes +1.5%
Medium: Damage to foes +2.5%
Lower: Crit rate +3.40%
```

Excluded:

- Ancient grade leap points: handled by ark passive/leap point side.
- Crit 90: handled by combat stats.
- Strength 11904: handled by pure base attack.

Direct bracelet factors:

```text
Upper crit+crit-damage-to-foes combo: +4.5% => 1.045
Medium damage to foes: +2.5% => 1.025
Lower crit rate: +2.38% => 1.0238

Bracelet direct factor = 1.045 * 1.025 * 1.0238 = 1.096617775
Bracelet direct increase = +9.6617775%
```

Weapon-attack bracelet options require a second split. The fixed weapon-attack
part belongs to the base-attack side, while the buff-like part belongs to the
direct bracelet factor. Published examples describe the direct buff portion as:

```text
Hit: weapon attack +1480, move/attack speed +1%, 6 stacks:
  upper +2.40%, medium +2.14%, lower +1.88%

Weapon attack +9000, while HP >= 50% weapon attack +2400:
  upper +0.65%, medium +0.59%, lower +0.54%

Weapon attack +8700, every 30s weapon attack +150, 30 stacks:
  upper +1.21%, medium +1.13%, lower +1.05%
```

For options shaped like `weapon attack +8700 | buff weapon attack +150 * 30`,
the `+8700` is not a direct bracelet multiplier; only the buff portion uses the
listed direct factor. The same principle applies to the `weapon attack +7800 |
stack weapon attack +140` shape: fixed weapon attack is base-attack-side, stack
weapon attack is direct-factor-side.

Important uncertainty: the article states that some weapon-attack option impact
depends on the player's weapon attack, with lower weapon attack gaining more.
Until the exact in-game normalization is solved, treat the published buff table
as the best current rule for the direct buff portion, and validate character by
character when high precision is required.

### Regular Gems

Reset note:

```text
Previous gem data mixed direct table values with measured Lopec correction values.
For the next simulator design pass, treat those measured corrections as deprecated
and restart from the published per-gem combat-power table below.
```

Known rules:

- Each gem independently increases combat power.
- Damage/cooldown gem type and skill assignment do not affect combat power.
- T4 gems additionally have base attack percent, which increases pure base attack and therefore adds extra combat power.
- 97-stone/base-attack-percent interactions may dilute the visible effect and must be handled separately from the pure per-gem combat-power table.

Eleven identical gems, no 97-stone baseline:

| Gem level | Pure combat-power increase | Base attack % sum | Final combat-power increase | Increase vs previous level |
|---:|---:|---:|---:|---:|
| 6 | 61.94% | 4.95% | 69.96% | |
| 7 | 73.20% | 6.60% | 84.62% | +8.63% |
| 8 | 85.16% | 8.80% | 101.45% | +9.11% |
| 9 | 97.86% | 11.00% | 119.62% | +9.02% |
| 10 | 119.30% | 13.20% | 139.25% | +8.94% |

Per-gem pure combat-power table:

| Tier | Level | Combat-power increase |
|---:|---:|---:|
| 3 | 1 | 0.48% |
| 3 | 2 | 0.96% |
| 3 | 3 | 1.44% |
| 3 | 4 | 1.92% |
| 3 | 5 | 2.40% |
| 3 | 6 | 2.88% |
| 3 | 7 | 3.36% |
| 3 | 8 | 3.84% |
| 3 | 9 | 4.80% |
| 3 | 10 | 6.40% |
| 4 | 1 | 1.28% |
| 4 | 2 | 1.92% |
| 4 | 3 | 2.56% |
| 4 | 4 | 3.20% |
| 4 | 5 | 3.84% |
| 4 | 6 | 4.48% |
| 4 | 7 | 5.12% |
| 4 | 8 | 5.76% |
| 4 | 9 | 6.40% |
| 4 | 10 | 7.04% |

T4 base attack percent table inferred from the 11-gem totals:

| T4 level | Base attack per gem |
|---:|---:|
| 1 | 0.00% |
| 2 | 0.05% |
| 3 | 0.10% |
| 4 | 0.20% |
| 5 | 0.30% |
| 6 | 0.45% |
| 7 | 0.60% |
| 8 | 0.80% |
| 9 | 1.00% |
| 10 | 1.20% |

Current regular gem setup used by earlier samples:

```text
T4 level 9: 1 gem
T4 level 8: 10 gems
Base attack percent sum from gems: 9.00%
```

Earlier table baseline subset:

```text
T4 level 8 pure combat power: +5.76%
T4 level 9 pure combat power: +6.40%
T4 level 10 pure combat power: +7.04%
```

Formula for T4 regular-gem changes:

```text
pure_ratio = product(new_gem_pure_factor / current_gem_pure_factor)
base_attack_ratio = (1 + (new_gem_base_attack_sum + existing_base_attack_percent) / 100)
                  / (1 + (current_gem_base_attack_sum + existing_base_attack_percent) / 100)
new_cp = current_cp * pure_ratio * base_attack_ratio
```

For characters with the 97-stone base-attack bonus, use `existing_base_attack_percent = 1.50`.
For characters without it, use `0`.

Verified regular-gem samples:

```text
Hangunttun, 97-stone base attack +1.50%, current CP 4933.35
Current gems: T4 Lv9 x1, T4 Lv8 x10, gem base attack sum 9.00%
One Lv8 -> Lv9: 4972.187032194468, +38.83703219446761
All gems -> Lv10: 5810.240684386926, +876.8906843869254

97-stone base attack +1.50%, current CP 7124.35
Current gems: T4 Lv10 x5, T4 Lv9 x6, gem base attack sum 12.00%
All gems -> Lv10: 7463.450180407866, +339.100180407866

No 97-stone base attack, current CP 2192.31
Current gems: T4 Lv8 x2, T4 Lv7 x9, gem base attack sum 7.00%
All gems -> Lv8: 2354.3546941765867, +162.04469417658675
```

Important caveat:

- For T4 gem base-attack percent, existing base-attack percent sources such as 97-stone-like effects dilute the relative gain and must be included in the base-attack ratio pool.
- The pure gem factor is independent of gem type, skill, cooldown/damage designation, and skill share.

Deprecated measured Lopec correction cases. Do not use these as the next implementation source without revalidating from clean in-game samples:

```text
Current CP: 4933.35
Current gems: one level 9, ten level 8

9 -> 10 one gem: 4972.00
8 -> 9 one gem: 4972.18
8 -> 9 ten gems: 5334.99

8 -> 10 count cases:
1: 5011.13
2: 5090.07
3: 5170.19
4: 5251.50
5: 5334.03
6: 5417.78
7: 5502.78
8: 5589.04
9: 5676.58
10: 5765.43

All 10: 5810.24
```

### Card

```text
Light of Salvation 30 awakening = +15.00%
Card factor = 1.15
```

### Ark Grid Core

Current ark grid core:

```text
All ancient grade
Order Sun 3: +8.5% => 1.085
Order Moon 3: +8.5% => 1.085
Order Star 3: +5.5% => 1.055
Chaos Sun, brilliant attack 20P: +4.0% => 1.04
Chaos Moon, breaking strike 20P: +3.0% => 1.03
Chaos Star, attack 19P: +3.83005% => 1.0383005
```

Computed factor:

```text
Ark grid core factor = 1.085 * 1.085 * 1.055 * 1.04 * 1.03 * 1.0383005
                     = 1.38135582425063
Ark grid core increase = +38.135582%
```

The older linear `19P` chaos-star assumption is wrong for this measured sample.
Measured chaos values used here:

```text
Ancient Chaos Sun, brilliant attack 20P: +4.00%
Ancient Chaos Moon, breaking strike 20P: +3.00%
Ancient Chaos Star, attack 19P: +3.83005%
Ancient Chaos Star, attack 20P: +4.00%
```

### Ark Grid Gems

Ark grid gem options:

- Dealer-effective options: attack power, additional damage, boss damage.
- Support-effective options: brand power, ally attack enhancement, ally damage enhancement.

Current character is a dealer, so only the first three are considered.

Current ark grid gem levels:

```text
Attack power Lv42
Additional damage Lv28
Boss damage Lv45
```

Measured combat power samples, changing only one ark-grid gem option at a time:

```text
Baseline: 4933.35

Attack power Lv42 -> Lv43: 4934.81
Attack power Lv43 -> Lv44: 4936.27

Additional damage Lv28 -> Lv29: 4936.26
Additional damage Lv29 -> Lv30: 4939.17

Boss damage Lv45 -> Lv46: 4937.15
Boss damage Lv46 -> Lv47: 4940.96
```

Derived per-level factors:

```text
Attack power per level factor = sqrt(4936.27 / 4933.35)
                              = 1.00029590116738
                              = +0.0295901167%

Additional damage per level factor = sqrt(4939.17 / 4933.35)
                                   = 1.00058968900552
                                   = +0.0589689006%

Boss damage per level factor = sqrt(4940.96 / 4933.35)
                             = 1.00077098396996
                             = +0.0770983970%
```

Working formula:

```text
ark_grid_gem_factor = attack_power_per_level^attack_power_level
                    * additional_damage_per_level^additional_damage_level
                    * boss_damage_per_level^boss_damage_level
```

Current character:

```text
ark_grid_gem_factor = 1.00029590116738^42
                    * 1.00058968900552^28
                    * 1.00077098396996^45
                    = 1.06568027130117

Ark grid gem increase = +6.568027%
```

This is lower than the Lopec displayed option-efficiency estimate of roughly `+7.08%`, so Lopec ark-grid gem percentages should be treated as a reference, not an exact in-game formula.

Total ark-grid estimate:

```text
Ark grid total factor = ark_grid_core_factor * ark_grid_gem_factor
                       = 1.38135582425063 * 1.06568027130117
                      ~= 1.47208

Ark grid total increase ~= +47.21%
```

#### Measured Ark Grid Samples

These values are direct measurements from our current reverse-engineering work.
Keep them separate from the Inven article tables and Lopec displayed option
efficiency values.

Timkiyoot baseline:

```text
Current combat power: 2181.84
Pet ranch: main stat +1%, additional damage +0.7% confirmed

Ark grid core:
Legendary Order Sun 14P
Legendary Order Moon 14P
Legendary Order Star 14P
No chaos core, 0P

Ark grid gems:
Attack power Lv12
Additional damage Lv4
Boss damage Lv0
```

Measured Legendary Order Sun 14P:

```text
Current: 2181.84
Legendary Order Sun 14P -> 0P, everything else unchanged: 2097.92

Sun 14P factor = 2181.84 / 2097.92
               = 1.040001525320
Sun 14P increase = +4.000152532%
```

This fully explains the previous Timkiyoot residual:

```text
Old predicted CP: 2162.16
Actual CP:        2181.84
Missing factor:   2181.84 / 2162.16 - 1 = +0.910200910%

Old prediction effectively treated Sun 14P as:
2162.16 / 2097.92 - 1 = +3.062080537%

Measured Sun 14P is +4.000152532%, so the missing delta was the under-valued
Legendary Order Sun coefficient.
```

Timkiyoot ark-grid gem one-level measurements:

```text
Baseline: 2181.84

Attack power Lv12 -> Lv13 only: 2182.49
Increase: +0.65
Factor: 2182.49 / 2181.84 = 1.00029791369
Increase %: +0.029791369%

Additional damage Lv4 -> Lv5 only: 2183.14
Increase: +1.30
Factor: 2183.14 / 2181.84 = 1.00059582738
Increase %: +0.059582738%
```

Comparison with the current-character ark-grid gem sample:

```text
Current-character attack-power per level:      +0.0295901167%
Timkiyoot attack-power Lv12 -> Lv13:           +0.029791369%

Current-character additional-damage per level: +0.0589689006%
Timkiyoot additional-damage Lv4 -> Lv5:        +0.059582738%
```

Conclusion: ark-grid gem per-level coefficients are close across these samples
and cannot explain a ~0.9% residual by themselves. The large Timkiyoot residual
was caused by the Legendary Order Sun 14P coefficient being too low in the
working model.

#### Current Multi-Sample Prediction Checkpoint

Raw sample source:

- Local raw data: [`lostark-combat-dummy-data.md`](./lostark-combat-dummy-data.md)
- Use this file as the character-by-character input source for recalculation.
- This research note should keep formulas, derived factors, and validation results;
  the dummy-data file should keep raw copied character state.

Current sample roles:

| Character | Actual CP | Raw-data coverage | Primary use |
|---|---:|---|---|
| Parkbitina | 7104.22 | Full sample: base attack, weapon attack, stats, engravings, gems, ark passive, accessories, bracelet, ark grid, paradise orb | High-spec cross-check; pet ranch additional-damage `1.0%`; ark-grid gem +1 measurements |
| Kkiyotchoong | 2618.11 | Full sample: base attack, weapon attack, stats, engravings, gems, ark passive, accessories, bracelet, ark grid, paradise orb | Mid/low-spec cross-check; Raid Captain engraving correction; bracelet special weapon-attack sample |
| Timkiyoot | 2181.84 | Full sample: base attack, weapon attack, stats, engravings, gems, ark passive, accessories, bracelet, ark grid, paradise orb | Legendary Order Sun 14P and ark-grid gem single-step validation |
| Clockeuna | 2342.12 | Partial sample: base attack, weapon attack, combat stats, bracelet breakdown only | Bracelet decomposition only; exclude from full common-constant validation |

Raw-data highlights that must stay aligned with calculations:

```text
Parkbitina:
  CP 7104.22, pure base attack 209240, weapon attack 241367
  Ark-grid gems: attack power Lv45, additional damage Lv34, boss damage Lv58
  Paradise orb: dealer orb / 35,509,099 paradise power

Kkiyotchoong:
  CP 2618.11, pure base attack 141177, weapon attack 163099
  Engravings: Grudge X0 stone Lv2, Keen Blunt X0 stone Lv2,
              Adrenaline X3, Raid Captain X0, Cursed Doll X4
  Bracelet: dexterity 14500, crit 70, specialization 70,
            weapon attack +8100, weapon attack 7800 | stack weapon attack 140
  Ark-grid gems: attack power Lv31, additional damage Lv1, boss damage Lv0
  Paradise orb: dealer orb / 8,118,889 paradise power

Timkiyoot:
  CP 2181.84, pure base attack 127939, weapon attack 145904
  Engravings: Grudge X0 stone Lv2, Keen Blunt X0 stone Lv2,
              Adrenaline X3, Hit Master X0, Cursed Doll X4
  Ark-grid core: Legendary Order Sun/Moon/Star 14P, no chaos cores
  Ark-grid gems: attack power Lv12, additional damage Lv4, boss damage Lv0
  Paradise orb: dealer orb / 1,346,103 paradise power

Clockeuna:
  CP 2342.12, pure base attack 132628, weapon attack 151593
  Bracelet breakdown only; full sample is incomplete.
```

After pet ranch additional-damage correction and the Timkiyoot Legendary Order
Sun correction:

| Character | Actual CP | Predicted CP | Difference | Error |
|---|---:|---:|---:|---:|
| Hangeontteun | 4933.35 | 4933.35 | 0.00 | 0.000000% |
| Parkbitina | 7104.22 | 7087.53 | -16.69 | -0.234902% |
| Kkiyotchoong | 2618.11 | 2613.23 | -4.88 | -0.186394% |
| Timkiyoot | 2181.84 | 2181.84 | 0.00 | 0.000000% |

Remaining likely causes for Parkbitina/Kkiyotchoong residuals:

```text
Ark-grid core/gem level input differences
Bracelet special weapon-attack option normalization
Regular T4 gem base-attack dilution
Karma/ark-passive boundary mistakes
Accessory direct-option rounding
```

### Paradise Orb

Current paradise gear:

```text
Orb: attack orb
Season 2 max paradise power: 25,621,209
```

Attack orb formula:

```text
Increase = 0.20% + 0.080% * (paradise_power / 1,000,000)
```

Current:

```text
0.20% + 0.080% * 25.621209 = 2.24969672%
Paradise attack orb factor = 1.0224969672
```

## Current Full Reverse-Solved Constant

This section is stale relative to the current Ark Grid and bracelet findings. It
is kept as a historical checkpoint until the full multi-sample worksheet is
rewritten.

Using the then-known factors, including the measured ark-grid gem factor:

```text
known_factor = ark_passive
             * karma_direct
             * engraving
             * accessory_direct
             * combat_stats
             * bracelet_direct
             * regular_gems_naive
             * card
             * ark_grid_core
             * ark_grid_gem_measured
             * paradise_attack_orb
```

Values:

```text
known_factor = 62.7805482634137
combat_power = 4933.35
pure_base_attack = 180391

adjustment_constant = 4933.35 / (180391 * 62.7805482634137)
                    = 0.000435614129204943
```

Current working full equation:

```text
4933.35 = 180391 * 0.000435614129204943 * 62.7805482634137
```

This adjustment constant is empirical. It may absorb missing normalization, mistaken factor interpretation, or base-attack-side factors that are already included in `180,391`.

## T4 Honing Stat Source Status

This section records the current state of the separate T4 honing lookup effort.
It is not yet a complete 단계별 강화 table.

### Inven Item Tooltip Endpoint

Confirmed endpoint pattern:

```text
https://lostark.inven.co.kr/dataninfo/item/item_layer.ctl.php?code={item_code}
```

Verified examples:

```text
운명의 전율 장갑:  https://lostark.inven.co.kr/dataninfo/item/item_layer.ctl.php?code=134621524
운명의 전율 기공패: https://lostark.inven.co.kr/dataninfo/item/item_layer.ctl.php?code=134621330
```

The endpoint returns rendered tooltip HTML, not JSON. It exposes aggregate tooltip
ranges such as:

```text
Gloves: 민첩 +86421~+167216, 체력 +5679~+8270, 생명 활성력 [0~+1400]
Weapon: 무기 공격력 +124793~+241367, 추가 피해 [+10.00%~+30.00%]
```

Verdict: this confirms Inven can provide item-level range bounds, but not the
per-reinforcement-step `무기 공격력` / `힘민지` increments we need for exact
simulation. Treat the tooltip endpoint as a range sanity check only.

### Loawa Public API Extraction

Confirmed public base:

```text
https://api.loawa.com/v1
```

Useful confirmed endpoint patterns:

```text
GET /characters/{name}
GET /rankings/level/detailed?page=1&pageSize=30&minItemLevel={min}&maxItemLevel={max}
GET /rankings/combatpower/detailed?page=1&pageSize=30&minItemLevel={min}&maxItemLevel={max}
GET /statistics/item-levels?min_level={min}&max_level={max}
```

Character payload fields observed:

```text
stats.attack_power_tooltip: contains pure base attack text
equipment[].weapon_power: present on weapons
equipment[].weapon_additional_damage: present on weapons
equipment[].level: present on armor/weapons
equipment[].ark_passive_point: present on armor/accessories
```

Important limitation: Loawa exposes weapon `weapon_power` directly, but armor
items do not expose per-piece strength/dexterity/intelligence. Armor main-stat
totals can only be inferred indirectly from pure base attack and weapon power,
and those totals are polluted by accessories, avatar, bracelet, pets, account
effects, and other base-stat sources. Therefore Loawa alone is reliable for a
weapon-power sample table, but not enough to isolate armor 단계별 힘민지.

Current normal `운명의 전율` weapon-power samples:

| Reinforcement | Weapon power | Sample |
|---:|---:|---|
| +11 | 167706 | 럽니 |
| +12 | 172473 | Balky |
| +13 | 177406 | 매지컬하프 |
| +14 | 182514 | VVXX |
| +15 | 187799 | 맑음지수높음 |
| +16 | 193270 | 센수사 |
| +17 | 198101 | 희사염려 |
| +18 | 203054 | 튀겨먹는계란 |
| +19 | 208130 | 2k7 |
| +20 | 213333 | 라디오뮤직 |
| +21 | 218667 | 빙수 / 한건뜬 |
| +22 | 224133 | 12초폭탄목걸이 |
| +23 | 229737 | 결과 |
| +24 | 235480 | 더워져라 |
| +25 | 241367 | 반짝이는레몬버터 / 박빛이나 |

Keep `운명의 업화` and other weapon families separate. Existing sample names
show that the same displayed reinforcement level can map to different
`weapon_power` values across weapon families.

#### Current `운명의 업화` / Egir Weapon Samples

`운명의 업화` weapon power must be keyed by both normal reinforcement and
advanced refinement. Repeated Loawa samples show identical `weapon_power` within
the same `(normal_level, advanced_refine_level)` cell across different classes
and weapon types, so job/weapon type is not a table key.

Captured normal-honing weapon attack deltas, separate from advanced honing:

| Target normal level | Weapon attack increase |
|---:|---:|
| +1 | 2058 |
| +2 | 2127 |
| +3 | 2198 |
| +4 | 2272 |
| +5 | 2348 |
| +6 | 2427 |
| +7 | 2618 |
| +8 | 2710 |
| +9 | 2805 |
| +10 | 2903 |
| +11 | 3004 |
| +12 | 3110 |
| +13 | 3219 |
| +14 | 3331 |
| +15 | 3448 |
| +16 | 3568 |
| +17 | 3694 |
| +18 | 3823 |
| +19 | 3956 |
| +20 | 4095 |
| +21 | 4238 |
| +22 | 4387 |
| +23 | 4540 |
| +24 | 4699 |
| +25 | 4864 |

Captured normal-honing helmet tooltip stat deltas, separate from advanced honing:

| Target normal level | Physical defense | Magic defense | Main stat | Health |
|---:|---:|---:|---:|---:|
| +1 | 87 | 97 | 1113 | 97 |
| +2 | 89 | 99 | 1150 | 99 |
| +3 | 91 | 100 | 1189 | 100 |
| +4 | 91 | 102 | 1228 | 102 |
| +5 | 94 | 104 | 1270 | 104 |
| +6 | 95 | 106 | 1312 | 106 |
| +7 | 96 | 107 | 1356 | 108 |
| +8 | 98 | 109 | 1401 | 109 |
| +9 | 104 | 116 | 1513 | 116 |
| +10 | 106 | 117 | 1565 | 119 |
| +11 | 108 | 120 | 1620 | 120 |
| +12 | 110 | 122 | 1676 | 123 |
| +13 | 111 | 124 | 1736 | 125 |
| +14 | 114 | 126 | 1796 | 127 |
| +15 | 115 | 128 | 1859 | 129 |
| +16 | 117 | 130 | 1924 | 132 |
| +17 | 120 | 133 | 1991 | 134 |
| +18 | 121 | 135 | 2061 | 136 |
| +19 | 124 | 138 | 2133 | 139 |
| +20 | 126 | 139 | 2208 | 142 |
| +21 | 128 | 142 | 2285 | 144 |
| +22 | 130 | 145 | 2365 | 146 |
| +23 | 132 | 147 | 2448 | 149 |
| +24 | 135 | 150 | 2534 | 152 |
| +25 | 137 | 152 | 2622 | 155 |

Captured normal-honing shoulder tooltip stat deltas, separate from advanced honing:

| Target normal level | Physical defense | Magic defense | Main stat | Health |
|---:|---:|---:|---:|---:|
| +1 | 100 | 91 | 1265 | 87 |
| +2 | 102 | 91 | 1308 | 88 |
| +3 | 104 | 94 | 1351 | 90 |
| +4 | 106 | 95 | 1396 | 92 |
| +5 | 107 | 96 | 1444 | 93 |
| +6 | 109 | 98 | 1491 | 95 |
| +7 | 116 | 104 | 1610 | 101 |
| +8 | 117 | 106 | 1666 | 102 |
| +9 | 120 | 108 | 1724 | 104 |
| +10 | 122 | 110 | 1784 | 107 |
| +11 | 124 | 111 | 1847 | 108 |
| +12 | 126 | 114 | 1912 | 110 |
| +13 | 128 | 115 | 1978 | 112 |
| +14 | 130 | 117 | 2048 | 114 |
| +15 | 133 | 120 | 2119 | 117 |
| +16 | 135 | 121 | 2194 | 118 |
| +17 | 138 | 124 | 2270 | 120 |
| +18 | 139 | 126 | 2350 | 123 |
| +19 | 142 | 128 | 2432 | 125 |
| +20 | 145 | 130 | 2517 | 127 |
| +21 | 147 | 132 | 2605 | 129 |
| +22 | 150 | 135 | 2696 | 132 |
| +23 | 152 | 137 | 2791 | 134 |
| +24 | 155 | 140 | 2889 | 136 |
| +25 | 158 | 141 | 2989 | 139 |

Captured normal-honing chest tooltip stat deltas, separate from advanced honing:

| Target normal level | Physical defense | Magic defense | Main stat | Health |
|---:|---:|---:|---:|---:|
| +1 | 116 | 107 | 890 | 129 |
| +2 | 119 | 109 | 920 | 132 |
| +3 | 120 | 110 | 951 | 133 |
| +4 | 123 | 113 | 983 | 136 |
| +5 | 124 | 114 | 1016 | 139 |
| +6 | 127 | 116 | 1049 | 141 |
| +7 | 128 | 118 | 1085 | 143 |
| +8 | 131 | 120 | 1121 | 146 |
| +9 | 139 | 127 | 1210 | 155 |
| +10 | 141 | 129 | 1252 | 158 |
| +11 | 144 | 132 | 1296 | 161 |
| +12 | 146 | 134 | 1342 | 163 |
| +13 | 149 | 136 | 1388 | 167 |
| +14 | 151 | 139 | 1437 | 169 |
| +15 | 154 | 141 | 1487 | 173 |
| +16 | 156 | 143 | 1539 | 175 |
| +17 | 160 | 146 | 1593 | 179 |
| +18 | 162 | 149 | 1649 | 182 |
| +19 | 165 | 151 | 1707 | 185 |
| +20 | 167 | 154 | 1766 | 189 |
| +21 | 171 | 156 | 1828 | 192 |
| +22 | 173 | 159 | 1892 | 195 |
| +23 | 177 | 162 | 1958 | 199 |
| +24 | 180 | 165 | 2027 | 203 |
| +25 | 182 | 167 | 2098 | 206 |

Captured normal-honing pants tooltip stat deltas, separate from advanced honing:

| Target normal level | Physical defense | Magic defense | Main stat | Health |
|---:|---:|---:|---:|---:|
| +1 | 107 | 116 | 962 | 110 |
| +2 | 109 | 119 | 994 | 111 |
| +3 | 110 | 120 | 1027 | 114 |
| +4 | 113 | 123 | 1062 | 116 |
| +5 | 114 | 124 | 1097 | 118 |
| +6 | 116 | 127 | 1134 | 119 |
| +7 | 118 | 128 | 1172 | 122 |
| +8 | 120 | 131 | 1211 | 124 |
| +9 | 127 | 139 | 1307 | 132 |
| +10 | 129 | 141 | 1353 | 134 |
| +11 | 132 | 144 | 1400 | 137 |
| +12 | 134 | 146 | 1449 | 139 |
| +13 | 136 | 149 | 1500 | 141 |
| +14 | 139 | 151 | 1552 | 144 |
| +15 | 141 | 154 | 1607 | 147 |
| +16 | 143 | 156 | 1663 | 149 |
| +17 | 146 | 160 | 1721 | 152 |
| +18 | 149 | 162 | 1781 | 155 |
| +19 | 151 | 165 | 1844 | 157 |
| +20 | 154 | 167 | 1908 | 161 |
| +21 | 156 | 171 | 1975 | 163 |
| +22 | 159 | 173 | 2044 | 166 |
| +23 | 162 | 177 | 2116 | 169 |
| +24 | 165 | 180 | 2190 | 172 |
| +25 | 167 | 182 | 2266 | 175 |

Captured normal-honing gloves tooltip stat deltas, separate from advanced honing:

| Target normal level | Physical defense | Magic defense | Main stat | Health |
|---:|---:|---:|---:|---:|
| +1 | 81 | 81 | 1426 | 66 |
| +2 | 81 | 81 | 1474 | 68 |
| +3 | 83 | 83 | 1524 | 70 |
| +4 | 85 | 85 | 1574 | 70 |
| +5 | 85 | 85 | 1627 | 72 |
| +6 | 88 | 88 | 1682 | 73 |
| +7 | 92 | 92 | 1815 | 77 |
| +8 | 94 | 94 | 1878 | 79 |
| +9 | 96 | 96 | 1944 | 81 |
| +10 | 98 | 98 | 2012 | 81 |
| +11 | 99 | 99 | 2083 | 84 |
| +12 | 100 | 100 | 2155 | 84 |
| +13 | 103 | 103 | 2231 | 87 |
| +14 | 104 | 104 | 2308 | 87 |
| +15 | 107 | 107 | 2390 | 90 |
| +16 | 108 | 108 | 2473 | 91 |
| +17 | 110 | 110 | 2560 | 92 |
| +18 | 111 | 111 | 2649 | 95 |
| +19 | 114 | 114 | 2743 | 96 |
| +20 | 116 | 116 | 2838 | 97 |
| +21 | 117 | 117 | 2937 | 100 |
| +22 | 120 | 120 | 3040 | 101 |
| +23 | 122 | 122 | 3147 | 103 |
| +24 | 124 | 124 | 3257 | 105 |
| +25 | 126 | 126 | 3371 | 107 |

Observed cells:

| Normal | Advanced | Weapon power | Samples |
|---:|---:|---:|---|
| +17 | 20 | 131959 | Clairement |
| +17 | 30 | 142005 | 저도변신안하면사람이에요, 팬텀실린 |
| +17 | 34 | 145114 | 팬텀기상술사 |
| +18 | 20 | 135527 | CNSgun, 헌이온, 시간을달리는동재, 짠거그만먹용, 원소 |
| +18 | 25 | 139221 | 페전, 층론 |
| +18 | 27 | 140734 | LiegeWaffle |
| +18 | 30 | 145904 | 샨디친형, 윤이씨오, Concepts1One, MariageFrers |
| +19 | 10 | 131959 | 모험 |
| +19 | 20 | 139221 | ShyBlossom |
| +19 | 30 | 149940 | 동재업고튀어, 촉고수 |
| +19 | 36 | 154969 | 동재는프라다를입는다, IceWineTea |
| +19 | 40 | 163099 | 팬텀데런 |
| +20 | 20 | 143044 | 곡면 |
| +20 | 30 | 154116 | 멀레벌레, 엘링유동재, 원스리 |
| +20 | 40 | 167706 | 인라이튼드, 일옥 |
| +21 | 20 | 147000 | 즐로아 |

Rows with unknown advanced refinement are excluded from the table and must not
be treated as advanced `0`:

```text
추억: +19 운명의 업화 마법 덱, weapon_power 125180, advanced_refine_level unknown
타락: +20 운명의 업화 대거, weapon_power 128511, advanced_refine_level unknown
```

Simulation formula for `운명의 업화` weapons is the same base-attack ratio used
for `운명의 전율`, but the target weapon power must come from this 2D table:

```text
new_combat_power = current_combat_power * sqrt(target_weapon_power / current_weapon_power)
```

### Current Honing Data Gap

Known from official/guide-style sources:

```text
상급 재련 1~10: 무기 공격력 +4185
상급 재련 11~20: 무기 공격력 +4470
상급 재련 30단계 도달: 기본 효과 +2%
상급 재련 40단계 도달: 기본 효과 +3%
```

Still missing:

```text
Normal T4 +0~+10 weapon_power table
Complete 운명의 업화 normal×advanced weapon_power grid outside observed cells
Complete weapon-family separation for 운명의 결단 / 전율 / 업화
Armor per-step strength/dexterity/intelligence increments
Any authoritative raw table for advanced-honing per-piece armor stats
```

Next best source candidates are either a controlled official OpenAPI tooltip
sample set, if API access is available, or a separate community/raw table that
publishes 단계별 armor stats directly. Current Inven tooltip and Loawa public
character data do not expose that missing armor table.

## Known Caveats And Open Questions

1. The direct multiplication model fits the Inven explanation conceptually, but the raw `0.0288` constant does not fit this character when all listed factors are multiplied.
2. Some factors are already reflected in pure base attack and must not be double-counted:
   - Strength/dexterity/intelligence percent
   - Weapon attack percent
   - Bracelet combat stat
   - Bracelet strength
   - Accessory strength/main-stat percent
   - Accessory weapon attack percent
3. T4 regular gem base attack percent may be diluted by pre-existing base attack percent sources such as 97-stone-related effects.
4. Ark-grid gem formula is currently reverse-engineered from this character. It must be validated on other dealers.
5. Pet patrol is unknown and excluded:
   - Upper: +0.77%, factor `1.0077`
   - Middle: +0.54%, factor `1.0054`
   - Lower: +0.31%, factor `1.0031`
6. The current `regular_gems_naive` factor is from the public table, not from a fully base-attack-diluted exact formula.
7. Lopec percentages are useful references but not authoritative for in-game reverse engineering.

## External Source Notes

Primary source: <https://www.inven.co.kr/board/lostark/4821/106546>

Confirmed from article body:

```text
combat_power = pure_base_attack * combat_power_factor * combat_power_factor * ...
pure_base_attack = sqrt(main_stat * weapon_attack / 6)
Temporary feast/food buffs are not reflected.
Combat level 70 factor: +29.45%.
Weapon quality uses the displayed additional-damage amount, with possible 0.01 display differences.
Evolution T2-T4 points: +0.5% per point in the original article, updated by later patch notes/comments.
Enlightenment points: +0.7% per point.
Leap points: +0.2% per point.
Engravings use per-engraving coefficient tables, not a generic 16% -> 17% rule.
```

Confirmed from comments:

```text
Small residual errors are likely due to earlier rounding during the in-game calculation.
Cards such as demon damage are unrelated to combat power.
Evolution T1 stat points are excluded from ark-passive evolution combat-power points because stats are later counted through the combat-stat formula.
After elixir/transcendence removal, evolution T2+ changed from +0.5% per point to +0.75% per point, so 100 points gives +75%.
Accessory additional damage is applied in-game; Lopec simulator behavior may differ.
```

Ark grid comment update from the author on 2025-09-02:

```text
Relic order sun/moon: 1.5%, 4.0%, 7.5%, 7.67%, 7.83%, 8.00%
Ancient order sun/moon: 1.5%, 4.0%, 8.5%, 8.67%, 8.83%, 9.00%
Relic order star: 1.0%, 2.5%, 4.5%, 4.67%, 4.83%, 5.00%
Ancient order star: 1.0%, 2.5%, 5.5%, 5.67%, 5.83%, 6.00%

Relic chaos sun at 20P:
  Brilliant attack: +3.0%
  Stable attack: +2.0%
  Quick attack: +2.0%

Relic chaos moon at 20P:
  Burning strike: +3.0%
  Absorbing strike: +2.0%
  Breaking strike: +2.0%

Relic chaos star at 20P:
  Attack: +3.0%
```

Note: our measured Timkiyoot result found `Legendary Order Sun 14P ~= +4.00015%` from `2181.84 / 2097.92 - 1`. Keep that measured sample separate from the author's later relic/ancient order arrays until the exact legendary table is fully mapped.

## Next Validation Plan

To determine whether the adjustment constant is universal or character-specific, test another dealer with the same worksheet:

Required minimum data:

```text
Current combat power
Pure base attack
Weapon attack power
Crit / specialization / swiftness
Engraving states
Regular gem levels and T4 base attack percent sum
Card set
Ark passive evolution/enlightenment/leap points
Karma ranks and levels
Accessory polishing options
Bracelet options
Ark grid core state
Ark grid gem attack/additional/boss levels
Paradise orb type and paradise power
Pet patrol stage, if known
```

Validation target:

```text
Does another dealer produce adjustment_constant ~= 0.000435614129204943?
```

If the constant is stable, the model is likely close. If it diverges, inspect in this order:

1. Regular T4 gem base-attack dilution.
2. Base-attack-side factors already absorbed into pure base attack.
3. Ark-grid gem per-level coefficients across different characters.
4. Pet patrol and other missing minor factors.
5. Whether some published percent tables are log-share-derived or otherwise normalized.
