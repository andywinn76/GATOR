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
  rearAttack: false,
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

export const alphaStrikeCoreDefaults = {
  pilotName: '',
  unitName: '',
  skill: 4,
  attackerUnit: 'mech',
  attackerMove: 'ground',
  attackType: 'weapon',
  targetMove: 'ground',
  targetTmm: 0,
  targetMovementSpecial: 0,
  targetClass: 'mech',
  targetLarge: false,
  targetTransportingBattleArmor: false,
  targetStealth: false,
  woods: false,
  partialCover: false,
  underwater: false,
  heat: 0,
  fireControlHits: 0,
  fireControl: 'advanced',
  rearWeapon: false,
  shield: false,
  indirectMode: 'none',
  spotterTag: false,
  secondaryTarget: false,
  attackerSpotting: false,
  areaEffect: false,
  airborneArtillery: false,
  artilleryCannon: false,
  distance: 6,
  damageProfile: 'standard',
  firingArc: true,
  physicalSameElevation: true,
  extendedRange: false,
  customModifier: 0,
  customLabel: '',
  losBlocked: false,
  losLinked: { woods: false, partialCover: false, underwater: false, distance: false },
  los: {
    distance: 6,
    solidTerrain: 'clear',
    woodsDepth: 'none',
    woodsBeyondTwo: true,
    targetWoods: false,
    attackerWater: 'surface',
    targetWater: 'surface',
    sameWaterFeature: true,
    torpedoAttack: false,
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

export function alphaStrikeCoreRange(distance, extendedRange = false, underwater = false) {
  const inches = Number(distance)
  const divisor = underwater ? 2 : 1
  if (inches <= 6 / divisor) return { bracket: 'short', modifier: 0 }
  if (inches <= 24 / divisor) return { bracket: 'medium', modifier: 2 }
  if (inches <= 42 / divisor) return { bracket: 'long', modifier: 4 }
  if (extendedRange && inches <= 60 / divisor) return { bracket: 'extreme', modifier: 6 }
  if (extendedRange) return { bracket: 'horizon', modifier: 8 }
  return { bracket: 'beyond', modifier: 0 }
}

export function calculateAlphaStrikeCoreLos(input) {
  const adjacent = Number(input.distance) === 0
  const rangeBlocked = input.attackerUnit !== 'aerospace' && Number(input.distance) > 42 && !input.extendedRange
  const solidBlocked = !adjacent && input.solidTerrain === 'blocked'
  const woodsBlocked = !adjacent && input.woodsDepth === 'six-plus'
  const attackerSubmerged = input.attackerWater === 'submerged'
  const targetSubmerged = input.targetWater === 'submerged'
  const targetPartial = input.targetWater === 'partial'
  const differentWaterBlocked = attackerSubmerged && !input.sameWaterFeature
  const waterBoundaryBlocked = !input.torpedoAttack && (
    (targetSubmerged && !attackerSubmerged)
    || (attackerSubmerged && input.targetWater === 'surface')
  )
  const waterBlocked = differentWaterBlocked || waterBoundaryBlocked
  const blocked = rangeBlocked || solidBlocked || woodsBlocked || waterBlocked
  const targetIsMech = input.targetClass === 'mech'
  const partialCover = targetIsMech && (input.solidTerrain === 'partial' || targetPartial)
  const woodsModifier = input.targetWoods || (input.woodsDepth === 'under-six' && input.woodsBeyondTwo)
  const underwaterModifier = !blocked && (
    (attackerSubmerged && (targetSubmerged || targetPartial))
    || (input.attackerWater === 'surface' && input.torpedoAttack && (targetSubmerged || targetPartial))
  )

  let reason = ''
  if (rangeBlocked) reason = 'Ground-unit line of sight is limited to 42 inches unless the optional extended-range rules are enabled.'
  else if (solidBlocked) reason = 'Solid terrain leaves less than one-third of the target visible.'
  else if (woodsBlocked) reason = 'Six inches or more of intervening woods block line of sight.'
  else if (differentWaterBlocked) reason = 'A completely submerged attacker cannot trace line of sight outside its water feature.'
  else if (waterBoundaryBlocked) reason = 'The water boundary blocks this attack without the TOR special ability.'

  return {
    adjacent,
    blocked,
    reason,
    partialCover,
    woodsModifier,
    underwaterModifier,
    terrainModifier: (partialCover ? 1 : 0) + (woodsModifier ? 1 : 0) + (underwaterModifier ? 1 : 0),
  }
}

export function calculateAlphaStrikeCoreModifiers(input) {
  const physical = ['standard', 'melee', 'charge', 'dfa', 'anti-mech'].includes(input.attackType)
  const artillery = input.attackType === 'direct-artillery' || input.attackType === 'indirect-artillery'
  const weapon = !physical
  const infantryAttacker = input.attackerUnit === 'conventional-infantry' || input.attackerUnit === 'battle-armor'
  const rangeData = alphaStrikeCoreRange(input.distance, input.extendedRange, input.underwater)

  const attacker = infantryAttacker
    ? 0
    : input.attackerMove === 'standstill' || input.attackerMove === 'immobile'
      ? -1
      : input.attackerMove === 'jumping'
        ? 2
        : 0

  const target = input.targetMove === 'immobile'
    ? -4
    : input.targetMove === 'standstill' || input.targetMove === 'hull-down'
      ? 0
      : input.targetMove === 'dropped'
        ? 3
        : Number(input.targetTmm) + (
          input.targetMove === 'jumping' || input.targetMove === 'submersible'
            ? Number(input.targetMovementSpecial || 0) + (input.targetMove === 'jumping' ? 1 : 0)
            : 0
        )

  const partialCover = input.targetMove === 'hull-down' ? 0 : (input.partialCover ? 1 : 0)
  const terrain = input.attackType === 'dfa'
    ? 0
    : (input.woods ? 1 : 0) + partialCover + (input.underwater ? 1 : 0)
  const areaEffect = input.areaEffect || artillery ? 1 : 0
  const indirect = input.attackType === 'indirect-artillery'
    ? (input.indirectMode === 'spotter-fired' ? 2 : input.indirectMode === 'remote-sensor' ? 4 : 1)
    : input.attackType === 'weapon' && input.indirectMode === 'standard'
      ? 1
      : input.attackType === 'weapon' && input.indirectMode === 'spotter-fired'
        ? 2
        : input.attackType === 'weapon' && input.indirectMode === 'remote-sensor'
          ? 4
          : 0
  const tag = input.attackType === 'indirect-artillery' && input.spotterTag ? -1 : 0
  const tactical = (weapon && input.secondaryTarget ? 1 : 0) + (input.attackerSpotting ? 1 : 0) + (weapon && input.rearWeapon ? 1 : 0)

  let fireControl = 0
  if (weapon && input.attackerUnit === 'industrial-mech' && input.fireControl !== 'advanced') fireControl = 1
  if (weapon && input.attackerUnit === 'support-vehicle') {
    if (input.fireControl === 'basic') fireControl = 1
    if (input.fireControl === 'none') fireControl = 2
  }
  const groundedDropShip = weapon && input.attackerUnit === 'grounded-dropship' ? -1 : 0
  const shield = weapon && input.shield ? 1 : 0
  const damageEffects = weapon ? (Number(input.fireControlHits) * 2) + Number(input.heat) : 0
  const artilleryAirborne = artillery && input.airborneArtillery ? 1 : 0
  const physicalType = input.attackType === 'charge' || input.attackType === 'dfa' || input.attackType === 'anti-mech' ? 1 : 0
  const conventionalInfantry = input.attackType === 'anti-mech' && input.attackerUnit === 'conventional-infantry' ? 3 : 0

  const targetClass = ({
    standard: 0,
    'battle-armor': 1,
    protomech: 1,
    'airborne-vtol': 1,
    'airborne-aerospace': 2,
    'airborne-dropship': -2,
  })[input.targetClass] || 0
  const targetLarge = input.targetLarge ? -1 : 0
  const transportingBattleArmor = physical && input.targetTransportingBattleArmor ? 3 : 0
  const hullDown = input.targetMove === 'hull-down' && !input.rearAttack ? 1 : 0
  const stealth = weapon && input.targetStealth
    ? input.targetClass === 'battle-armor'
      ? rangeData.bracket === 'short' || rangeData.bracket === 'medium' ? 1 : 2
      : rangeData.bracket === 'medium' ? 1 : ['long', 'extreme', 'horizon'].includes(rangeData.bracket) ? 2 : 0
    : 0
  const custom = Number(input.customModifier || 0)

  const other = terrain + areaEffect + indirect + tag + tactical + fireControl + groundedDropShip + shield
    + damageEffects + artilleryAirborne + physicalType + conventionalInfantry + targetClass + targetLarge
    + transportingBattleArmor + hullDown + stealth + custom

  let range = physical ? 0 : rangeData.modifier
  if (artillery && !input.artilleryCannon && Number(input.distance) <= (input.underwater ? 21 : 42)) range = Math.max(4, range)

  return {
    gunnery: Number(input.skill), attacker, target, other, range,
    terrain, areaEffect, indirect, tag, tactical, fireControl, groundedDropShip, shield,
    damageEffects, artilleryAirborne, physicalType, conventionalInfantry, targetClass,
    targetLarge, transportingBattleArmor, hullDown, stealth, custom,
    rangeBracket: rangeData.bracket,
  }
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
