# Spec Simulator Design Contract

## Direction

The `/spec-simulator` page follows the actual Korean Lost Ark utility pattern: a **practical calculator dashboard**, not a cinematic SaaS lab. Real references such as LoPEC, LoaChart, ILOA, LoaCalc/Icepeng, and LoaUp prioritize fast character lookup, white card surfaces, compact feature grids, dense native controls, and clear result comparison. The page should feel like a reliable game utility tool while preserving simulator behavior, formulas, model parsing, route registration, API calls, storage, and callback signatures.

## Tokens

- **Palette:** preserve the existing Tailwind Lost Ark palette: `la-gold`, `la-gold-light`, `la-gold-dark`, `la-dark`, `la-dark-card`, `la-dark-surface`, plus neutral `gray-*` and semantic green/red/blue/purple/amber accents already used by the simulator.
- **Surface:** light mode leads with `gray-50` and white cards; dark mode uses the existing `la-dark` cards. Gradients must be subtle and background-only, never the page's main personality.
- **Typography:** keep the app font stack and Tailwind scale. Hero stays compact (`text-2xl` to `text-3xl`); score numerals use `tabular-nums`; labels stay compact at `text-[10px]` to `text-xs` for dense controls.
- **Spacing:** use Tailwind spacing scale only: panel padding `p-4 sm:p-5`, page gutters `px-3 sm:px-4 lg:px-6`, grids `gap-3` to `gap-6`.
- **Shape and elevation:** reference calculators mostly use restrained `8px-16px` radii. Core surfaces use `rounded-xl`; nested controls use `rounded-lg`; elevation is light and functional, with gold used for selected/changed states only.

## Page-Scoped Primitives

- `.spec-lab-shell`: simulator-only utility dashboard background wrapper.
- `.spec-lab-card`: restrained white/dark card surface for hero, active character, summary, rail, modal blocks.
- `.spec-lab-panel`: dense calculator panel shell for each tuning group.
- `.spec-control`: shared native select/input visual shell, preserving browser select behavior and all existing option values.
- `.spec-mini-button`: compact bulk action/reset buttons with gold focus/hover affordance.
- `.spec-chip`: small status/category chips used for counts, grade markers, and telemetry labels.

All component code may still use Tailwind utilities directly when the utility is layout-specific. Repeated visual chrome should use the page-scoped primitives above.

## Responsive Rules

- Mobile: single-column flow, horizontal scroll only where it already exists for category rail/gems, sticky score summary below the nav.
- Tablet: search, active character, and score summary stay stacked but compact.
- Desktop: `all` category uses a utility dashboard layout with core systems in the left column and gear/accessory/systems panels in the larger right column. Focused categories collapse to a single wide workbench.

## Accessibility

- All interactive controls must retain native keyboard behavior.
- New focus styles use `focus-visible:ring-2 focus-visible:ring-la-gold/40` or stronger.
- Dialog surfaces must remain `role="dialog"` and `aria-modal="true"`; label the Ark Grid gem editor title with `aria-labelledby`.
- Avoid semantic regressions: keep form/search roles, links, button types, select option values, and existing Korean labels.

## Accepted Debt

- The page continues to use native `<select>` controls rather than custom selects to preserve behavior and avoid new dependencies.
- Some dense simulator panels keep compact typography because the feature is a game calculator, not a marketing page.
- `useSpecScoreSimulator.ts`, parser/model files, data tables, and formula code are intentionally outside this design scope.
