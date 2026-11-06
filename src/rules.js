export const alphaStrikeQuickStartDefaults = {
  pilotName: '',
  unitName: '',
  skill: 4,
  attackType: 'weapon',
  attackerMove: 'ground',
  targetMove: 'ground',
  targetTmm: 0,
  woods: false,
  partialCover: false,
  heat: 0,
  fireControlHits: 0,
  targetStealth: false,
  firingArc: true,
  distance: 6,
  damageProfile: 'standard',
  customModifier: 0,
  customLabel: '',
  losBlocked: false,
  losLinked: { woods: false, partialCover: false, distance: false },
  los: {
    distance: 6,
    solidTerrain: 'clear',
    woodsDepth: 'none',
    woodsBeyondTwo: true,
    targetWoods: false,
    targetWater: false,
  },
}

export function targetMovementModifier(hexes, ruleset = 'agoac') {
  const distance = Number(hexes)
  if (ruleset === 'quick-start') {
    if (distance >= 10) return 4
    if (distance >= 7) return 3
    if (distance >= 5) return 2
    if (distance >= 3) return 1
    return 0
  }
  if (distance >= 25) return 6
  if (distance >= 18) return 5
  if (distance >= 10) return 4
  if (distance >= 7) return 3
  if (distance >= 5) return 2
  if (distance >= 3) return 1
  return 0
}

export function heatModifier(heat) {
  if (heat >= 24) return 4
  if (heat >= 17) return 3
  if (heat >= 13) return 2
  if (heat >= 8) return 1
  return 0
}

export function hitProbability(target) {
  if (target <= 2) return 100
  if (target > 12) return 0
  const outcomes = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]
  return Math.round((outcomes.slice(target).reduce((sum, value) => sum + value, 0) / 36) * 100)
}

export function calculateQuickStartModifiers(input) {
  const targetMovement = targetMovementModifier(input.targetHexes, 'quick-start') + (input.targetJumped ? 1 : 0)
  const targetWoods = input.targetTerrain === 'light' ? 1 : input.targetTerrain === 'heavy' ? 2 : 0
  const terrain = Number(input.lightWoods) + (Number(input.heavyWoods) * 2) + targetWoods
  const pulse = input.pulseLaser ? -2 : 0
  const range = input.range === 'medium' ? 2 : input.range === 'long' ? 4 : 0
  const other = terrain + pulse + Number(input.customModifier || 0)
  return {
    gunnery: Number(input.gunnery),
    attacker: Number(input.attackerMove),
    target: targetMovement,
    other,
    range,
    targetMovement,
    terrain,
    pulse,
    custom: Number(input.customModifier || 0),
  }
}

export function alphaStrikeRange(distance) {
  const inches = Number(distance)
  if (inches <= 6) return { bracket: 'short', modifier: 0 }
  if (inches <= 24) return { bracket: 'medium', modifier: 2 }
  if (inches <= 42) return { bracket: 'long', modifier: 4 }
  return { bracket: 'beyond', modifier: 0 }
}

export function calculateAlphaStrikeQuickStartLos(input) {
  const adjacent = Number(input.distance) === 0
  const solidBlocked = !adjacent && input.solidTerrain === 'blocked'
  const woodsBlocked = !adjacent && input.woodsDepth === 'six-plus'
  const blocked = solidBlocked || woodsBlocked
  const partialCover = input.solidTerrain === 'partial' || Boolean(input.targetWater)
  const interveningWoods = input.woodsDepth !== 'none' && Boolean(input.woodsBeyondTwo)
  const woodsModifier = interveningWoods || Boolean(input.targetWoods)

  return {
    adjacent,
    blocked,
    reason: solidBlocked
      ? 'Solid terrain leaves less than one-third of the target visible.'
      : woodsBlocked
        ? 'Six inches or more of intervening woods block line of sight.'
        : '',
    partialCover,
    woodsModifier,
    terrainModifier: (partialCover ? 1 : 0) + (woodsModifier ? 1 : 0),
  }
}

export function calculateAlphaStrikeQuickStartModifiers(input) {
  const isWeapon = input.attackType === 'weapon'
  const rangeData = alphaStrikeRange(input.distance)
  const attacker = input.attackerMove === 'standstill' ? -1 : input.attackerMove === 'jumping' ? 2 : 0
  const target = input.targetMove === 'immobile'
    ? -4
    : input.targetMove === 'standstill'
      ? 0
      : Number(input.targetTmm) + (input.targetMove === 'jumping' ? 1 : 0)
  const terrain = input.attackType === 'dfa'
    ? 0
    : (input.woods ? 1 : 0) + (input.partialCover ? 1 : 0)
  const heat = isWeapon ? Number(input.heat) : 0
  const fireControl = isWeapon ? Number(input.fireControlHits) * 2 : 0
  const physical = input.attackType === 'charge' || input.attackType === 'dfa' ? 1 : 0
  const stealth = isWeapon && input.targetStealth
    ? rangeData.bracket === 'medium' ? 1 : rangeData.bracket === 'long' ? 2 : 0
    : 0
  const custom = Number(input.customModifier || 0)
  const other = terrain + heat + fireControl + physical + stealth + custom
  const range = isWeapon ? rangeData.modifier : 0

  return {
    gunnery: Number(input.skill),
    attacker,
    target,
    other,
    range,
    targetMovement: target,
    terrain,
    heat,
    fireControl,
    physical,
    stealth,
    custom,
    rangeBracket: rangeData.bracket,
  }
}

export function totalTargetNumber(modifiers) {
  return modifiers.gunnery + modifiers.attacker + modifiers.target + modifiers.other + modifiers.range
}
