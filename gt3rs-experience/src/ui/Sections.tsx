import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { CLUBSPORT, DESIGN, DRIVE_MODES, ENGINEERING, KEY_FIGURES, PERFORMANCE, STEERING_CONTROLS, WEISSACH } from '../data/specs'
import { PAINTS } from '../data/paints'
import { SOURCES } from '../data/sources'
import { useStore, type AeroMode, type FocusId } from '../store'
import { scrollToSection, sectionProgress } from '../scroll/scroll'
import { STEPS } from '../three/shots'
import { DETAIL_POINTS } from '../three/Hotspots'
import { Art, Src } from './Src'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

// ---------------------------------------------------------------------------
// 01 — HERO
// ---------------------------------------------------------------------------
export function Hero({ started }: { started: boolean }) {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (!started) return
      const split = new SplitText('.hero__title .line', { type: 'words,chars', mask: 'chars' })
      const tl = gsap.timeline({ delay: 2.2 })
      tl.from(split.chars, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.022 })
      tl.from('.hero__eyebrow, .hero__figures li, .hero__cue', { opacity: 0, y: 14, duration: 0.9, ease: 'power3.out', stagger: 0.06 }, '-=0.7')
      // sortie au scroll
      gsap.to('.hero__content', {
        opacity: 0,
        y: -40,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: '60% top', scrub: true },
      })
      return () => split.revert()
    },
    { scope: root, dependencies: [started] },
  )
  return (
    <section id="hero" data-section="hero" ref={root} className="sec sec--hero" style={{ height: '220vh' }}>
      <div className="sticky">
        <div className={`hero__content ${started ? '' : 'is-hidden'}`}>
          <p className="hero__eyebrow mono">01 — 911 GT3 RS · Génération 992</p>
          <h1 className="hero__title">
            <span className="line">Le sport automobile,</span>
            <span className="line">homologué pour la route.</span>
          </h1>
          <ul className="hero__figures">
            {KEY_FIGURES.map((f) => (
              <li key={f.label}>
                <strong>
                  {f.value}
                  {f.unit && <small>{f.unit}</small>}
                </strong>
                <span>
                  {f.label} <Src id={f.src} />
                </span>
              </li>
            ))}
          </ul>
          <div className="hero__cue mono" aria-hidden>
            <span className="hero__cue-line" /> Défiler
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 02 — DESIGN (section pinnée, 5 plans caméra)
// ---------------------------------------------------------------------------
export function Design() {
  const step = useStore((s) => (s.section === 'design' ? s.step : -1))
  const active = Math.max(0, step)
  const item = DESIGN[active]
  const textRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!textRef.current) return
    gsap.fromTo(
      textRef.current.querySelectorAll('.reveal'),
      { opacity: 0, y: 24, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: 0.05, overwrite: true },
    )
  }, [active])
  return (
    <section id="design" data-section="design" className="sec" style={{ height: '620vh' }}>
      <div className="sticky">
        <header className="chap">
          <span className="mono">02</span>
          <h2>Design</h2>
          <p>Chaque surface a une fonction.</p>
        </header>
        <div className="panel panel--left" ref={textRef} key={item.id}>
          <p className="panel__index mono reveal">{item.index}</p>
          <h3 className="panel__title reveal">{item.title}</h3>
          <p className="panel__body reveal">{item.body}</p>
          <dl className="facts reveal">
            {item.facts.map((f) => (
              <div key={f.label}>
                <dt>
                  {f.value}
                  {f.unit && <small> {f.unit}</small>}
                </dt>
                <dd>
                  {f.label} <Src id={f.src} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <ol className="steps" aria-label="Éléments de design">
          {DESIGN.map((d, i) => (
            <li key={d.id} className={i === active ? 'is-active' : ''}>
              <button onClick={() => scrollToSection('design', STEPS.design[i] + 0.06)}>
                <span className="mono">{d.index}</span> {d.title}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 03 — ENGINEERING (interactif)
// ---------------------------------------------------------------------------
const AERO_MODES: { id: AeroMode; label: string; desc: string; src: string }[] = [
  { id: 'low', label: 'Faible appui', desc: 'Ailes à plat : Cd 0,39, vitesse maximale.', src: 'S3' },
  { id: 'high', label: 'Appui élevé', desc: 'Position des ailes régulée en continu pour un appui maximal.', src: 'S3' },
  { id: 'drs', label: 'DRS', desc: 'Volets mis à plat sur les lignes droites, sur pression d’un bouton.', src: 'S1' },
  { id: 'airbrake', label: 'Airbrake', desc: 'Freinage d’urgence à haute vitesse : volets braqués au maximum.', src: 'S1' },
]

function AeroPanel() {
  const aero = useStore((s) => s.aero)
  const airflow = useStore((s) => s.airflow)
  const set = useStore((s) => s.set)
  const cur = AERO_MODES.find((m) => m.id === aero)!
  return (
    <div className="widget">
      <div className="seg" role="radiogroup" aria-label="Position des volets aérodynamiques">
        {AERO_MODES.map((m) => (
          <button key={m.id} role="radio" aria-checked={aero === m.id} className={aero === m.id ? 'is-on' : ''} onClick={() => set({ aero: m.id })}>
            {m.label}
          </button>
        ))}
      </div>
      <p className="widget__desc">
        {cur.desc} <Src id={cur.src} />
      </p>
      <label className="toggle">
        <input type="checkbox" checked={airflow} onChange={(e) => set({ airflow: e.target.checked })} />
        <span className="toggle__ui" />
        Flux d’air <Art>visualisation artistique, non issue de calculs CFD</Art>
      </label>
    </div>
  )
}

function Dial({ label, sub, min, max, src }: { label: string; sub: string; min: number; max: number; src: string }) {
  const [v, setV] = useState(0)
  const angle = ((v - min) / (max - min)) * 270 - 135
  return (
    <div className="dial">
      <button
        className="dial__knob"
        style={{ ['--a' as string]: `${angle}deg` }}
        onClick={() => setV(v >= max ? min : v + 1)}
        onContextMenu={(e) => {
          e.preventDefault()
          setV(v <= min ? max : v - 1)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setV(Math.min(max, v + 1))
          if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setV(Math.max(min, v - 1))
        }}
        aria-label={`${label} : ${v > 0 ? '+' : ''}${v}`}
      >
        <span className="dial__tick" />
      </button>
      <div className="dial__val mono">{v > 0 ? `+${v}` : v}</div>
      <div className="dial__lbl">
        {label} <small>{sub}</small> <Src id={src} />
      </div>
    </div>
  )
}

function ChassisPanel() {
  const [mode, setMode] = useState<(typeof DRIVE_MODES)[number]>('Track')
  return (
    <div className="widget">
      <p className="widget__kicker mono">Commandes au volant — réplique de l’interface</p>
      <div className="dials">
        {STEERING_CONTROLS.map((c) => (
          <Dial key={c.id} label={c.label} sub={c.sub} min={c.min} max={c.max} src={c.src} />
        ))}
        <div className="dial">
          <div className="modes">
            {DRIVE_MODES.map((m) => (
              <button key={m} className={m === mode ? 'is-on' : ''} onClick={() => setMode(m)}>
                {m}
              </button>
            ))}
          </div>
          <div className="dial__lbl">
            Modes de conduite <Src id="S1" />
          </div>
        </div>
      </div>
      <p className="widget__desc">
        {mode === 'Track'
          ? 'En mode Track, amortissement, différentiel, ESC et TC se règlent individuellement depuis le volant.'
          : `Mode ${mode} : réglages de base préconfigurés.`}
      </p>
    </div>
  )
}

function RevGauge() {
  const ref = useRef<SVGSVGElement>(null)
  const [rpm, setRpm] = useState(0)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const p = sectionProgress('engineering')
      // le régime suit le scroll dans le sous-chapitre moteur (0.52 → 0.78)
      const local = Math.min(1, Math.max(0, (p - 0.5) / 0.24))
      setRpm(Math.round(local * 9000))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const a0 = -210, a1 = 30
  const ang = (r: number) => a0 + (r / 9500) * (a1 - a0)
  const pt = (r: number, rad: number) => {
    const t = (ang(r) * Math.PI) / 180
    return [100 + Math.cos(t) * rad, 100 + Math.sin(t) * rad]
  }
  const arc = (r0: number, r1: number, rad: number) => {
    const [x0, y0] = pt(r0, rad)
    const [x1, y1] = pt(r1, rad)
    const large = ang(r1) - ang(r0) > 180 ? 1 : 0
    return `M${x0},${y0} A${rad},${rad} 0 ${large} 1 ${x1},${y1}`
  }
  // indicateur de passage : deux barres jaunes qui se remplissent puis clignotent en bleu (S3)
  const fill = Math.min(1, Math.max(0, (rpm - 6500) / 2300))
  const flash = rpm >= 8800
  return (
    <div className="rev">
      <div className={`shift ${flash ? 'is-flash' : ''}`}>
        <span style={{ transform: `scaleX(${fill})` }} />
        <span style={{ transform: `scaleX(${fill})` }} />
      </div>
      <svg ref={ref} viewBox="0 0 200 200" className="rev__svg" aria-hidden>
        <path d={arc(0, 9500, 84)} className="rev__track" />
        <path d={arc(9000, 9500, 84)} className="rev__red" />
        <path d={arc(0, Math.max(1, rpm), 84)} className="rev__val" />
        {[0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000].map((r) => {
          const [x0, y0] = pt(r, 74)
          const [x1, y1] = pt(r, 80)
          const [tx, ty] = pt(r, 62)
          return (
            <g key={r}>
              <line x1={x0} y1={y0} x2={x1} y2={y1} className="rev__tick" />
              <text x={tx} y={ty} className="rev__lbl">
                {r / 1000}
              </text>
            </g>
          )
        })}
        {[{ r: 6300, l: '465 Nm' }, { r: 8500, l: '525 PS' }].map((m) => {
          const [x, y] = pt(m.r, 94)
          return (
            <g key={m.r}>
              <circle cx={x} cy={y} r={2.2} className="rev__mark" />
            </g>
          )
        })}
      </svg>
      <div className="rev__read">
        <strong className="mono">{rpm.toString().padStart(4, '0')}</strong>
        <span className="mono">tr/min</span>
      </div>
      <ul className="rev__legend mono">
        <li>● 465 Nm à 6 300 tr/min <Src id="S7" /></li>
        <li>● 525 PS à 8 500 tr/min <Src id="S1" /></li>
        <li>9 000 tr/min au rupteur <Src id="S3" /></li>
      </ul>
      <p className="widget__desc">
        Indicateur de passage du track screen : deux barres jaunes se remplissent avec le régime et virent au bleu au moment idéal <Src id="S3" />.
        <Art>seuils d’allumage illustratifs</Art>
      </p>
    </div>
  )
}

function BrakesPanel() {
  const [pccb, setPccb] = useState(false)
  const front = pccb ? 410 : 408
  const rear = pccb ? 390 : 380
  const s = 0.22
  return (
    <div className="widget">
      <div className="seg" role="radiogroup" aria-label="Système de freinage">
        <button role="radio" aria-checked={!pccb} className={!pccb ? 'is-on' : ''} onClick={() => setPccb(false)}>
          Acier (série)
        </button>
        <button role="radio" aria-checked={pccb} className={pccb ? 'is-on' : ''} onClick={() => setPccb(true)}>
          PCCB (option)
        </button>
      </div>
      <svg viewBox="0 0 220 110" className="discs" aria-label={`Disques avant ${front} mm, arrière ${rear} mm`}>
        <g transform="translate(58 55)">
          <circle r={(front * s) / 2} className="disc" style={{ transition: 'r .6s' }} />
          <circle r={(front * s) / 2 - 12} className="disc__in" />
          <text y={4} className="disc__t">{front}</text>
        </g>
        <g transform="translate(165 55)">
          <circle r={(rear * s) / 2} className="disc" />
          <circle r={(rear * s) / 2 - 12} className="disc__in" />
          <text y={4} className="disc__t">{rear}</text>
        </g>
      </svg>
      <div className="discs__lbl mono">
        <span>Avant · mm</span>
        <span>Arrière · mm</span>
      </div>
      <p className="widget__desc">
        Disques dessinés à l’échelle relative <Src id="S1" />
      </p>
    </div>
  )
}

export function Engineering() {
  const step = useStore((s) => (s.section === 'engineering' ? s.step : -1))
  const active = Math.max(0, step)
  const topic = ENGINEERING[active]
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!body.current) return
    gsap.fromTo(
      body.current.querySelectorAll('.reveal'),
      { opacity: 0, x: -18 },
      { opacity: 1, x: 0, duration: 0.8, ease: 'expo.out', stagger: 0.045, overwrite: true },
    )
  }, [active])
  return (
    <section id="engineering" data-section="engineering" className="sec" style={{ height: '560vh' }}>
      <div className="sticky">
        <header className="chap">
          <span className="mono">03</span>
          <h2>Engineering</h2>
          <p>Technologies et réglages issus de la compétition.</p>
        </header>
        <nav className="tabs" aria-label="Sujets techniques">
          {ENGINEERING.map((t, i) => (
            <button key={t.id} className={i === active ? 'is-on' : ''} onClick={() => scrollToSection('engineering', STEPS.engineering[i] + 0.08)}>
              <span className="mono">{t.index}</span> {t.title}
            </button>
          ))}
        </nav>
        <div className="panel panel--eng" ref={body} key={topic.id}>
          <h3 className="panel__title reveal">{topic.title}</h3>
          <p className="panel__body reveal">{topic.lead}</p>
          <ul className="points">
            {topic.points.map((p) => (
              <li key={p.text} className="reveal">
                {p.text} <Src id={p.src} />
              </li>
            ))}
          </ul>
          <div className="reveal">
            {topic.id === 'aero' && <AeroPanel />}
            {topic.id === 'chassis' && <ChassisPanel />}
            {topic.id === 'engine' && <RevGauge />}
            {topic.id === 'brakes' && <BrakesPanel />}
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 04 — PERFORMANCE
// ---------------------------------------------------------------------------
function Counter({ to, decimals = 0, suffix = '', progress }: { to: number; decimals?: number; suffix?: string; progress: number }) {
  const v = to * progress
  const txt = v.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return (
    <>
      {txt}
      {suffix}
    </>
  )
}

function useSectionProgress(id: string) {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      setP(sectionProgress(id))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [id])
  return p
}

function lapTime(p: number) {
  const total = 6 * 60 + 49.328
  const t = total * p
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}

export function Performance() {
  const p = useSectionProgress('performance')
  const compact = typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches
  const k = (a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)))
  const ease = (x: number) => 1 - Math.pow(1 - x, 3)
  const P = PERFORMANCE
  return (
    <section id="performance" data-section="performance" className="sec" style={{ height: '420vh' }}>
      <div className="sticky">
        <header className="chap">
          <span className="mono">04</span>
          <h2>Performance</h2>
          <p>Chiffres officiels, mesurés par Porsche.</p>
        </header>
        <div className="perf">
          <div className="perf__big" style={{ opacity: k(0.02, 0.1) }}>
            <span className="perf__num">
              <Counter to={P.accel.s} decimals={1} progress={ease(k(0.02, 0.22))} />
              <small>s</small>
            </span>
            <span className="perf__lbl">
              0 – 100 km/h <Src id={P.accel.src} />
            </span>
          </div>
          <div className="perf__big" style={{ opacity: k(0.18, 0.26) }}>
            <span className="perf__num">
              <Counter to={P.vmax.kmh} progress={ease(k(0.18, 0.4))} />
              <small>km/h</small>
            </span>
            <span className="perf__lbl">
              Vitesse maximale <Src id={P.vmax.src} />
            </span>
          </div>
          <div className="perf__row" style={{ opacity: k(0.36, 0.44) }}>
            <div>
              <strong className="mono">
                <Counter to={P.power.ps} progress={ease(k(0.36, 0.52))} /> PS
              </strong>
              <span>
                {P.power.kw} kW à {P.power.rpm.toLocaleString('fr-FR')} tr/min <Src id={P.power.src} />
              </span>
            </div>
            <div>
              <strong className="mono">
                <Counter to={P.torque.nm} progress={ease(k(0.38, 0.54))} /> Nm
              </strong>
              <span>
                à {P.torque.rpm.toLocaleString('fr-FR')} tr/min <Src id={P.torque.src} />
              </span>
            </div>
            <div>
              <strong className="mono">
                <Counter to={P.weight.kg} progress={ease(k(0.4, 0.56))} /> kg
              </strong>
              <span>
                Poids à vide DIN <Src id={P.weight.src} />
              </span>
            </div>
          </div>
          <div className="downforce" style={{ opacity: k(0.52, 0.6) * (compact ? 1 - k(0.68, 0.72) : 1) }}>
            <p className="mono downforce__t">Appui aérodynamique total</p>
            {P.downforce.map((d, i) => (
              <div className="downforce__bar" key={d.kmh}>
                <span className="mono">{d.kmh} km/h</span>
                <div className="downforce__track">
                  <div style={{ transform: `scaleX(${ease(k(0.54 + i * 0.04, 0.7 + i * 0.04)) * (d.kg / 860)})` }} />
                </div>
                <strong className="mono">
                  {Math.round(d.kg * ease(k(0.54 + i * 0.04, 0.7 + i * 0.04)))} kg <Src id={d.src} />
                </strong>
              </div>
            ))}
          </div>
          <div className="lap" style={{ opacity: k(0.7, 0.78) }}>
            <p className="mono">Nürburgring‑Nordschleife · {P.nordschleife.km.toLocaleString('fr-FR')} km</p>
            <strong className={`lap__time mono ${k(0.72, 0.88) >= 1 ? 'is-final' : ''}`} aria-label={`Temps officiel ${P.nordschleife.time}`}>
              {lapTime(ease(k(0.72, 0.88)))}
            </strong>
            <p>
              Temps officiel {P.nordschleife.time} min · {P.nordschleife.driver} · {P.nordschleife.delta}, en présence d’un commissaire{' '}
              <Src id={P.nordschleife.src} />
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 05 — CONFIGURATION
// ---------------------------------------------------------------------------
export function Configurator() {
  const paint = useStore((s) => s.paint)
  const setPaint = useStore((s) => s.setPaint)
  const weissach = useStore((s) => s.weissach)
  const set = useStore((s) => s.set)
  const groups = useMemo(() => ['Standard', 'Spéciale', 'Paint to Sample'] as const, [])
  const cur = PAINTS.find((p) => p.id === paint)!
  return (
    <section id="configurator" data-section="configurator" className="sec" style={{ height: '240vh' }}>
      <div className="sticky">
        <header className="chap">
          <span className="mono">05</span>
          <h2>Configuration</h2>
          <p>Teintes et pack réellement proposés.</p>
        </header>
        <aside className="config interactive">
          {groups.map((g) => (
            <div className="config__group" key={g}>
              <p className="mono config__g">{g}</p>
              <div className="swatches">
                {PAINTS.filter((p) => p.group === g).map((p) => (
                  <button
                    key={p.id}
                    className={`swatch ${p.id === paint ? 'is-on' : ''}`}
                    style={{ ['--c' as string]: p.hex }}
                    onClick={() => setPaint(p.id)}
                    aria-pressed={p.id === paint}
                    aria-label={`${p.name} (${p.official})`}
                  >
                    <span className={`swatch__chip ${p.metallic ? 'is-met' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="config__cur">
            <strong>{cur.name}</strong>
            <span className="mono">
              {cur.official} <Src id={cur.src} />
            </span>
            {cur.note && <p>{cur.note}</p>}
          </div>
          <label className="toggle toggle--big">
            <input type="checkbox" checked={weissach} onChange={(e) => set({ weissach: e.target.checked })} />
            <span className="toggle__ui" />
            Pack Weissach <Src id="S1" />
          </label>
          <p className="config__w">{WEISSACH.exterior}</p>
          <ul className="config__list">
            {WEISSACH.items.map((i) => (
              <li key={i.text}>
                {i.text} <Src id={i.src} />
              </li>
            ))}
          </ul>
          <p className="config__fine">
            {CLUBSPORT.text} <Src id={CLUBSPORT.src} />
          </p>
          <p className="config__fine">
            <Art>teintes approchées à l’écran ; la zone carbone suit le texte officiel, pas un plan Porsche</Art>
          </p>
        </aside>
        <p className="drag-hint mono" aria-hidden>
          ⟲ Glisser pour tourner autour de la voiture
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 06 — DÉTAILS
// ---------------------------------------------------------------------------
const DETAIL_TEXT: Record<Exclude<FocusId, null>, { title: string; text: string; src: string }> = {
  wing: { title: 'Col de cygne', text: 'Plan principal fixe, volet supérieur hydraulique. Bord supérieur au‑dessus du toit.', src: 'S1' },
  nostrils: { title: 'Naseaux du capot', text: 'Sortie de l’air chaud du radiateur central, dirigé vers la gauche et la droite.', src: 'S3' },
  louvres: { title: 'Louvres d’aile', text: 'Ventilation des passages de roue avant par des ouvertures à lamelles.', src: 'S1' },
  wheel: { title: 'Écrou central & freins', text: 'Roues forgées à écrou central. Avant : disques 408 mm, étriers 6 pistons.', src: 'S1' },
  diffuser: { title: 'Diffuseur', text: 'Issu de la 911 GT3, légèrement adapté ; soubassement entièrement caréné.', src: 'S1' },
  cockpit: { title: 'Habitacle', text: 'Baquets en CFRP de série, volant Race‑Tex de 360 mm, track screen.', src: 'S3' },
}

export function Details() {
  const focus = useStore((s) => s.focus)
  const set = useStore((s) => s.set)
  const d = focus ? DETAIL_TEXT[focus] : null
  return (
    <section id="details" data-section="details" className="sec" style={{ height: '240vh' }}>
      <div className="sticky">
        <header className="chap">
          <span className="mono">06</span>
          <h2>Détails</h2>
          <p>Choisissez un composant ou tournez librement.</p>
        </header>
        <nav className="detail-nav interactive" aria-label="Composants">
          {DETAIL_POINTS.map((p) => (
            <button key={p.id} className={focus === p.id ? 'is-on' : ''} onClick={() => set({ focus: focus === p.id ? null : p.id })}>
              {p.label}
            </button>
          ))}
          {focus && (
            <button className="detail-nav__reset" onClick={() => set({ focus: null })}>
              ← Vue d’ensemble
            </button>
          )}
        </nav>
        {d && (
          <div className="detail-card" key={focus}>
            <h3>{d.title}</h3>
            <p>
              {d.text} <Src id={d.src} />
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 07 — FINALE + SOURCES
// ---------------------------------------------------------------------------
export function Finale() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const split = new SplitText('.finale__title', { type: 'words,chars', mask: 'chars' })
      gsap.from(split.chars, {
        yPercent: 120,
        ease: 'expo.out',
        stagger: 0.03,
        duration: 1.2,
        scrollTrigger: { trigger: root.current, start: '45% bottom', toggleActions: 'play none none reverse' },
      })
      return () => split.revert()
    },
    { scope: root },
  )
  return (
    <section id="finale" data-section="finale" ref={root} className="sec" style={{ height: '220vh' }}>
      <div className="sticky sticky--finale">
        <p className="mono finale__k">07 — Fin de session</p>
        <h2 className="finale__title">Rennsport.</h2>
        <p className="finale__sub">
          Six cylindres atmosphériques, 9 000 tr/min, 860 kg d’appui à 285 km/h <Src id="S1" />
          <Src id="S3" />
        </p>
      </div>
    </section>
  )
}

export function Sources({ modelCredit }: { modelCredit: { title: string; author: string; url: string; license: string; licenseUrl: string } }) {
  const P = PERFORMANCE
  return (
    <section id="sources" className="sources interactive">
      <div className="sources__grid">
        <div>
          <h2>Sources &amp; méthode</h2>
          <p>
            Toutes les données chiffrées proviennent des communications officielles de Porsche AG et de Porsche Cars North America. Chaque valeur
            renvoie à sa source (pastille <span className="src src--static">S1</span>). Aucune donnée n’a été estimée.
          </p>
          <ol className="sources__list">
            {SOURCES.map((s) => (
              <li key={s.id} id={`src-${s.id}`}>
                <span className="src src--static">{s.id}</span>
                <div>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                  <small>
                    {s.publisher} · {s.date}
                    {s.note ? ` — ${s.note}` : ''}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3>Vérifié / artistique</h3>
          <ul className="legend">
            <li>
              <span className="src src--static">S#</span> Donnée officielle sourcée.
            </li>
            <li>
              <Art>Interprétation artistique</Art> Mise en scène, éclairage, flux d’air, teintes approchées à l’écran, zones carbone du pack Weissach,
              indicateur de passage, arrivée du véhicule.
            </li>
          </ul>
          <h3>Modèle 3D</h3>
          <p>
            «&nbsp;
            <a href={modelCredit.url} target="_blank" rel="noreferrer">
              {modelCredit.title}
            </a>
            &nbsp;» par {modelCredit.author}, sous licence{' '}
            <a href={modelCredit.licenseUrl} target="_blank" rel="noreferrer">
              {modelCredit.license}
            </a>
            . Modèle optimisé (simplification, compression) et matériaux recréés pour ce projet. Ce modèle tiers n’est pas un fichier CAO Porsche :
            ses proportions sont fidèles à l’œil mais non certifiées.
          </p>
          <h3>Consommation</h3>
          <p>
            911 GT3 RS (WLTP) : consommation mixte {P.wltp.l100.toLocaleString('fr-FR')} l/100 km ; émissions de CO₂ mixtes {P.wltp.co2} g/km ;
            classe CO₂ {P.wltp.cls} <Src id={P.wltp.src} />.
          </p>
          <h3>Mentions</h3>
          <p className="fine">
            Étude conceptuelle non officielle, réalisée à titre de démonstration. Ce site n’est ni produit, ni approuvé, ni affilié à Dr. Ing. h.c.
            F. Porsche AG. « Porsche », « 911 », « GT3 RS », « Weissach » et « PDK » sont des marques de Porsche AG. Aucun logo, aucune photographie ni
            aucun texte de Porsche n’est reproduit.
          </p>
        </div>
      </div>
    </section>
  )
}
