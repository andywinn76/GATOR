import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const catalogUrl = new URL('../src/data/coreQuickStartWeapons.json', import.meta.url)
const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'))

test('Core Quick-Start catalog contains all ten unique record-sheet weapons', () => {
  assert.equal(catalog.weapons.length, 10)
  assert.equal(new Set(catalog.weapons.map((weapon) => weapon.id)).size, 10)
})

test('every Core Quick-Start weapon has valid damage and ascending ranges', () => {
  for (const weapon of catalog.weapons) {
    assert.ok(weapon.damage.value > 0, `${weapon.name} needs positive damage`)
    assert.ok(weapon.range.short > 0, `${weapon.name} needs a short range`)
    assert.ok(weapon.range.medium > weapon.range.short, `${weapon.name} ranges must ascend`)
    assert.ok(weapon.range.long > weapon.range.medium, `${weapon.name} ranges must ascend`)
  }
})

test('energy weapons do not use ammo and ammo-fed weapons consume one shot per attack', () => {
  for (const weapon of catalog.weapons) {
    if (weapon.category === 'energy') {
      assert.equal(weapon.ammo, null, `${weapon.name} should not use ammo`)
    } else {
      assert.equal(weapon.ammo.perAttack, 1, `${weapon.name} should consume one ammo shot`)
    }
  }
})
