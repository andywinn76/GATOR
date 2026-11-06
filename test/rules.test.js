import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateAlphaStrikeQuickStartLos,
  calculateAlphaStrikeQuickStartModifiers,
  calculateQuickStartModifiers,
  targetMovementModifier,
  totalTargetNumber,
} from '../src/rules.js'

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
