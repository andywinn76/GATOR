import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateQuickStartModifiers, heatModifier, hitProbability, targetMovementModifier, totalTargetNumber } from './rules.js'

const STORAGE_KEY = 'gator-battletech-v1'

const RULESETS = [
  { id: 'agoac', short: 'Core', name: 'Core Rules', banner: 'Core Rules fire control' },
  { id: 'quick-start', short: 'QS', name: 'Quick-Start', banner: 'Quick-Start fire control' },
  { id: 'alpha-strike', short: 'AS', name: 'Alpha Strike Core', banner: 'Alpha Strike Core fire control' },
  { id: 'alpha-strike-quick-start', short: 'ASQ', name: 'Alpha Strike Quick-Start', banner: 'Alpha Strike Quick-Start fire control' },
]

const initialState = {
  ruleset: 'agoac',
  pilotName: '', mechName: '', gunnery: 4,
  attackerMove: 0, attackerProne: false, sensorHits: 0, armDamage: 0, heat: 0,
  targetHexes: 0, targetJumped: false, targetState: 'normal',
  lightWoods: 0, heavyWoods: 0, partialCover: false, depthOneWater: false,
  targetType: 'primary', indirect: 'none', range: 'short', minimumRange: 0, distance: 1,
  customModifier: 0, customLabel: '',
  losLinked: { lightWoods: false, heavyWoods: false, partialCover: false, depthOneWater: false },
  losBlocked: false,
  losActive: false,
  los: {
    distance: 1,
    attackerLevel: 0, attackerPosture: 'standing', attackerTerrain: 'clear',
    targetLevel: 0, targetPosture: 'standing', targetTerrain: 'clear',
    path: [],
  },
  quickStart: {
    pilotName: '', mechName: '', gunnery: 4,
    attackerMove: 0, targetHexes: 0, targetJumped: false,
    pulseLaser: false, lightWoods: 0, heavyWoods: 0, targetTerrain: 'clear',
    range: 'short', customModifier: 0, customLabel: '',
    losBlocked: false, losActive: false,
    losLinked: { lightWoods: false, heavyWoods: false, targetTerrain: false },
    los: { distance: 1, targetTerrain: 'clear', path: [] },
  },
}

const attackerMoves = [
  ['Stationary', 0], ['Walked', 1], ['Ran', 2], ['Jumped', 3],
]

function Toggle({ checked, onChange, label, detail, badge }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${checked ? 'border-acid/45 bg-acid/[.07]' : 'border-line bg-[#0c110f] hover:border-[#3d4944]'}`}>
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${checked ? 'border-acid bg-acid text-ink' : 'border-[#4b5752]'}`}>
        {checked && <span className="text-xs font-black">✓</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white">{label}</span>
        {detail && <span className="mt-0.5 block text-[11px] leading-4 text-mist">{detail}</span>}
      </span>
      {badge && <span className="font-mono text-xs font-semibold text-acid">{badge}</span>}
    </button>
  )
}

function Stepper({ label, value, onChange, min = 0, max = 99, suffix = '', hint, ariaLabel }) {
  const accessibleLabel = ariaLabel || (typeof label === 'string' ? label : 'Value')
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <label className="text-xs font-medium text-[#c7cfcb]">{label}</label>
        {hint && <span className="text-[10px] text-mist">{hint}</span>}
      </div>
      <div className="flex gap-2">
        <button className="stepper-button" onClick={() => onChange(Math.max(min, Number(value) - 1))} aria-label={`Decrease ${accessibleLabel}`}>−</button>
        <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-line bg-[#0c110f] font-mono text-sm font-semibold text-white">
          {value}{suffix}
        </div>
        <button className="stepper-button" onClick={() => onChange(Math.min(max, Number(value) + 1))} aria-label={`Increase ${accessibleLabel}`}>+</button>
      </div>
    </div>
  )
}

function Section({ code, title, subtitle, total, children }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-acid font-display text-lg font-bold text-ink">{code}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-white">{title}</h2>
          <p className="truncate text-[11px] text-mist">{subtitle}</p>
        </div>
        <span className={`font-mono text-sm font-semibold ${total === 0 ? 'text-mist' : 'text-acid'}`}>{total >= 0 ? '+' : ''}{total}</span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  )
}

function BreakdownRow({ label, value, base = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className={base ? 'text-white' : 'text-mist'}>{label}</span>
      <span className={`font-mono font-semibold ${base ? 'text-white' : value ? 'text-acid' : 'text-[#64706a]'}`}>{base ? value : `${value >= 0 ? '+' : ''}${value}`}</span>
    </div>
  )
}

const levelOptions = Array.from({ length: 11 }, (_, index) => index - 2)

const levelLabel = (level) => {
  if (Number(level) === -2) return '−2 · Depth 2 water'
  if (Number(level) === -1) return '−1 · Depth 1 water'
  return `${Number(level) > 0 ? '+' : ''}${level} · Level ${level}`
}

const terrainLabel = (terrain) => ({ clear: 'Clear', light: 'Light woods', heavy: 'Heavy woods', building: 'Building' }[terrain])

function calculateLos(los) {
  const attackerLevel = Number(los.attackerLevel)
  const targetLevel = Number(los.targetLevel)
  const attackerLos = attackerLevel + (los.attackerPosture === 'prone' ? 1 : 2)
  const targetLos = targetLevel + (los.targetPosture === 'prone' ? 1 : 2)
  const attackerSubmerged = attackerLevel <= -2
  const targetSubmerged = targetLevel <= -2
  let blocked = attackerSubmerged !== targetSubmerged
  let reason = blocked ? 'Water surface blocks LOS between submerged and surface units.' : ''
  let lightWoods = 0
  let heavyWoods = 0

  los.path.forEach((hex, index) => {
    const ground = Number(hex.level)
    const adjacentAttacker = index === 0
    const adjacentTarget = index === los.path.length - 1
    const intervenes = (height) => (
      (height >= attackerLos && height >= targetLos)
      || (adjacentAttacker && height >= attackerLos)
      || (adjacentTarget && height >= targetLos)
    )

    if (!blocked && intervenes(ground)) {
      blocked = true
      reason = `Hill at path hex ${index + 1} blocks LOS.`
      return
    }

    if (hex.terrain === 'building') {
      const buildingTop = ground + Number(hex.buildingHeight || 1)
      if (!blocked && intervenes(buildingTop)) {
        blocked = true
        reason = `Building at path hex ${index + 1} blocks LOS.`
      }
      return
    }

    if (hex.terrain === 'light' || hex.terrain === 'heavy') {
      const treeTop = ground + 2
      if (intervenes(treeTop)) {
        if (hex.terrain === 'light') lightWoods += 1
        if (hex.terrain === 'heavy') heavyWoods += 1
      }
    }
  })

  const woodsValue = lightWoods + (heavyWoods * 2)
  if (!blocked && woodsValue > 2) {
    blocked = true
    reason = 'Intervening woods modifiers exceed +2 and block LOS.'
  }

  const targetWoods = los.targetTerrain === 'light' ? 1 : los.targetTerrain === 'heavy' ? 2 : 0
  const lastHex = los.path.at(-1)
  const lastHeight = lastHex
    ? Number(lastHex.level) + (lastHex.terrain === 'building' ? Number(lastHex.buildingHeight || 1) : 0)
    : null
  const waterCover = targetLevel === -1 && los.targetPosture === 'standing'
  const terrainCover = Boolean(
    lastHex
    && los.targetPosture === 'standing'
    && lastHeight === targetLevel + 1
    && attackerLos <= targetLos,
  )
  const partialCover = waterCover || terrainCover

  return {
    blocked,
    reason,
    attackerLos,
    targetLos,
    lightWoods,
    heavyWoods,
    targetWoods,
    totalTerrainModifier: blocked ? null : woodsValue + targetWoods + (partialCover ? 1 : 0),
    partialCover,
    waterCover,
  }
}

function LinkedBadge({ active }) {
  return active ? <span className="ml-1.5 rounded border border-[#5d8f93]/35 bg-[#5d8f93]/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[#8fc2c5]">LOS</span> : null
}

function EndpointCard({ title, level, posture, terrain, onChange, tone }) {
  const underwater = Number(level) < 0
  const toneClass = tone === 'attacker'
    ? '!border-[#315343] !bg-[#101d17]'
    : '!border-[#593633] !bg-[#201313]'
  return (
    <div className={`panel p-4 sm:p-5 ${toneClass}`}>
      <p className="eyebrow">{title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <div><label className="field-label">Level / depth</label><select className="select" value={level} onChange={(e) => onChange('level', Number(e.target.value))}>{levelOptions.map((item) => <option key={item} value={item}>{levelLabel(item)}</option>)}</select></div>
        <div><label className="field-label">Posture</label><select className="select" value={posture} onChange={(e) => onChange('posture', e.target.value)}><option value="standing">Standing</option><option value="prone">Prone</option></select></div>
        <div><label className="field-label">Occupied terrain</label><select className="select" value={underwater ? 'clear' : terrain} disabled={underwater} onChange={(e) => onChange('terrain', e.target.value)}><option value="clear">{underwater ? 'Water' : 'Clear'}</option><option value="light">Light woods</option><option value="heavy">Heavy woods</option></select></div>
      </div>
    </div>
  )
}

function LosView({ los, result, updateLos, updateEndpoint, updatePathHex, resetLos }) {
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:py-8">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="mb-6">
          <p className="eyebrow">A Game of Armored Combat // Line of sight</p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase leading-[.95] tracking-tight text-white sm:text-5xl">Trace the line.<br/><span className="text-acid">Know the shot.</span></h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">Enter the chosen center-to-center path. Clear Level 0 is the default, so only unusual hexes need attention.</p>
        </div>

        <div className="panel p-4 sm:p-5">
          <Stepper label="Distance to target" value={los.distance} min={1} max={30} suffix={Number(los.distance) === 1 ? ' hex' : ' hexes'} hint={`${Math.max(0, los.distance - 1)} intervening`} onChange={(value) => updateLos('distance', value)} />
          <p className="mt-3 text-[11px] leading-4 text-mist">Distance is informational in this version. Select the weapon’s range bracket manually in the Targeting Computer.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <EndpointCard title="Attacker hex" tone="attacker" level={los.attackerLevel} posture={los.attackerPosture} terrain={los.attackerTerrain} onChange={(key, value) => updateEndpoint('attacker', key, value)} />
          <EndpointCard title="Target hex" tone="target" level={los.targetLevel} posture={los.targetPosture} terrain={los.targetTerrain} onChange={(key, value) => updateEndpoint('target', key, value)} />
        </div>

        <section className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Chosen path</p><h2 className="mt-1 font-display text-xl font-semibold uppercase tracking-wide">Intervening hexes</h2></div><span className="font-mono text-xs text-mist">{los.path.length}</span></div>
          </div>
          <div className="p-4 sm:p-5">
            {los.path.length === 0 ? <p className="rounded-xl border border-acid/20 bg-acid/[.05] px-4 py-4 text-sm text-[#cfd9d4]">Adjacent units have no intervening hexes.</p> : (
              <div className="grid gap-3 md:grid-cols-2">
                {los.path.map((hex, index) => (
                  <div key={index} className={`rounded-xl border p-3 ${index % 2 === 0 ? 'bg-[#0c110f]' : 'bg-[#171c1a]'} ${hex.terrain === 'clear' && Number(hex.level) === 0 ? 'border-line' : 'border-[#5d8f93]/50 ring-1 ring-inset ring-[#5d8f93]/10'}`}>
                    <div className="mb-2 flex items-center justify-between"><span className="font-display text-sm font-bold uppercase tracking-wider text-white">Hex {index + 1}</span><span className="font-mono text-[9px] uppercase text-mist">{terrainLabel(hex.terrain)} · {levelLabel(hex.level).split(' · ')[0]}</span></div>
                    <div className="grid grid-cols-2 gap-2">
                      <select aria-label={`Hex ${index + 1} level`} className="select" value={hex.level} onChange={(e) => updatePathHex(index, 'level', Number(e.target.value))}>{levelOptions.map((item) => <option key={item} value={item}>{levelLabel(item)}</option>)}</select>
                      <select aria-label={`Hex ${index + 1} terrain`} className="select" value={hex.terrain} onChange={(e) => updatePathHex(index, 'terrain', e.target.value)}><option value="clear">Clear</option><option value="light">Light woods</option><option value="heavy">Heavy woods</option><option value="building">Building</option></select>
                    </div>
                    {hex.terrain === 'building' && <div className="mt-2"><label className="field-label">Building height</label><select className="select" value={hex.buildingHeight || 1} onChange={(e) => updatePathHex(index, 'buildingHeight', Number(e.target.value))}>{[1,2,3,4,5,6].map((height) => <option key={height} value={height}>{height} level{height === 1 ? '' : 's'}</option>)}</select></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={`panel overflow-hidden ${result.blocked ? 'border-ember/35 shadow-[0_0_36px_rgba(255,122,69,.12)]' : 'border-acid/30 shadow-glow'}`}>
          <div className="p-5 text-center sm:p-6">
            <p className="eyebrow">LOS solution</p>
            <div className={`mt-2 font-display text-5xl font-bold uppercase tracking-tight ${result.blocked ? 'text-ember drop-shadow-[0_0_14px_rgba(255,122,69,.4)]' : 'text-acid drop-shadow-[0_0_14px_rgba(214,255,56,.25)]'}`}>{result.blocked ? 'Blocked' : 'Clear'}</div>
            <p className="mx-auto mt-3 max-w-lg text-xs leading-5 text-mist">{result.blocked ? result.reason : 'Valid line of sight. Terrain data is linked to the Targeting Computer.'}</p>
            {!result.blocked && <div className="mx-auto mt-4 max-w-sm rounded-xl border border-[#5d8f93]/25 bg-[#5d8f93]/[.07] px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-[#8fc2c5]">Synced to targeting · +{result.totalTerrainModifier}</div>}
          </div>
        </section>
      </div>

      <aside id="los-solution" className="order-1 scroll-mt-4 lg:order-2 lg:sticky lg:top-5">
        <div className={`panel overflow-hidden ${result.blocked ? 'border-ember/35 shadow-[0_0_42px_rgba(255,122,69,.16)]' : 'border-acid/30 shadow-glow'}`}>
          <div className="border-b border-line bg-[#0c110f] px-5 py-4"><p className="eyebrow">LOS solution</p></div>
          <div className="p-5 text-center sm:p-6">
            <div className={`font-display text-5xl font-bold uppercase tracking-tight ${result.blocked ? 'text-ember drop-shadow-[0_0_14px_rgba(255,122,69,.4)]' : 'text-acid drop-shadow-[0_0_14px_rgba(214,255,56,.25)]'}`}>{result.blocked ? 'Blocked' : 'Clear'}</div>
            <p className="mx-auto mt-3 max-w-xs text-xs leading-5 text-mist">{result.blocked ? result.reason : 'Valid line of sight. Terrain data is linked to the Targeting Computer.'}</p>
            <div className="mt-5 divide-y divide-line border-y border-line py-2 text-left">
              <BreakdownRow label="Attacker LOS level" value={result.attackerLos} base />
              <BreakdownRow label="Target LOS level" value={result.targetLos} base />
              <BreakdownRow label="Intervening light woods" value={result.lightWoods} />
              <BreakdownRow label="Intervening heavy woods" value={result.heavyWoods} />
              <BreakdownRow label="Target woods" value={result.targetWoods} />
              <BreakdownRow label="Partial cover" value={result.partialCover ? 1 : 0} />
            </div>
            {!result.blocked && <div className="mt-4 rounded-xl border border-[#5d8f93]/25 bg-[#5d8f93]/[.07] px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-[#8fc2c5]">Synced to targeting · +{result.totalTerrainModifier}</div>}
            <button onClick={resetLos} className="mt-4 h-11 w-full rounded-xl border border-line bg-[#0c110f] font-display text-xs font-bold uppercase tracking-[.14em] text-mist transition hover:border-acid/40 hover:text-white">Reset LOS</button>
          </div>
        </div>
      </aside>
    </main>
  )
}

function calculateQuickStartLos(los) {
  const lightWoods = los.path.filter((hex) => hex.terrain === 'light').length
  const heavyWoods = los.path.filter((hex) => hex.terrain === 'heavy').length
  const woodsPoints = lightWoods + (heavyWoods * 2)
  const targetWoods = los.targetTerrain === 'light' ? 1 : los.targetTerrain === 'heavy' ? 2 : 0
  return {
    blocked: woodsPoints > 2,
    reason: woodsPoints > 2 ? 'Three or more points of intervening woods block LOS.' : '',
    lightWoods,
    heavyWoods,
    targetTerrain: los.targetTerrain,
    targetWoods,
    woodsPoints,
    totalTerrainModifier: woodsPoints + targetWoods,
  }
}

function QuickStartLosView({ data, result, updateDistance, updateTargetTerrain, updatePathHex, resetLos }) {
  const los = data.los
  const status = (
    <div className="p-5 text-center sm:p-6">
      <p className="eyebrow">Quick-Start LOS solution</p>
      <div className={`mt-2 font-display text-5xl font-bold uppercase tracking-tight ${result.blocked ? 'text-ember drop-shadow-[0_0_14px_rgba(255,122,69,.4)]' : 'text-acid drop-shadow-[0_0_14px_rgba(214,255,56,.25)]'}`}>{result.blocked ? 'Blocked' : 'Clear'}</div>
      <p className="mx-auto mt-3 max-w-lg text-xs leading-5 text-mist">{result.blocked ? result.reason : 'Valid line of sight. Woods data is linked to the Quick-Start Targeting Computer.'}</p>
      {!result.blocked && <div className="mx-auto mt-4 max-w-sm rounded-xl border border-[#5d8f93]/25 bg-[#5d8f93]/[.07] px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-[#8fc2c5]">Synced to targeting · +{result.totalTerrainModifier}</div>}
    </div>
  )

  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:py-8">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="mb-6">
          <p className="eyebrow">Quick-Start Rules // Line of sight</p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase leading-[.95] tracking-tight text-white sm:text-5xl">Trace the woods.<br/><span className="text-acid">Know the shot.</span></h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">Quick-Start LOS only counts intervening woods. Clear is the default, and other ’Mechs never affect LOS.</p>
        </div>

        <div className="panel p-4 sm:p-5">
          <Stepper label="Distance to target" value={los.distance} min={1} max={30} suffix={Number(los.distance) === 1 ? ' hex' : ' hexes'} hint={`${Math.max(0, los.distance - 1)} intervening`} onChange={updateDistance} />
          <p className="mt-3 text-[11px] leading-4 text-mist">Distance helps build the chosen path. Select the weapon’s range bracket manually in Targeting.</p>
        </div>

        <div className="panel !border-[#593633] !bg-[#201313] p-4 sm:p-5">
          <p className="eyebrow">Target hex</p>
          <div className="mt-3"><label className="field-label">Occupied terrain</label><select className="select" value={los.targetTerrain} onChange={(event) => updateTargetTerrain(event.target.value)}><option value="clear">Clear</option><option value="light">Light woods (+1)</option><option value="heavy">Heavy woods (+2)</option></select></div>
          <p className="mt-3 text-[11px] leading-4 text-mist">Woods in the target hex modify the attack but never count as intervening woods.</p>
        </div>

        <section className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Chosen path</p><h2 className="mt-1 font-display text-xl font-semibold uppercase tracking-wide">Intervening hexes</h2><p className="mt-1 text-[10px] leading-4 text-mist">(Woods on the target hex never block line of sight.)</p></div><span className="mt-1 font-mono text-xs text-mist">{los.path.length}</span></div>
          </div>
          <div className="p-4 sm:p-5">
            {los.path.length === 0 ? <p className="rounded-xl border border-acid/20 bg-acid/[.05] px-4 py-4 text-sm text-[#cfd9d4]">Adjacent units have no intervening hexes.</p> : (
              <div className="grid gap-3 md:grid-cols-2">
                {los.path.map((hex, index) => (
                  <div key={index} className={`rounded-xl border p-3 ${index % 2 === 0 ? 'bg-[#0c110f]' : 'bg-[#171c1a]'} ${hex.terrain === 'clear' ? 'border-line' : 'border-[#5d8f93]/50 ring-1 ring-inset ring-[#5d8f93]/10'}`}>
                    <div className="mb-2 flex items-center justify-between"><span className="font-display text-sm font-bold uppercase tracking-wider text-white">Hex {index + 1}</span><span className="font-mono text-[9px] uppercase text-mist">{terrainLabel(hex.terrain)}</span></div>
                    <select aria-label={`Hex ${index + 1} terrain`} className="select" value={hex.terrain} onChange={(event) => updatePathHex(index, event.target.value)}><option value="clear">Clear</option><option value="light">Light woods (+1)</option><option value="heavy">Heavy woods (+2)</option></select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={`panel overflow-hidden ${result.blocked ? 'border-ember/35 shadow-[0_0_36px_rgba(255,122,69,.12)]' : 'border-acid/30 shadow-glow'}`}>{status}</section>
      </div>

      <aside id="los-solution" className="order-1 scroll-mt-4 lg:order-2 lg:sticky lg:top-5">
        <div className={`panel overflow-hidden ${result.blocked ? 'border-ember/35 shadow-[0_0_42px_rgba(255,122,69,.16)]' : 'border-acid/30 shadow-glow'}`}>
          {status}
          <div className="mx-5 divide-y divide-line border-y border-line py-2 text-left">
            <BreakdownRow label="Intervening light woods" value={result.lightWoods} />
            <BreakdownRow label="Intervening heavy woods" value={result.heavyWoods} />
            <BreakdownRow label="Target woods" value={result.targetWoods} />
          </div>
          <div className="p-5 pt-4"><button onClick={resetLos} className="h-11 w-full rounded-xl border border-line bg-[#0c110f] font-display text-xs font-bold uppercase tracking-[.14em] text-mist transition hover:border-acid/40 hover:text-white">Reset LOS</button></div>
        </div>
      </aside>
    </main>
  )
}

function RulesetSelector({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Rules mode" className="relative grid h-9 w-[128px] shrink-0 grid-cols-4 gap-[2px] overflow-hidden rounded-md border border-[#555d58] bg-[linear-gradient(180deg,#252b28_0%,#111512_48%,#080b09_100%)] p-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,.12),inset_0_-2px_4px_rgba(0,0,0,.65),0_3px_10px_rgba(0,0,0,.3)] sm:w-[164px]">
      {RULESETS.map((ruleset) => {
        const active = value === ruleset.id
        return (
          <button
            key={ruleset.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={ruleset.name}
            title={ruleset.name}
            onClick={() => onChange(ruleset.id)}
            className={`relative z-10 rounded-[3px] border font-mono text-[7px] font-bold uppercase leading-none outline-none transition sm:text-[8px] ${active ? 'border-[#7d887f] bg-[linear-gradient(180deg,#69736d_0%,#353c38_48%,#1c211e_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_2px_5px_rgba(0,0,0,.6)]' : 'border-transparent text-[#707b75] hover:text-[#a9b2ad] focus-visible:border-acid/70'}`}
          >
            {ruleset.short}
          </button>
        )
      })}
      <span className="absolute left-1 top-1 h-1 w-1 rounded-full bg-[#090b0a] shadow-[inset_0_0_0_1px_#7a837e]" aria-hidden="true" />
      <span className="absolute bottom-1 right-1 h-1 w-1 rounded-full bg-[#090b0a] shadow-[inset_0_0_0_1px_#7a837e]" aria-hidden="true" />
    </div>
  )
}

function AlphaStrikePlaceholder({ ruleset }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="panel relative overflow-hidden p-6 text-center sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(214,255,56,.09),transparent_55%)]" />
        <div className="relative">
          <p className="eyebrow">Reserved rules module</p>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-6xl">{ruleset.name}</h1>
          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-md border border-acid/25 bg-acid/[.06] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-acid">
            <span className="h-1.5 w-1.5 rounded-full bg-acid shadow-[0_0_10px_#d6ff38]" />
            Coming soon
          </div>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-mist">This mode is ready for its own Alpha Strike calculator. Until those rules are implemented, Classic BattleTech controls stay hidden to prevent mixing systems.</p>
        </div>
      </section>
    </main>
  )
}

function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
      return {
        ...initialState,
        ...saved,
        los: { ...initialState.los, ...(saved.los || {}), path: Array.isArray(saved.los?.path) ? saved.los.path : [] },
        losLinked: { ...initialState.losLinked, ...(saved.losLinked || {}) },
        quickStart: {
          ...initialState.quickStart,
          ...(saved.quickStart || {}),
          los: {
            ...initialState.quickStart.los,
            ...(saved.quickStart?.los || {}),
            path: Array.isArray(saved.quickStart?.los?.path) ? saved.quickStart.los.path : [],
          },
          losLinked: { ...initialState.quickStart.losLinked, ...(saved.quickStart?.losLinked || {}) },
        },
      }
    } catch { return initialState }
  })
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [activeView, setActiveView] = useState('targeting')
  const touchStart = useRef(null)
  const activeRuleset = RULESETS.find((ruleset) => ruleset.id === state.ruleset) || RULESETS[0]
  const isQuickStart = state.ruleset === 'quick-start'
  const isAlphaStrike = state.ruleset.startsWith('alpha-strike')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }, [state])

  const set = (key, value) => setState((current) => ({
    ...current,
    [key]: value,
    losLinked: Object.hasOwn(current.losLinked, key) ? { ...current.losLinked, [key]: false } : current.losLinked,
  }))

  const setQuick = (key, value) => setState((current) => ({
    ...current,
    quickStart: {
      ...current.quickStart,
      [key]: value,
      losLinked: Object.hasOwn(current.quickStart.losLinked, key)
        ? { ...current.quickStart.losLinked, [key]: false }
        : current.quickStart.losLinked,
    },
  }))

  const losResult = useMemo(() => calculateLos(state.los), [state.los])
  const quickLosResult = useMemo(() => calculateQuickStartLos(state.quickStart.los), [state.quickStart.los])

  useEffect(() => {
    if (!state.losActive) return
    const lightWoods = losResult.lightWoods + (state.los.targetTerrain === 'light' ? 1 : 0)
    const heavyWoods = losResult.heavyWoods + (state.los.targetTerrain === 'heavy' ? 1 : 0)
    const depthOneWater = losResult.waterCover
    const partialCover = losResult.partialCover && !depthOneWater
    setState((current) => {
      if (
        current.lightWoods === lightWoods
        && current.heavyWoods === heavyWoods
        && current.depthOneWater === depthOneWater
        && current.partialCover === partialCover
        && current.losBlocked === losResult.blocked
        && Object.values(current.losLinked).every(Boolean)
      ) return current
      return {
        ...current,
        lightWoods,
        heavyWoods,
        depthOneWater,
        partialCover,
        losBlocked: losResult.blocked,
        losLinked: { lightWoods: true, heavyWoods: true, partialCover: true, depthOneWater: true },
      }
    })
  }, [losResult.blocked, losResult.heavyWoods, losResult.lightWoods, losResult.partialCover, losResult.waterCover, state.los.targetTerrain, state.losActive])

  useEffect(() => {
    if (!state.quickStart.losActive) return
    setState((current) => {
      const quick = current.quickStart
      if (
        quick.lightWoods === quickLosResult.lightWoods
        && quick.heavyWoods === quickLosResult.heavyWoods
        && quick.targetTerrain === quickLosResult.targetTerrain
        && quick.losBlocked === quickLosResult.blocked
        && Object.values(quick.losLinked).every(Boolean)
      ) return current
      return {
        ...current,
        quickStart: {
          ...quick,
          lightWoods: quickLosResult.lightWoods,
          heavyWoods: quickLosResult.heavyWoods,
          targetTerrain: quickLosResult.targetTerrain,
          losBlocked: quickLosResult.blocked,
          losLinked: { lightWoods: true, heavyWoods: true, targetTerrain: true },
        },
      }
    })
  }, [quickLosResult.blocked, quickLosResult.heavyWoods, quickLosResult.lightWoods, quickLosResult.targetTerrain, state.quickStart.losActive])

  const updateLos = (key, value) => setState((current) => {
    if (key !== 'distance') return { ...current, losActive: true, los: { ...current.los, [key]: value } }
    const pathLength = Math.max(0, Number(value) - 1)
    const path = Array.from({ length: pathLength }, (_, index) => current.los.path[index] || { level: 0, terrain: 'clear', buildingHeight: 1 })
    return { ...current, losActive: true, los: { ...current.los, distance: value, path } }
  })

  const updateEndpoint = (endpoint, key, value) => setState((current) => {
    const prefix = endpoint === 'attacker' ? 'attacker' : 'target'
    const nextLos = { ...current.los, [`${prefix}${key[0].toUpperCase()}${key.slice(1)}`]: value }
    if (key === 'level' && Number(value) < 0) nextLos[`${prefix}Terrain`] = 'clear'
    return { ...current, losActive: true, los: nextLos }
  })

  const updatePathHex = (index, key, value) => setState((current) => ({
    ...current,
    losActive: true,
    los: { ...current.los, path: current.los.path.map((hex, hexIndex) => hexIndex === index ? { ...hex, [key]: value } : hex) },
  }))

  const resetLos = () => setState((current) => ({ ...current, los: initialState.los, losActive: true, losBlocked: false }))

  const updateQuickLosDistance = (value) => setState((current) => {
    const pathLength = Math.max(0, Number(value) - 1)
    const path = Array.from({ length: pathLength }, (_, index) => current.quickStart.los.path[index] || { terrain: 'clear' })
    return {
      ...current,
      quickStart: { ...current.quickStart, losActive: true, los: { ...current.quickStart.los, distance: value, path } },
    }
  })

  const updateQuickTargetTerrain = (value) => setState((current) => ({
    ...current,
    quickStart: { ...current.quickStart, losActive: true, los: { ...current.quickStart.los, targetTerrain: value } },
  }))

  const updateQuickPathHex = (index, terrain) => setState((current) => ({
    ...current,
    quickStart: {
      ...current.quickStart,
      losActive: true,
      los: { ...current.quickStart.los, path: current.quickStart.los.path.map((hex, hexIndex) => hexIndex === index ? { ...hex, terrain } : hex) },
    },
  }))

  const resetQuickLos = () => setState((current) => ({
    ...current,
    quickStart: { ...current.quickStart, los: initialState.quickStart.los, losActive: true, losBlocked: false },
  }))

  const handleTouchEnd = (event) => {
    if (touchStart.current === null) return
    const delta = event.changedTouches[0].clientX - touchStart.current
    if (delta < -70) setActiveView('targeting')
    if (delta > 70) setActiveView('los')
    touchStart.current = null
  }

  const mods = useMemo(() => {
    if (state.ruleset === 'quick-start') return calculateQuickStartModifiers(state.quickStart)
    const gunnery = Number(state.gunnery)
    const attacker = Number(state.attackerMove) + (state.attackerProne ? 2 : 0) + (Number(state.sensorHits) * 2) + Number(state.armDamage) + heatModifier(Number(state.heat))
    const targetMovement = state.targetState === 'immobile' ? 0 : targetMovementModifier(Number(state.targetHexes)) + (state.targetJumped ? 1 : 0)
    const targetCondition = state.targetState === 'immobile' ? -4 : state.targetState === 'prone-adjacent' ? -2 : state.targetState === 'prone-distant' ? 1 : 0
    const target = targetMovement + targetCondition
    const terrain = Number(state.lightWoods) + Number(state.heavyWoods) * 2 + (state.partialCover ? 1 : 0) + (state.depthOneWater ? 1 : 0)
    const tactical = state.targetType === 'secondary-front' ? 1 : state.targetType === 'secondary-side' ? 2 : 0
    const indirect = state.indirect === 'standard' ? 1 : state.indirect === 'spotter-fired' ? 2 : 0
    const other = terrain + tactical + indirect + Number(state.customModifier)
    const rangeBase = state.range === 'medium' ? 2 : state.range === 'long' ? 4 : 0
    const minimum = state.range === 'minimum' ? Math.max(0, Number(state.minimumRange) - Number(state.distance) + 1) : 0
    const range = rangeBase + minimum
    return { gunnery, attacker, target, other, range, targetMovement, targetCondition, terrain, tactical, indirect, minimum }
  }, [state])

  const targetNumber = totalTargetNumber(mods)
  const probability = hitProbability(targetNumber)
  const impossible = targetNumber > 12
  const auto = targetNumber <= 2
  const quickStartWoodsBlocked = Number(state.quickStart.lightWoods) + (Number(state.quickStart.heavyWoods) * 2) > 2
  const noLos = isQuickStart ? (state.quickStart.losBlocked || quickStartWoodsBlocked) : state.losBlocked
  const outOfRange = isQuickStart && state.quickStart.range === 'beyond'

  const resetShot = () => setState((current) => {
    if (!isQuickStart) return { ...initialState, ruleset: current.ruleset, quickStart: current.quickStart, pilotName: current.pilotName, mechName: current.mechName, gunnery: current.gunnery }
    return {
      ...current,
      quickStart: {
        ...initialState.quickStart,
        pilotName: current.quickStart.pilotName,
        mechName: current.quickStart.mechName,
        gunnery: current.quickStart.gunnery,
      },
    }
  })

  return (
    <div className="relative min-h-screen">
      <header className="border-b border-line/70 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-acid/30 bg-acid/[.08]">
              <div className="absolute left-2 top-2 h-6 w-6 rotate-45 border-2 border-acid" />
              <div className="absolute left-[17px] top-1 h-8 w-1 bg-acid" />
            </div>
            <div>
              <p className="font-display text-xl font-bold uppercase leading-none tracking-[.14em] text-white">GATOR</p>
              <p className="mt-1 hidden font-mono text-[9px] uppercase tracking-[.18em] text-mist min-[430px]:block">Targeting computer // CBT</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-mist" title="Local save active">
              <span className="h-1.5 w-1.5 rounded-full bg-acid shadow-[0_0_10px_#d6ff38]" />
              <span className="hidden sm:inline">Local save active</span>
            </div>
            <RulesetSelector
              value={activeRuleset.id}
              onChange={(ruleset) => setState((current) => ({ ...current, ruleset }))}
            />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5" aria-label="GATOR battlefield banner">
        <div className="relative overflow-hidden rounded-xl border border-[#4c514d] bg-panel shadow-[0_18px_60px_rgba(0,0,0,.35)] sm:rounded-2xl">
          <img
            src="/assets/gator-banner.jpg"
            alt="GATOR rendered in armored steel across a BattleTech battlefield"
            className="h-[148px] w-full object-cover object-center sm:h-auto sm:aspect-[3.35/1]"
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
          <div className="absolute bottom-2.5 right-3 rounded-md border border-white/10 bg-black/65 px-2 py-1 font-mono text-[8px] uppercase tracking-[.16em] text-white/70 backdrop-blur-sm sm:bottom-4 sm:right-4 sm:text-[9px]">
            {activeRuleset.banner}
          </div>
        </div>
      </section>

      {!isAlphaStrike && <nav className="mx-auto mt-3 flex max-w-7xl justify-center px-4 sm:px-6" aria-label="Calculator views">
        <div className="grid w-full max-w-md grid-cols-2 rounded-xl border border-line bg-panel/80 p-1">
          <button type="button" onClick={() => setActiveView('los')} className={`h-10 rounded-lg font-display text-xs font-bold uppercase tracking-[.14em] transition ${activeView === 'los' ? 'bg-acid text-ink' : 'text-mist hover:text-white'}`}>Line of sight</button>
          <button type="button" onClick={() => setActiveView('targeting')} className={`h-10 rounded-lg font-display text-xs font-bold uppercase tracking-[.14em] transition ${activeView === 'targeting' ? 'bg-acid text-ink' : 'text-mist hover:text-white'}`}>Targeting</button>
        </div>
      </nav>}

      {isAlphaStrike ? <AlphaStrikePlaceholder ruleset={activeRuleset} /> : <>
      <div onTouchStart={(event) => { touchStart.current = event.touches[0].clientX }} onTouchEnd={handleTouchEnd}>
      {activeView === 'targeting' ? (
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:py-8">
        <div className="order-2 space-y-4 lg:order-1">
          <div className="mb-6">
            <p className="eyebrow">{`${isQuickStart ? 'Quick-Start Rules' : 'A Game of Armored Combat'} // Weapon attacks`}</p>
            <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold uppercase leading-[.95] tracking-tight text-white sm:text-5xl">{isQuickStart ? 'Learn the shot.' : 'Lock the shot.'}<br/><span className="text-acid">Skip the math.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-mist">{isQuickStart ? 'Only the modifiers included in the official beginner Quick-Start Rules are shown.' : 'Set the situation below. Your live 2D6 target number, odds, and complete GATOR breakdown stay ready at the table.'}</p>
          </div>

          {isQuickStart ? <>
          <Section code="G" title="Gunnery" subtitle="Base skill" total={mods.gunnery}>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_160px]">
              <div><label className="field-label">Pilot / callsign</label><input className="select bg-none pr-3" value={state.quickStart.pilotName} onChange={(event) => setQuick('pilotName', event.target.value)} placeholder="Optional" /></div>
              <div><label className="field-label">BattleMech</label><input className="select bg-none pr-3" value={state.quickStart.mechName} onChange={(event) => setQuick('mechName', event.target.value)} placeholder="Optional" /></div>
              <div><label className="field-label">Gunnery skill</label><select className="select" value={state.quickStart.gunnery} onChange={(event) => setQuick('gunnery', Number(event.target.value))}>{[0,1,2,3,4,5,6,7,8].map((number) => <option key={number} value={number}>{number}{number === 4 ? ' — Default' : ''}</option>)}</select></div>
            </div>
          </Section>

          <Section code="A" title="Attacker" subtitle="Movement mode" total={mods.attacker}>
            <div><label className="field-label">Movement mode</label><select className="select" value={state.quickStart.attackerMove} onChange={(event) => setQuick('attackerMove', Number(event.target.value))}>{attackerMoves.map(([label, value]) => <option key={label} value={value}>{label} {value ? `(+${value})` : '(+0)'}</option>)}</select></div>
          </Section>

          <Section code="T" title="Target" subtitle="Movement" total={mods.target}>
            <Stepper label="Hexes moved" value={state.quickStart.targetHexes} onChange={(value) => setQuick('targetHexes', value)} max={40} hint={`TMM +${targetMovementModifier(state.quickStart.targetHexes, 'quick-start')}`} />
            <Toggle checked={state.quickStart.targetJumped} onChange={(value) => setQuick('targetJumped', value)} label="Target jumped" detail="Cumulative with the modifier from hexes moved" badge="+1" />
          </Section>

          <Section code="O" title="Other" subtitle="Pulse laser & woods" total={mods.other}>
            <Toggle checked={state.quickStart.pulseLaser} onChange={(value) => setQuick('pulseLaser', value)} label="Firing a pulse laser" detail="Quick-Start pulse modifier" badge="−2" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Stepper ariaLabel="Intervening light woods" label={<span>Intervening light woods<LinkedBadge active={state.quickStart.losLinked.lightWoods} /></span>} value={state.quickStart.lightWoods} onChange={(value) => setQuick('lightWoods', value)} max={5} suffix=" hex" hint="+1 each" />
              <Stepper ariaLabel="Intervening heavy woods" label={<span>Intervening heavy woods<LinkedBadge active={state.quickStart.losLinked.heavyWoods} /></span>} value={state.quickStart.heavyWoods} onChange={(value) => setQuick('heavyWoods', value)} max={3} suffix=" hex" hint="+2 each" />
            </div>
            <div><label className="field-label">Target terrain<LinkedBadge active={state.quickStart.losLinked.targetTerrain} /></label><select className="select" value={state.quickStart.targetTerrain} onChange={(event) => setQuick('targetTerrain', event.target.value)}><option value="clear">Clear (+0)</option><option value="light">Light woods (+1)</option><option value="heavy">Heavy woods (+2)</option></select></div>
            {(Number(state.quickStart.lightWoods) + Number(state.quickStart.heavyWoods) * 2) > 2 && <p className="rounded-lg border border-ember/20 bg-ember/[.06] px-3 py-2 text-[11px] leading-4 text-[#d9b7a8]">Three or more points of intervening woods block line of sight.</p>}
            <details className="rounded-xl border border-line bg-[#0c110f] p-3">
              <summary className="cursor-pointer text-xs font-semibold text-mist">Custom / scenario modifier</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px]">
                <div><label className="field-label">Label</label><input className="select bg-none pr-3" value={state.quickStart.customLabel} onChange={(event) => setQuick('customLabel', event.target.value)} placeholder="Optional house rule…" /></div>
                <div><label className="field-label">Modifier</label><select className="select" value={state.quickStart.customModifier} onChange={(event) => setQuick('customModifier', Number(event.target.value))}>{[-4,-3,-2,-1,0,1,2,3,4,5,6].map((number) => <option key={number} value={number}>{number > 0 ? '+' : ''}{number}</option>)}</select></div>
              </div>
            </details>
          </Section>

          <Section code="R" title="Range" subtitle="Weapon range bracket" total={mods.range}>
            <div><label className="field-label">Range bracket</label><select className="select" value={state.quickStart.range} onChange={(event) => setQuick('range', event.target.value)}><option value="short">Short (+0)</option><option value="medium">Medium (+2)</option><option value="long">Long (+4)</option><option value="beyond">Beyond long range — cannot hit</option></select></div>
            <p className="text-[11px] leading-4 text-mist">Check the firing weapon’s record-sheet ranges. Minimum range is not used in Quick-Start mode.</p>
          </Section>
          </> : <>
          <Section code="G" title="Gunnery" subtitle="Base skill" total={mods.gunnery}>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_160px]">
              <div><label className="field-label">Pilot / callsign</label><input className="select bg-none pr-3" value={state.pilotName} onChange={(e) => set('pilotName', e.target.value)} placeholder="Optional" /></div>
              <div><label className="field-label">BattleMech</label><input className="select bg-none pr-3" value={state.mechName} onChange={(e) => set('mechName', e.target.value)} placeholder="Optional" /></div>
              <div><label className="field-label">Gunnery skill</label><select className="select" value={state.gunnery} onChange={(e) => set('gunnery', Number(e.target.value))}>{[0,1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}{n === 4 ? ' — Standard' : ''}</option>)}</select></div>
            </div>
          </Section>

          <Section code="A" title="Attacker" subtitle="Movement, damage & heat" total={mods.attacker}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="field-label">Movement mode</label><select className="select" value={state.attackerMove} onChange={(e) => set('attackerMove', Number(e.target.value))}>{attackerMoves.map(([label, value]) => <option key={label} value={value}>{label} {value ? `(+${value})` : '(+0)'}</option>)}</select></div>
              <div><label className="field-label">Heat level</label><select className="select" value={state.heat} onChange={(e) => set('heat', Number(e.target.value))}><option value="0">0–7 (+0)</option><option value="8">8–12 (+1)</option><option value="13">13–16 (+2)</option><option value="17">17–23 (+3)</option><option value="24">24+ (+4)</option></select></div>
              <Toggle checked={state.attackerProne} onChange={(v) => set('attackerProne', v)} label="Attacker is prone" detail="Weapon attacks while prone" badge="+2" />
              <div><label className="field-label">Sensor hits</label><select className="select" value={state.sensorHits} onChange={(e) => set('sensorHits', Number(e.target.value))}><option value="0">None (+0)</option><option value="1">1 hit (+2)</option><option value="2">2 hits (+4)</option></select></div>
            </div>
            <div><label className="field-label">Firing arm damage</label><select className="select" value={state.armDamage} onChange={(e) => set('armDamage', Number(e.target.value))}><option value="0">None / torso weapon (+0)</option><option value="1">1 actuator hit (+1)</option><option value="2">2 actuator hits (+2)</option><option value="4">Shoulder hit (+4, ignore other arm actuators)</option></select></div>
          </Section>

          <Section code="T" title="Target" subtitle="Movement & condition" total={mods.target}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Stepper label="Hexes moved" value={state.targetHexes} onChange={(v) => set('targetHexes', v)} max={40} hint={`TMM +${targetMovementModifier(state.targetHexes)}`} />
              <div><label className="field-label">Target condition</label><select className="select" value={state.targetState} onChange={(e) => set('targetState', e.target.value)}><option value="normal">Standing / normal (+0)</option><option value="prone-adjacent">Prone, adjacent (−2)</option><option value="prone-distant">Prone, not adjacent (+1)</option><option value="immobile">Immobile (−4, ignores TMM)</option></select></div>
            </div>
            <Toggle checked={state.targetJumped} onChange={(v) => set('targetJumped', v)} label="Target jumped" detail="Added to the modifier from hexes moved" badge="+1" />
            {(state.targetState === 'prone-adjacent' || state.targetState === 'prone-distant') && <p className="rounded-lg border border-ember/20 bg-ember/[.06] px-3 py-2 text-[11px] leading-4 text-[#d9b7a8]">A prone target keeps the TMM it earned earlier in the turn. The prone modifier is added separately.</p>}
          </Section>

          <Section code="O" title="Other" subtitle="Terrain & tactical conditions" total={mods.other}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Stepper ariaLabel="Light woods" label={<span>Light woods<LinkedBadge active={state.losLinked.lightWoods} /></span>} value={state.lightWoods} onChange={(v) => set('lightWoods', v)} max={5} suffix=" hex" hint="+1 each" />
              <Stepper ariaLabel="Heavy woods" label={<span>Heavy woods<LinkedBadge active={state.losLinked.heavyWoods} /></span>} value={state.heavyWoods} onChange={(v) => set('heavyWoods', v)} max={3} suffix=" hex" hint="+2 each" />
              <Toggle checked={state.partialCover} onChange={(v) => setState((current) => ({ ...current, partialCover: v, depthOneWater: v ? false : current.depthOneWater, losLinked: { ...current.losLinked, partialCover: false, depthOneWater: false } }))} label={<span>Partial cover<LinkedBadge active={state.losLinked.partialCover} /></span>} detail="Target partially obscured" badge="+1" />
              <Toggle checked={state.depthOneWater} onChange={(v) => setState((current) => ({ ...current, depthOneWater: v, partialCover: v ? false : current.partialCover, losLinked: { ...current.losLinked, partialCover: false, depthOneWater: false } }))} label={<span>Target in depth 1 water<LinkedBadge active={state.losLinked.depthOneWater} /></span>} detail="Counts as partial cover; options are mutually exclusive" badge="+1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="field-label">Multiple targets</label><select className="select" value={state.targetType} onChange={(e) => set('targetType', e.target.value)}><option value="primary">Primary target (+0)</option><option value="secondary-front">Secondary, front arc (+1)</option><option value="secondary-side">Secondary, side / rear arc (+2)</option></select></div>
              <div><label className="field-label">Indirect fire</label><select className="select" value={state.indirect} onChange={(e) => set('indirect', e.target.value)}><option value="none">Direct fire (+0)</option><option value="standard">Indirect fire (+1)</option><option value="spotter-fired">Indirect; spotter also attacked (+2)</option></select></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
              <div><label className="field-label">Custom modifier label</label><input className="select bg-none pr-3" value={state.customLabel} onChange={(e) => set('customLabel', e.target.value)} placeholder="Targeting computer, weather, house rule…" /></div>
              <div><label className="field-label">Modifier</label><select className="select" value={state.customModifier} onChange={(e) => set('customModifier', Number(e.target.value))}>{[-4,-3,-2,-1,0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n > 0 ? '+' : ''}{n}</option>)}</select></div>
            </div>
          </Section>

          <Section code="R" title="Range" subtitle="Weapon range bracket" total={mods.range}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="field-label">Range bracket</label><select className="select" value={state.range} onChange={(e) => set('range', e.target.value)}><option value="short">Short (+0)</option><option value="medium">Medium (+2)</option><option value="long">Long (+4)</option><option value="minimum">Inside minimum range (calculate)</option></select></div>
              {state.range === 'minimum' && <div className="grid grid-cols-2 gap-3"><Stepper label="Min. range" value={state.minimumRange} onChange={(v) => set('minimumRange', v)} max={30} /><Stepper label="Distance" value={state.distance} onChange={(v) => set('distance', v)} min={1} max={30} /></div>}
            </div>
            {state.range === 'minimum' && <p className="font-mono text-[11px] text-mist">Formula: minimum range − target distance + 1 = <span className="text-acid">+{mods.minimum}</span></p>}
          </Section>
          </>}
        </div>

        <aside id="target-solution" className="order-1 scroll-mt-4 lg:order-2 lg:sticky lg:top-5">
          <div className={`panel overflow-hidden transition-shadow duration-300 ${noLos || outOfRange || impossible ? 'border-ember/35 shadow-[0_0_42px_rgba(255,122,69,.16)]' : auto ? 'border-acid/40 shadow-[0_0_48px_rgba(214,255,56,.2)]' : 'border-acid/20 shadow-glow'}`}>
            <div className="border-b border-line bg-[#0c110f] px-5 py-4">
              <div className="flex items-center justify-between">
                <div><p className="eyebrow">{isQuickStart ? 'Quick-Start' : 'AGoAC'} fire control</p><p className="mt-1 text-xs text-mist">{(isQuickStart ? state.quickStart.mechName : state.mechName) || 'Unassigned unit'}{(isQuickStart ? state.quickStart.pilotName : state.pilotName) ? ` // ${isQuickStart ? state.quickStart.pilotName : state.pilotName}` : ''}</p></div>
                <span className={`h-2.5 w-2.5 rounded-full ${noLos || outOfRange || impossible ? 'bg-ember shadow-[0_0_12px_#ff7a45]' : 'bg-acid shadow-[0_0_12px_#d6ff38]'}`} />
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div key={`${targetNumber}-${noLos}-${outOfRange}`} className="result-pop text-center">
                <p className="eyebrow">2D6 target number</p>
                <div className={`mt-1 font-display text-[92px] font-bold leading-none tracking-[-.07em] ${noLos || outOfRange || impossible ? 'text-ember' : 'text-white'}`}>{noLos || outOfRange ? '—' : targetNumber}</div>
                <p className={`mt-2 font-mono font-semibold uppercase ${noLos || outOfRange || impossible || auto ? 'text-lg tracking-[.2em] drop-shadow-[0_0_12px_currentColor] sm:text-xl' : 'text-xs tracking-[.18em]'} ${noLos || outOfRange || impossible ? 'text-ember' : 'text-acid'}`}>
                  {noLos ? 'No line of sight' : outOfRange ? 'Out of weapon range' : impossible ? 'Automatic miss' : auto ? 'Automatic hit' : `${probability}% chance to hit`}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-5 gap-1.5">
                {[['G', mods.gunnery], ['A', mods.attacker], ['T', mods.target], ['O', mods.other], ['R', mods.range]].map(([code, value]) => (
                  <div key={code} className="rounded-xl border border-line bg-[#0c110f] px-1 py-3 text-center">
                    <div className="font-display text-sm font-bold text-acid">{code}</div>
                    <div className="mt-1 font-mono text-xs font-semibold text-white">{code === 'G' ? value : `${value >= 0 ? '+' : ''}${value}`}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => setShowBreakdown(!showBreakdown)} className="mt-4 flex w-full items-center justify-between border-y border-line py-3 text-left text-xs font-semibold text-[#c7cfcb]">
                Full breakdown <span className={`text-mist transition ${showBreakdown ? 'rotate-180' : ''}`}>⌄</span>
              </button>
              {showBreakdown && <div className="border-b border-line py-3">
                <BreakdownRow label="Gunnery skill" value={mods.gunnery} base />
                <BreakdownRow label={isQuickStart ? 'Attacker movement' : 'Attacker movement, damage & heat'} value={mods.attacker} />
                <BreakdownRow label="Target movement" value={mods.targetMovement} />
                {!isQuickStart && <BreakdownRow label="Target condition" value={mods.targetCondition} />}
                <BreakdownRow label="Terrain" value={mods.terrain} />
                {isQuickStart && <BreakdownRow label="Pulse laser" value={mods.pulse} />}
                {!isQuickStart && <BreakdownRow label="Multiple target" value={mods.tactical} />}
                {!isQuickStart && <BreakdownRow label="Indirect fire" value={mods.indirect} />}
                {(isQuickStart ? state.quickStart.customModifier : state.customModifier) !== 0 && <BreakdownRow label={(isQuickStart ? state.quickStart.customLabel : state.customLabel) || 'Custom modifier'} value={Number(isQuickStart ? state.quickStart.customModifier : state.customModifier)} />}
                <BreakdownRow label="Range" value={mods.range} />
              </div>}

              <button onClick={resetShot} className="mt-5 h-12 w-full rounded-xl bg-acid font-display text-sm font-bold uppercase tracking-[.14em] text-ink transition hover:bg-[#e2ff78] active:scale-[.98]">Clear shot data</button>
              <p className="mt-3 text-center text-[10px] leading-4 text-[#68736e]">Keeps pilot, ’Mech, and gunnery skill. All settings save on this device.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-line/70 px-4 py-3 text-[10px] leading-4 text-[#68736e]">
            {isQuickStart ? 'Built for the official BattleTech Quick-Start Rules. Advanced AGoAC modifiers are intentionally hidden.' : 'Built for BattleMech weapon attacks using A Game of Armored Combat. Always defer to your current printing and scenario-specific rules.'}
          </div>
        </aside>
      </main>
      ) : (
        isQuickStart
          ? <QuickStartLosView data={state.quickStart} result={quickLosResult} updateDistance={updateQuickLosDistance} updateTargetTerrain={updateQuickTargetTerrain} updatePathHex={updateQuickPathHex} resetLos={resetQuickLos} />
          : <LosView los={state.los} result={losResult} updateLos={updateLos} updateEndpoint={updateEndpoint} updatePathHex={updatePathHex} resetLos={resetLos} />
      )}
      </div>
      {activeView === 'targeting' && <button
        type="button"
        onClick={() => document.getElementById('target-solution')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="fixed bottom-4 right-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-acid/35 bg-[#111715]/95 text-acid shadow-[0_8px_30px_rgba(0,0,0,.5)] backdrop-blur-md transition hover:border-acid hover:bg-[#17201c] hover:shadow-[0_0_22px_rgba(214,255,56,.16)] active:scale-95 sm:bottom-6 sm:right-6"
        aria-label="Scroll to target number"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 11 6-6 6 6" />
          <path d="m6 18 6-6 6 6" />
        </svg>
      </button>}
      {activeView === 'los' && <button
        type="button"
        onClick={() => document.getElementById('los-solution')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="fixed bottom-4 right-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-acid/35 bg-[#111715]/95 text-acid shadow-[0_8px_30px_rgba(0,0,0,.5)] backdrop-blur-md transition hover:border-acid hover:bg-[#17201c] hover:shadow-[0_0_22px_rgba(214,255,56,.16)] active:scale-95 sm:bottom-6 sm:right-6"
        aria-label="Scroll to LOS solution"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 11 6-6 6 6" />
          <path d="m6 18 6-6 6 6" />
        </svg>
      </button>}
      </>}
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-2 text-center font-mono text-[9px] uppercase tracking-widest text-[#4f5a55] sm:px-6">Unofficial fan-made play aid · BattleTech is a trademark of The Topps Company, Inc.</footer>
    </div>
  )
}

export default App
