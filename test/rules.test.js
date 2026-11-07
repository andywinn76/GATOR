import test from 'node:test'
import assert from 'node:assert/strict'
import {
  alphaStrikeCoreDefaults,
  alphaStrikeCoreRange,
  calculateAlphaStrikeCoreLos,
  calculateAlphaStrikeCoreModifiers,
  calculateAlphaStrikeQuickStartLos,
  calculateAlphaStrikeQuickStartModifiers,
  calculateQuickStartModifiers,
  targetMovementModifier,
  totalTargetNumber,
} from '../src/rules.js'

const coreInput = (changes = {}) => ({ ...alphaStrikeCoreDefaults, ...changes })

test('Quick-Start TMM caps at +4 for 10 or more hexes', () => {
  assert.equal(targetMovementModifier(9, 'quick-start'), 3)
  assert.equal(targetMovementModifier(10, 'quick-start'), 4)
  assert.equal(targetMovementModifier(25, 'quick-start'), 4)
})

test('Quick-Start jumping target adds +1 to its movement modifier', () => {
  const modifiers = calculateQuickStartModifiers({
    gunnery: 4, attackerMove: 0, targetHexes: 5, targetJumped: true,
    lightWoods: 0, heavyWoods: 0, targetTerrain: 'clear', pulseLaser: false,
    range: 'short', customModifier: 0,
  })
  assert.equal(modifiers.target, 3)
})

test('Quick-Start pulse laser applies -2', () => {
  const modifiers = calculateQuickStartModifiers({
    gunnery: 4, attackerMove: 0, targetHexes: 0, targetJumped: false,
    lightWoods: 0, heavyWoods: 0, targetTerrain: 'clear', pulseLaser: true,
    range: 'short', customModifier: 0,
  })
  assert.equal(modifiers.pulse, -2)
  assert.equal(totalTargetNumber(modifiers), 2)
})

test('PDF Wolverine worked example produces target number 9', () => {
  const modifiers = calculateQuickStartModifiers({
    gunnery: 4, attackerMove: 2, targetHexes: 2, targetJumped: false,
    lightWoods: 1, heavyWoods: 0, targetTerrain: 'clear', pulseLaser: false,
    range: 'medium', customModifier: 0,
  })
  assert.equal(totalTargetNumber(modifiers), 9)
})

test('PDF Griffin worked example produces target number 8', () => {
  const modifiers = calculateQuickStartModifiers({
    gunnery: 3, attackerMove: 1, targetHexes: 5, targetJumped: false,
    lightWoods: 1, heavyWoods: 0, targetTerrain: 'light', pulseLaser: false,
    range: 'short', customModifier: 0,
  })
  assert.equal(totalTargetNumber(modifiers), 8)
})

test('Alpha Strike Quick-Start worked example produces target number 7', () => {
  const modifiers = calculateAlphaStrikeQuickStartModifiers({
    skill: 3,
    attackerMove: 'ground',
    targetMove: 'jumping',
    targetTmm: 2,
    attackType: 'weapon',
    woods: false,
    partialCover: true,
    heat: 0,
    fireControlHits: 0,
    targetStealth: false,
    distance: 2,
    customModifier: 0,
  })
  assert.equal(totalTargetNumber(modifiers), 7)
})

test('Alpha Strike Quick-Start woods block LOS at six inches', () => {
  const result = calculateAlphaStrikeQuickStartLos({
    distance: 12,
    solidTerrain: 'clear',
    woodsDepth: 'six-plus',
    woodsBeyondTwo: true,
    targetWoods: false,
    targetWater: false,
  })
  assert.equal(result.blocked, true)
})

test('Alpha Strike woods and partial cover each apply once', () => {
  const result = calculateAlphaStrikeQuickStartLos({
    distance: 12,
    solidTerrain: 'partial',
    woodsDepth: 'under-six',
    woodsBeyondTwo: true,
    targetWoods: true,
    targetWater: true,
  })
  assert.equal(result.blocked, false)
  assert.equal(result.terrainModifier, 2)
})

test('Alpha Strike Core large support vehicle example produces target number 8', () => {
  const modifiers = calculateAlphaStrikeCoreModifiers(coreInput({
    skill: 3,
    targetTmm: 2,
    targetClass: 'standard',
    targetLarge: true,
    distance: 26,
  }))
  assert.equal(totalTargetNumber(modifiers), 8)
})

test('Alpha Strike Core jumping mech with partial cover produces target number 6', () => {
  const modifiers = calculateAlphaStrikeCoreModifiers(coreInput({
    skill: 3,
    targetMove: 'jumping',
    targetTmm: 1,
    partialCover: true,
    distance: 2,
  }))
  assert.equal(totalTargetNumber(modifiers), 6)
})

test('Alpha Strike Core infantry ignores attacker movement modifiers', () => {
  const modifiers = calculateAlphaStrikeCoreModifiers(coreInput({
    attackerUnit: 'conventional-infantry',
    attackerMove: 'jumping',
  }))
  assert.equal(modifiers.attacker, 0)
})

test('Alpha Strike Core indirect fire distinguishes an attacking spotter and remote sensor', () => {
  assert.equal(calculateAlphaStrikeCoreModifiers(coreInput({ indirectMode: 'standard' })).indirect, 1)
  assert.equal(calculateAlphaStrikeCoreModifiers(coreInput({ indirectMode: 'spotter-fired' })).indirect, 2)
  assert.equal(calculateAlphaStrikeCoreModifiers(coreInput({ indirectMode: 'remote-sensor' })).indirect, 4)
})

test('Alpha Strike Core underwater and optional extended range brackets are correct', () => {
  assert.deepEqual(alphaStrikeCoreRange(4, false, true), { bracket: 'medium', modifier: 2 })
  assert.deepEqual(alphaStrikeCoreRange(13, false, true), { bracket: 'long', modifier: 4 })
  assert.deepEqual(alphaStrikeCoreRange(50, true, false), { bracket: 'extreme', modifier: 6 })
  assert.deepEqual(alphaStrikeCoreRange(61, true, false), { bracket: 'horizon', modifier: 8 })
  assert.deepEqual(alphaStrikeCoreRange(50, false, false), { bracket: 'beyond', modifier: 0 })
})

test('Alpha Strike Core LOS handles woods, mech-only partial cover, and submerged boundaries', () => {
  const baseLos = alphaStrikeCoreDefaults.los
  assert.equal(calculateAlphaStrikeCoreLos({ ...baseLos, targetClass: 'mech', woodsDepth: 'six-plus' }).blocked, true)
  assert.equal(calculateAlphaStrikeCoreLos({ ...baseLos, targetClass: 'mech', solidTerrain: 'partial' }).partialCover, true)
  assert.equal(calculateAlphaStrikeCoreLos({ ...baseLos, targetClass: 'standard', solidTerrain: 'partial' }).partialCover, false)
  assert.equal(calculateAlphaStrikeCoreLos({ ...baseLos, distance: 0, targetClass: 'mech', attackerWater: 'surface', targetWater: 'submerged' }).blocked, true)
})

test('Alpha Strike Core applies fire-control modifiers to the correct unit types', () => {
  assert.equal(calculateAlphaStrikeCoreModifiers(coreInput({ attackerUnit: 'support-vehicle', fireControl: 'basic' })).fireControl, 1)
  assert.equal(calculateAlphaStrikeCoreModifiers(coreInput({ attackerUnit: 'support-vehicle', fireControl: 'none' })).fireControl, 2)
  assert.equal(calculateAlphaStrikeCoreModifiers(coreInput({ attackerUnit: 'industrial-mech', fireControl: 'none' })).fireControl, 1)
})

test('Alpha Strike Core hull-down replaces partial cover and transported BA affects physical attacks only', () => {
  const hullDown = calculateAlphaStrikeCoreModifiers(coreInput({ targetMove: 'hull-down', partialCover: true }))
  assert.equal(hullDown.terrain, 0)
  assert.equal(hullDown.hullDown, 1)
  assert.equal(calculateAlphaStrikeCoreModifiers(coreInput({ targetTransportingBattleArmor: true })).transportingBattleArmor, 0)
  assert.equal(calculateAlphaStrikeCoreModifiers(coreInput({ attackType: 'standard', targetTransportingBattleArmor: true })).transportingBattleArmor, 3)
})
