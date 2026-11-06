import { alphaStrikeQuickStartDefaults, calculateAlphaStrikeQuickStartLos, calculateAlphaStrikeQuickStartModifiers, hitProbability, totalTargetNumber } from './rules.js'

function Section({ code, title, subtitle, total, children }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-[#0c110f] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-acid font-display text-lg font-bold text-ink">{code}</span><div><h2 className="font-display text-lg font-semibold uppercase tracking-wide">{title}</h2><p className="text-[10px] text-mist">{subtitle}</p></div></div>
        <span className="font-mono text-sm font-semibold text-acid">{code === 'S' ? total : `${total >= 0 ? '+' : ''}${total}`}</span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  )
}

function LinkedBadge({ active }) {
  if (!active) return null
  return <span className="ml-2 rounded border border-[#5d8f93]/40 bg-[#5d8f93]/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[#8fc2c5]">LOS</span>
}

function Toggle({ checked, onChange, label, detail, badge }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked} className={`flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left transition ${checked ? 'border-acid/50 bg-acid/[.07]' : 'border-line bg-[#0c110f] hover:border-[#4b5751]'}`}>
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${checked ? 'border-acid bg-acid text-ink' : 'border-[#4b5751] bg-[#111715]'}`}>{checked ? '✓' : ''}</span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-white">{label}</span>{detail && <span className="mt-0.5 block text-[10px] leading-4 text-mist">{detail}</span>}</span>
      {badge && <span className="font-mono text-[10px] font-semibold text-acid">{badge}</span>}
    </button>
  )
}

function NumberInput({ label, value, onChange, min = 0, max = 99, step = 1, suffix, hint }) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3"><label className="field-label !mb-0">{label}</label>{hint && <span className="text-[10px] text-mist">{hint}</span>}</div>
      <div className="relative"><input type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))} className="select bg-none pr-12 font-mono" />{suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-mist">{suffix}</span>}</div>
    </div>
  )
}

function BreakdownRow({ label, value, base = false }) {
  return <div className="flex items-center justify-between gap-4 py-2 text-xs"><span className="text-mist">{label}</span><span className={base ? 'font-mono font-bold text-white' : 'font-mono text-[#cbd3cf]'}>{base ? value : `${value >= 0 ? '+' : ''}${value}`}</span></div>
}

function rangeLabel(bracket) {
  if (bracket === 'short') return 'Short range · +0'
  if (bracket === 'medium') return 'Medium range · +2'
  if (bracket === 'long') return 'Long range · +4'
  return 'Beyond long range'
}

function AlphaStrikeTargeting({ data, update }) {
  const modifiers = calculateAlphaStrikeQuickStartModifiers(data)
  const targetNumber = totalTargetNumber(modifiers)
  const probability = hitProbability(targetNumber)
  const isWeapon = data.attackType === 'weapon'
  const distance = Number(data.distance)

  let invalidReason = ''
  if (!data.firingArc) invalidReason = 'Target is outside the firing arc'
  else if (data.losBlocked) invalidReason = 'No line of sight'
  else if (isWeapon && distance === 0) invalidReason = 'Base-to-base contact allows physical attacks only'
  else if (isWeapon && modifiers.rangeBracket === 'beyond') invalidReason = 'Target is beyond 42 inches'
  else if (isWeapon && data.damageProfile === 'none') invalidReason = 'Unit has no damage value at this range'
  else if (data.attackType === 'standard' && distance > 1) invalidReason = 'Standard physical attacks require 1 inch or less'
  else if (data.attackType === 'melee' && distance > 2) invalidReason = 'Melee attacks require 2 inches or less'
  else if ((data.attackType === 'charge' || data.attackType === 'dfa') && distance > 0) invalidReason = 'Charge and DFA attacks require base-to-base contact'
  else if (data.attackType === 'charge' && data.attackerMove !== 'ground') invalidReason = 'Charge attacks require Ground Move'
  else if (data.attackType === 'dfa' && data.attackerMove !== 'jumping') invalidReason = 'DFA attacks require jumping movement'

  const impossible = targetNumber > 12
  const automatic = targetNumber <= 2
  const setField = (key, value) => update((current) => ({
    ...current,
    [key]: value,
    losLinked: key === 'woods' || key === 'partialCover' ? { ...current.losLinked, [key]: false } : current.losLinked,
  }))
  const setDistance = (value) => update((current) => {
    const nextLos = { ...current.los, distance: value }
    const result = calculateAlphaStrikeQuickStartLos(nextLos)
    return { ...current, distance: value, los: nextLos, woods: result.woodsModifier, partialCover: result.partialCover, losBlocked: result.blocked, losLinked: { woods: true, partialCover: true, distance: true } }
  })
  const reset = () => update((current) => {
    const result = calculateAlphaStrikeQuickStartLos(current.los)
    return {
      ...alphaStrikeQuickStartDefaults,
      pilotName: current.pilotName,
      unitName: current.unitName,
      skill: current.skill,
      los: current.los,
      distance: current.los.distance,
      woods: result.woodsModifier,
      partialCover: result.partialCover,
      losBlocked: result.blocked,
      losLinked: { woods: true, partialCover: true, distance: true },
    }
  })

  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:py-8">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="mb-6"><p className="eyebrow">Alpha Strike Quick-Start // Weapon & physical attacks</p><h1 className="mt-2 font-display text-3xl font-bold uppercase leading-[.95] tracking-tight text-white sm:text-5xl">Build the SATOR.<br/><span className="text-acid">Take the shot.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-mist">Skill, movement, terrain, heat, damage, stealth, and fixed Alpha Strike ranges are calculated from the Quick-Start rules.</p></div>

        <Section code="S" title="Skill" subtitle="Base target number" total={modifiers.gunnery}>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_150px]"><div><label className="field-label">Pilot / callsign</label><input className="select bg-none pr-3" value={data.pilotName} onChange={(event) => setField('pilotName', event.target.value)} placeholder="Optional" /></div><div><label className="field-label">Unit</label><input className="select bg-none pr-3" value={data.unitName} onChange={(event) => setField('unitName', event.target.value)} placeholder="Optional" /></div><div><label className="field-label">Skill rating</label><select className="select" value={data.skill} onChange={(event) => setField('skill', Number(event.target.value))}>{[0,1,2,3,4,5,6,7,8].map((number) => <option key={number} value={number}>{number}{number === 4 ? ' — Default' : ''}</option>)}</select></div></div>
        </Section>

        <Section code="A" title="Attacker" subtitle="Movement mode" total={modifiers.attacker}>
          <div><label className="field-label">Movement this turn</label><select className="select" value={data.attackerMove} onChange={(event) => setField('attackerMove', event.target.value)}><option value="standstill">Standstill / immobile (−1)</option><option value="ground">Ground Move (+0)</option><option value="jumping">Jumping (+2)</option></select></div>
        </Section>

        <Section code="T" title="Target" subtitle="Unit-card TMM" total={modifiers.target}>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">Target movement</label><select className="select" value={data.targetMove} onChange={(event) => setField('targetMove', event.target.value)}><option value="standstill">Standstill (+0)</option><option value="ground">Ground Move / Sprinting (+TMM)</option><option value="jumping">Jumping (+TMM +1)</option><option value="immobile">Immobile (−4)</option></select></div><NumberInput label="Printed TMM" value={data.targetTmm} onChange={(value) => setField('targetTmm', value)} max={8} hint={data.targetMove === 'jumping' ? 'Adds +1' : undefined} /></div>
        </Section>

        <Section code="O" title="Other" subtitle="Terrain, heat & damage" total={modifiers.other}>
          <div><label className="field-label">Attack type</label><select className="select" value={data.attackType} onChange={(event) => setField('attackType', event.target.value)}><option value="weapon">Weapon attack</option><option value="standard">Standard physical</option><option value="melee">Melee physical (MEL)</option><option value="charge">Charge (+1)</option><option value="dfa">Death From Above (+1; ignores terrain)</option></select></div>
          <div className="grid gap-3 sm:grid-cols-2"><Toggle checked={data.woods} onChange={(value) => setField('woods', value)} label={<span>Woods modifier<LinkedBadge active={data.losLinked.woods} /></span>} detail="Intervening or occupied woods" badge="+1" /><Toggle checked={data.partialCover} onChange={(value) => setField('partialCover', value)} label={<span>Partial cover<LinkedBadge active={data.losLinked.partialCover} /></span>} detail="Solid terrain or depth 1” water" badge="+1" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">Current heat level</label><select className="select" value={data.heat} onChange={(event) => setField('heat', Number(event.target.value))} disabled={!isWeapon}>{[0,1,2,3].map((number) => <option key={number} value={number}>{number} ({number ? `+${number}` : '+0'})</option>)}</select></div><div><label className="field-label">Fire Control hits</label><select className="select" value={data.fireControlHits} onChange={(event) => setField('fireControlHits', Number(event.target.value))} disabled={!isWeapon}><option value="0">None (+0)</option><option value="1">1 hit (+2)</option><option value="2">2 hits (+4)</option></select></div></div>
          <Toggle checked={data.targetStealth} onChange={(value) => setField('targetStealth', value)} label="Target has STL" detail="Short +0 · Medium +1 · Long +2" badge={modifiers.stealth ? `+${modifiers.stealth}` : '+0'} />
          <details className="rounded-xl border border-line bg-[#0c110f] p-3"><summary className="cursor-pointer text-xs font-semibold text-mist">Custom / pilot ability modifier</summary><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px]"><div><label className="field-label">Label</label><input className="select bg-none pr-3" value={data.customLabel} onChange={(event) => setField('customLabel', event.target.value)} placeholder="SPA or scenario rule…" /></div><div><label className="field-label">Modifier</label><select className="select" value={data.customModifier} onChange={(event) => setField('customModifier', Number(event.target.value))}>{[-4,-3,-2,-1,0,1,2,3,4,5,6].map((number) => <option key={number} value={number}>{number > 0 ? '+' : ''}{number}</option>)}</select></div></div></details>
        </Section>

        <Section code="R" title="Range" subtitle="Base edge to base edge" total={modifiers.range}>
          <div className="grid gap-4 sm:grid-cols-2"><NumberInput label={<span>Distance<LinkedBadge active={data.losLinked.distance} /></span>} value={data.distance} onChange={setDistance} max={60} step={0.5} suffix="in" hint={isWeapon ? rangeLabel(modifiers.rangeBracket) : 'Physical range'} /><div><label className="field-label">Damage at this range</label><select className="select" value={data.damageProfile} onChange={(event) => setField('damageProfile', event.target.value)} disabled={!isWeapon}><option value="standard">Printed damage value</option><option value="minimal">0* — minimal damage</option><option value="none">— no attack at this range</option></select></div></div>
          <Toggle checked={data.firingArc} onChange={(value) => setField('firingArc', value)} label="Target is inside firing arc" detail="More than half the target’s base must be inside" />
        </Section>
      </div>

      <aside id="target-solution" className="order-1 scroll-mt-4 lg:order-2 lg:sticky lg:top-5">
        <div className={`panel overflow-hidden ${invalidReason || impossible ? 'border-ember/35 shadow-[0_0_42px_rgba(255,122,69,.16)]' : 'border-acid/25 shadow-glow'}`}>
          <div className="border-b border-line bg-[#0c110f] px-5 py-4"><p className="eyebrow">Alpha Strike fire control</p><p className="mt-1 text-xs text-mist">{data.unitName || 'Unassigned unit'}{data.pilotName ? ` // ${data.pilotName}` : ''}</p></div>
          <div className="p-5 sm:p-6">
            <div className="text-center"><p className="eyebrow">2D6 target number</p><div className={`mt-1 font-display text-[92px] font-bold leading-none tracking-[-.07em] ${invalidReason || impossible ? 'text-ember' : 'text-white'}`}>{invalidReason ? '—' : targetNumber}</div><p className={`mt-2 font-mono font-semibold uppercase ${invalidReason || impossible || automatic ? 'text-lg tracking-[.16em]' : 'text-xs tracking-[.18em]'} ${invalidReason || impossible ? 'text-ember' : 'text-acid'}`}>{invalidReason || (impossible ? 'Automatic miss' : automatic ? 'Automatic hit' : `${probability}% chance to hit`)}</p></div>
            <div className="mt-6 grid grid-cols-5 gap-1.5">{[['S',modifiers.gunnery],['A',modifiers.attacker],['T',modifiers.target],['O',modifiers.other],['R',modifiers.range]].map(([code,value]) => <div key={code} className="rounded-xl border border-line bg-[#0c110f] px-1 py-3 text-center"><div className="font-display text-sm font-bold text-acid">{code}</div><div className="mt-1 font-mono text-xs font-semibold text-white">{code === 'S' ? value : `${value >= 0 ? '+' : ''}${value}`}</div></div>)}</div>
            <div className="mt-4 divide-y divide-line border-y border-line py-1"><BreakdownRow label="Skill rating" value={modifiers.gunnery} base /><BreakdownRow label="Attacker movement" value={modifiers.attacker} /><BreakdownRow label="Target movement" value={modifiers.target} /><BreakdownRow label="Terrain" value={modifiers.terrain} />{isWeapon && <BreakdownRow label="Heat & fire control" value={modifiers.heat + modifiers.fireControl} />}{modifiers.stealth !== 0 && <BreakdownRow label="Stealth" value={modifiers.stealth} />}{modifiers.physical !== 0 && <BreakdownRow label="Physical attack type" value={modifiers.physical} />}<BreakdownRow label="Range" value={modifiers.range} /></div>
            {isWeapon && data.damageProfile === 'minimal' && !invalidReason && <p className="mt-4 rounded-lg border border-[#5d8f93]/30 bg-[#5d8f93]/[.07] px-3 py-2 text-[11px] leading-4 text-[#9bc4c5]">On a successful hit, roll 1D6: 4+ delivers 1 damage.</p>}
            <button onClick={reset} className="mt-5 h-12 w-full rounded-xl bg-acid font-display text-sm font-bold uppercase tracking-[.14em] text-ink transition hover:bg-[#e2ff78] active:scale-[.98]">Clear attack data</button>
          </div>
        </div>
      </aside>
    </main>
  )
}

function AlphaStrikeLos({ data, update }) {
  const result = calculateAlphaStrikeQuickStartLos(data.los)
  const syncLos = (nextLos) => update((current) => {
    const nextResult = calculateAlphaStrikeQuickStartLos(nextLos)
    return { ...current, los: nextLos, distance: nextLos.distance, woods: nextResult.woodsModifier, partialCover: nextResult.partialCover, losBlocked: nextResult.blocked, losLinked: { woods: true, partialCover: true, distance: true } }
  })
  const setLos = (key, value) => syncLos({ ...data.los, [key]: value })
  const reset = () => syncLos({ ...alphaStrikeQuickStartDefaults.los })
  const status = (
    <div className="p-5 text-center sm:p-6"><p className="eyebrow">Alpha Strike LOS solution</p><div className={`mt-2 font-display text-5xl font-bold uppercase tracking-tight ${result.blocked ? 'text-ember drop-shadow-[0_0_14px_rgba(255,122,69,.4)]' : 'text-acid drop-shadow-[0_0_14px_rgba(214,255,56,.25)]'}`}>{result.blocked ? 'Blocked' : 'Clear'}</div><p className="mx-auto mt-3 max-w-lg text-xs leading-5 text-mist">{result.blocked ? result.reason : result.adjacent ? 'Base-to-base Ground ’Mechs always have LOS. Weapon attacks are still prohibited at base contact.' : 'Valid line of sight. Terrain modifiers are linked to SATOR.'}</p>{!result.blocked && <div className="mx-auto mt-4 max-w-sm rounded-xl border border-[#5d8f93]/25 bg-[#5d8f93]/[.07] px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-[#8fc2c5]">Synced to targeting · +{result.terrainModifier}</div>}</div>
  )

  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:py-8">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="mb-6"><p className="eyebrow">Alpha Strike Quick-Start // Line of sight</p><h1 className="mt-2 font-display text-3xl font-bold uppercase leading-[.95] tracking-tight text-white sm:text-5xl">Measure the lane.<br/><span className="text-acid">Confirm the shot.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-mist">Use miniature-level visibility and measure terrain along the line between the models.</p></div>
        <section className="panel p-4 sm:p-5"><NumberInput label="Distance between base edges" value={data.los.distance} onChange={(value) => setLos('distance', value)} max={60} step={0.5} suffix="in" hint={rangeLabel(calculateAlphaStrikeQuickStartModifiers({ ...data, distance: data.los.distance }).rangeBracket)} /><p className="mt-3 text-[11px] leading-4 text-mist">Enter 0 for base-to-base contact. Alpha Strike uses the same fixed range brackets for every unit.</p></section>
        <section className="panel overflow-hidden"><div className="border-b border-line px-4 py-4 sm:px-5"><p className="eyebrow">Solid terrain</p><h2 className="mt-1 font-display text-xl font-semibold uppercase tracking-wide">Target visibility</h2></div><div className="p-4 sm:p-5"><label className="field-label">How much of the target is visible?</label><select className="select" value={data.los.solidTerrain} onChange={(event) => setLos('solidTerrain', event.target.value)}><option value="clear">At least two-thirds visible — clear</option><option value="partial">Between one-third and two-thirds — partial cover</option><option value="blocked">Less than one-third visible — blocked</option></select></div></section>
        <section className="panel overflow-hidden"><div className="border-b border-line px-4 py-4 sm:px-5"><p className="eyebrow">Non-solid terrain</p><h2 className="mt-1 font-display text-xl font-semibold uppercase tracking-wide">Intervening woods</h2></div><div className="space-y-4 p-4 sm:p-5"><div><label className="field-label">Measured woods along LOS</label><select className="select" value={data.los.woodsDepth} onChange={(event) => setLos('woodsDepth', event.target.value)}><option value="none">None</option><option value="under-six">Less than 6 inches</option><option value="six-plus">6 inches or more — blocked</option></select></div>{data.los.woodsDepth !== 'none' && <Toggle checked={data.los.woodsBeyondTwo} onChange={(value) => setLos('woodsBeyondTwo', value)} label="Intervening woods are more than 2 inches from attacker" detail="Applies the +1 woods modifier when LOS is not blocked" badge="+1" />}<p className="text-[11px] leading-4 text-mist">A single tree counts as 2 inches of woods. Intervening ’Mechs never affect LOS or attacks.</p></div></section>
        <section className="panel overflow-hidden"><div className="border-b border-line px-4 py-4 sm:px-5"><p className="eyebrow">Target terrain</p><h2 className="mt-1 font-display text-xl font-semibold uppercase tracking-wide">Occupied features</h2></div><div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5"><Toggle checked={data.los.targetWoods} onChange={(value) => setLos('targetWoods', value)} label="Target occupies woods" detail="Woods modifier; not partial cover" badge="+1" /><Toggle checked={data.los.targetWater} onChange={(value) => setLos('targetWater', value)} label="Target in depth 1” water" detail="Grants partial cover" badge="+1" /></div></section>
        <section className={`panel overflow-hidden ${result.blocked ? 'border-ember/35' : 'border-acid/30'}`}>{status}</section>
      </div>
      <aside id="los-solution" className="order-1 scroll-mt-4 lg:order-2 lg:sticky lg:top-5"><div className={`panel overflow-hidden ${result.blocked ? 'border-ember/35 shadow-[0_0_42px_rgba(255,122,69,.16)]' : 'border-acid/30 shadow-glow'}`}>{status}<div className="mx-5 divide-y divide-line border-y border-line py-2 text-left"><BreakdownRow label="Woods" value={result.woodsModifier ? 1 : 0} /><BreakdownRow label="Partial cover" value={result.partialCover ? 1 : 0} /></div><div className="p-5 pt-4"><button onClick={reset} className="h-11 w-full rounded-xl border border-line bg-[#0c110f] font-display text-xs font-bold uppercase tracking-[.14em] text-mist transition hover:border-acid/40 hover:text-white">Reset LOS</button></div></div></aside>
    </main>
  )
}

export default function AlphaStrikeQuickStart({ activeView, data, update }) {
  return activeView === 'los' ? <AlphaStrikeLos data={data} update={update} /> : <AlphaStrikeTargeting data={data} update={update} />
}
