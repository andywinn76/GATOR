# GATOR Rules Roadmap

The first release is intentionally scoped to **BattleTech: A Game of Armored Combat (AGoAC)** BattleMech weapon attacks. Every additional ruleset should be implemented as a clearly named mode with its own modifier tables, explanations, tests, and citation to the exact rulebook printing used. Do not combine modifiers from different modes.

## Quick-start modes

- [x] Add **BattleTech Beginner Box Quick-Start Rules** mode.
  - Use the current official Beginner Box QSR as the source of truth.
  - Hide full-game options not present in the quick-start rules.
  - [ ] Add a short “What this mode includes” panel for new players.
- [x] Add dedicated **Classic BattleTech** and **Quick-Start** LOS calculators that link applicable terrain data to targeting.
- [ ] Add **BattleTech: Essentials Quick-Start Rules** mode.
  - Compare its attack table with the Beginner Box QSR before sharing an implementation.
  - Document any scenario-specific or arena rules separately.
- [x] Add **Alpha Strike Quick-Start Rules** mode.
  - Implement SATOR/Alpha Strike terminology and math independently from Classic BattleTech GATOR.
  - Support inches, target movement modifier, terrain, range, heat, and applicable unit traits from the selected QSR printing.
  - Make the active rules mode visually unmistakable.
- [ ] Add a quick-start mode comparison screen covering intended audience, included rules, and excluded advanced options.

## Core rules modes

- [ ] Add **BattleTech Core Rulebook (2026)** mode.
  - Audit every modifier against the final published printing and current errata.
  - Add a migration note summarizing differences from AGoAC without changing saved AGoAC shots.
  - Version saved local-storage data by rules mode and printing.
- [ ] Add **Total Warfare** combined-arms GATOR mode.
  - BattleMechs and IndustrialMechs.
  - Combat vehicles, support vehicles, VTOLs, WiGEs, and naval units.
  - Conventional infantry and battle armor.
  - ProtoMechs.
  - Aerospace interactions that use ground-combat attack modifiers.
  - Unit-type-specific attacker, target, terrain, and movement modifiers.
- [ ] Add **BattleMech Manual** mode for the complete BattleMech-focused rules presentation.
  - Separate standard rules from optional rules.
  - Add equipment-driven modifiers such as targeting computers and specialized munitions only when the selected attack supports them.
- [ ] Add **Alpha Strike: Commander’s Edition** mode.
  - Implement the full SATOR table, unit-type modifiers, special abilities, and current errata.
  - Keep this mode separate from Alpha Strike Quick-Start.

## Advanced and optional variants

- [ ] Add **Tactical Operations: Advanced Rules** optional environmental modifiers.
  - Weather, wind, precipitation, temperature, darkness, and visibility.
  - Advanced terrain and battlefield conditions.
  - Clearly label every optional rule and allow groups to enable rule modules individually.
- [ ] Add **Tactical Operations: Advanced Units & Equipment** equipment-specific modifiers.
- [ ] Add artillery, air-to-ground, indirect-fire, TAG, Narc, semi-guided, and homing attack workflows where their calculations differ from a normal weapon attack.
- [ ] Investigate indirect-fire rules intricacies before expanding that workflow.
  - TAG interactions and when TAG replaces or alters normal spotting modifiers.
  - Differences based on the allied spotter/tagging unit type, including BattleMechs, vehicles, conventional infantry, and battle armor.
  - Spotter movement, spotter attacks, line of sight, terrain, range, and target-selection restrictions.
  - Interactions with Narc, semi-guided ammunition, homing ammunition, and rulebook-specific exceptions.
  - Verify every behavior against the applicable ruleset, printing, and official errata.
- [ ] Add special attack workflows: aimed shots, called shots, strafing, bombing, anti-’Mech infantry attacks, and other rulebook-defined cases.
- [ ] Add physical attack calculators as a separate tool rather than mixing Piloting-based attacks into GATOR.
- [ ] Add hexless conversion support where an official ruleset provides it.
- [ ] Add a house-rules profile system with named presets; custom modifiers must always be visually distinguished from official modifiers.

## Product and quality work

- [x] Add a compact rules-mode switcher and persist the selection between refreshes.
- [ ] Show the active book and printing beside every result.
- [ ] Investigate weapon profiles and BattleMech roster management as a later major feature.
  - [x] Add a versioned JSON catalog of the ten unique weapons printed on the 2026 Core Quick-Start record sheets, including validation tests and source-page references.
  - [ ] Expand the weapon catalog only from verified rules sources, keeping ruleset and tech-base variants distinct.
  - Store standard variant loadouts and custom unit configurations locally.
  - Support multiple BattleMechs and pilots in one gaming session.
  - Select the firing weapon to derive minimum, short, medium, and long range brackets automatically.
  - Track weapon-specific damage, heat, ammunition, firing arcs, locations, and applicable special rules only after defining the intended record-sheet scope.
  - Design import/export before users invest significant time building local rosters.
  - Keep manual range selection available so the GATOR calculator remains fast without a saved roster.
- [ ] **Investigate feature:** scan or upload a Quick-Start record sheet and import its ’Mech name, variant, and weapon loadout using OCR.
  - Start with known official Quick-Start sheet layouts rather than arbitrary or handwritten sheets.
  - Prefer recognizing the unit name and variant, then loading a verified local loadout, instead of trusting OCR to reconstruct every weapon statistic.
  - Compare private, browser-only OCR with a serverless/cloud vision service for accuracy, mobile performance, cost, and data handling.
  - Include image cropping, rotation, low-confidence warnings, manual correction, and a confirmation screen before saving an imported unit.
  - Keep manual unit selection and loadout entry available when recognition fails.
- [ ] Add a first-run ruleset picker while defaulting existing users to AGoAC.
- [ ] Add automated test vectors copied from worked examples in each supported rulebook.
- [ ] Add a source/about screen listing official rulebook titles, printings, errata dates, and page/table references without reproducing copyrighted rule text.
- [ ] Add import/export for local profiles and house-rule presets.
- [ ] Add installable PWA/offline support for game stores and convention halls with poor connectivity.
- [ ] Add tablet split view and a phone quick-shot mode after live table testing.
- [ ] Recheck accessibility: keyboard navigation, screen-reader labels, focus order, reduced motion, contrast, and 44px minimum touch targets.

## Guardrails

- Official modifiers must be traceable to an exact source and printing.
- Ruleset-specific state must never leak into another mode.
- Scenario rules and house rules must not be presented as core rules.
- When two official sources conflict, show the selected source/printing and resolve only through applicable official errata.
