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

export function totalTargetNumber(modifiers) {
  return modifiers.gunnery + modifiers.attacker + modifiers.target + modifiers.other + modifiers.range
}
