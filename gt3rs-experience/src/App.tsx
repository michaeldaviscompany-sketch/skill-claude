import { Component, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Experience } from './three/Experience'
import { Loader } from './ui/Loader'
import { Configurator, Design, Details, Engineering, Finale, Hero, Performance, Sources } from './ui/Sections'
import { initScroll, lockScroll, scrollToSection } from './scroll/scroll'
import { frame, useStore } from './store'

export const MODEL_CREDIT = {
  title: 'Porsche 911 GT3 RS (992)',
  author: 'DR1KING100K (Sketchfab)',
  url: 'https://sketchfab.com/3d-models/porsche-911-gt3-rs-992-70bf9c89c71442149009193233de43d5',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
}

const CHAPTERS = [
  ['hero', '01', 'Arrivée'],
  ['design', '02', 'Design'],
  ['engineering', '03', 'Engineering'],
  ['performance', '04', 'Performance'],
  ['configurator', '05', 'Configuration'],
  ['details', '06', 'Détails'],
  ['finale', '07', 'Final'],
] as const

class GLBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    if (this.state.error)
      return (
        <div className="gl-error" role="alert">
          <p className="mono">WebGL / modèle 3D indisponible</p>
          <p>L’expérience 3D n’a pas pu démarrer sur cet appareil. Aucune image de substitution n’est affichée à sa place.</p>
        </div>
      )
    return this.props.children
  }
}

function Header() {
  const section = useStore((s) => s.section)
  const [open, setOpen] = useState(false)
  const idx = CHAPTERS.findIndex((c) => c[0] === section)
  const cur = CHAPTERS[Math.max(0, idx)]
  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])
  return (
    <header className="hud">
      <a className="hud__brand" href="#hero" onClick={(e) => (e.preventDefault(), scrollToSection('hero'))}>
        <strong>911 GT3 RS</strong>
        <span className="mono">Type 992</span>
      </a>
      <div className="hud__nav">
        <button className="hud__chap mono" aria-expanded={open} aria-controls="chapters" onClick={() => setOpen(!open)}>
          <span>{cur[1]}</span>
          <span className="hud__sep" />
          <span>{cur[2]}</span>
          <span className="hud__caret" aria-hidden>
            {open ? '−' : '+'}
          </span>
        </button>
        <nav id="chapters" className={`chapters ${open ? 'is-open' : ''}`} aria-label="Chapitres" hidden={!open}>
          {CHAPTERS.map(([id, n, label]) => (
            <button
              key={id}
              className={id === section ? 'is-on' : ''}
              onClick={() => {
                setOpen(false)
                scrollToSection(id, id === 'hero' ? 0 : 0.02)
              }}
            >
              <span className="mono">{n}</span> {label}
            </button>
          ))}
        </nav>
      </div>
      <a className="hud__src mono" href="#sources" onClick={(e) => (e.preventDefault(), document.getElementById('sources')?.scrollIntoView())}>
        Sources
      </a>
    </header>
  )
}

export default function App() {
  const [started, setStarted] = useState(false)
  const section = useStore((s) => s.section)
  const reduced = useStore((s) => s.reducedMotion)

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    const dispose = initScroll()
    lockScroll(true)
    const onMove = (e: PointerEvent) => {
      frame.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      frame.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      dispose()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  const startIntro = useCallback(() => {
    setStarted(true)
    gsap.to(frame, {
      intro: 1,
      duration: reduced ? 0.01 : 5.2,
      ease: 'none',
      onComplete: () => {
        lockScroll(false)
        ScrollTrigger.refresh()
      },
    })
  }, [reduced])

  const orbit = section === 'configurator' || section === 'details'

  return (
    <>
      <div className={`stage ${orbit ? 'stage--orbit' : ''}`}>
        <GLBoundary>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </GLBoundary>
      </div>
      <Header />
      <main className="story">
        <Hero started={started} />
        <Design />
        <Engineering />
        <Performance />
        <Configurator />
        <Details />
        <Finale />
        <Sources modelCredit={MODEL_CREDIT} />
      </main>
      <Loader onDone={startIntro} />
    </>
  )
}
