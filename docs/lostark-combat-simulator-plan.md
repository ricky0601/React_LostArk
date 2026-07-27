# Lost Ark Combat Simulator Plan

This document defines the product and implementation direction for the combat-power simulator. Formula details, reverse-engineering notes, raw samples, and unresolved coefficient research belong in [`lostark-combat-power-research.md`](./lostark-combat-power-research.md) and [`lostark-combat-dummy-data.md`](./lostark-combat-dummy-data.md).

## Goal

Build a simulation page that starts from the character's current API state, displays the relevant current spec data, and estimates combat-power changes when the user changes upgrade or option values.

The simulator should not try to reproduce the current combat power from zero as its main path. The API-provided current combat power is the baseline.

```text
simulated_combat_power = current_api_combat_power * changed_factor / current_factor
```

This baseline-relative model keeps hidden constants, combat-level handling, and already-absorbed base-attack effects inside the current API combat power unless the user explicitly changes the related part.

## Current State Display

The first screen should show the character's current state from API data and parsed tooltips.

Required baseline fields:

- Current combat power
- Displayed attack power
- Pure base attack, if available or parseable
- Main stat and weapon attack power
- Combat stats: crit, specialization, swiftness, domination, endurance, expertise
- Equipment list: part, item level, honing level, advanced honing level, quality, weapon power where applicable
- Accessory list and polishing effects
- Bracelet options
- Engravings with book stage and stone level
- Regular gems and levels
- Card set
- Ark passive: evolution, enlightenment, leap points
- Karma ranks and levels when available
- Ark grid cores and ark grid gem option levels
- Paradise orb type and paradise power

Fields that are unavailable from API should be shown as unknown or manual-input candidates, not silently guessed.

## Simulation Scope

Initial high-value simulation targets:

- Equipment honing level changes
- Weapon attack changes from known weapon-power tables
- Main-stat changes from known armor stat tables
- Weapon quality changes
- Accessory polishing option changes
- Engraving book stage changes
- Ability-stone level changes for equipped engravings
- Regular T4 gem level changes
- Bracelet option changes when the option has a known direct factor or base-attack/stat route
- Ark passive point changes
- Ark grid core and ark grid gem changes where coefficients are known
- Paradise orb power changes

Unsupported or uncertain changes should be disabled, marked as experimental, or require manual coefficient input.

## Calculation Principles

Use ratio updates from the current API baseline.

Examples:

```text
Weapon attack only:
new_cp = current_cp * sqrt(new_weapon_attack / current_weapon_attack)

Main stat only:
new_cp = current_cp * sqrt(new_main_stat / current_main_stat)

Engraving change:
new_cp = current_cp * new_engraving_factor / current_engraving_factor

Accessory direct-option change:
new_cp = current_cp * new_accessory_direct_factor / current_accessory_direct_factor

Regular gem change:
new_cp = current_cp * new_regular_gem_factor / current_regular_gem_factor
```

When multiple independent parts change, multiply all changed/current ratios together:

```text
new_cp = current_cp
       * weapon_attack_ratio
       * main_stat_ratio
       * engraving_ratio
       * accessory_ratio
       * gem_ratio
       * other_changed_ratios
```

## Double-Counting Rules

Do not multiply a direct factor for a value that is already reflected in the current baseline side being compared.

Base-attack-side values:

- Strength, dexterity, intelligence flat or percent values
- Weapon attack flat or percent values that affect the character's base attack
- Bracelet combat stats that feed the combat-stat formula
- Accessory main-stat percent
- Accessory weapon-attack percent
- Gem base-attack percent when already reflected in parsed pure base attack or handled through a dedicated gem formula

Direct-factor-side values:

- Engraving table coefficients
- Accessory direct options such as damage to foes, additional damage, crit rate, crit damage, and attack power flat options when modeled by the published direct coefficient
- Bracelet special damage options
- Card set damage factor when applicable to combat power
- Ark grid core coefficients
- Ark grid gem option coefficients
- Paradise orb factor

Combat level is already included in the API current combat power. Do not apply a standalone combat-level factor during ordinary relative simulations unless the simulator later supports changing combat level and the coefficient has been validated for that use case.

## API And Parsing Strategy

Use API data as the source of truth for current state where possible. Tooltip parsing is allowed for fields the API exposes only as rendered text.

Implementation should separate:

- Raw API payload
- Parsed current spec model
- Current factor model
- Editable simulation draft model
- Computed changed factor model
- Display result and diff summary

This separation should make it obvious whether a number came from API, tooltip parsing, a static table, a reverse-engineered coefficient, or manual user input.

## Accuracy Strategy

The simulator should present exact-looking numbers only when the coefficient path is validated. Otherwise, mark the result as estimated.

Recommended confidence labels:

- Confirmed: formula/table validated against current samples
- Estimated: reverse-engineered from limited samples
- Experimental: known uncertainty remains
- Manual: user supplied a missing value

The UI should keep the baseline API combat power visible next to the simulated combat power and show both absolute and percent deltas.

```text
Current:   4933.35
Simulated: 5011.13
Delta:     +77.78 (+1.576%)
```

## Open Questions

- Which current-state fields are reliably available from the Lost Ark Open API versus tooltip parsing?
- Which pet, patrol, collection, or account-wide effects are absent from API and need manual input?
- Whether the regular T4 gem base-attack percent needs character-specific dilution in all cases.
- How to normalize bracelet weapon-attack buff options across different weapon-attack baselines.
- Whether ark-grid gem per-level coefficients remain stable across enough dealer samples.
- How to represent support combat power separately from dealer combat power.

## Implementation Notes

- Keep research findings in the research document, not in this plan unless they directly affect product behavior.
- Keep raw copied character data in the dummy-data document.
- Prefer adding static coefficient tables under `src/data/` once a coefficient is stable enough for implementation.
- Add explicit source and confidence metadata to coefficient tables so experimental values are not mistaken for official values.
