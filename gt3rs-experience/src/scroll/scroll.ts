import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ANCHORS, SHOTS, STEPS, mixShots, cloneShot, type Shot } from '../three/shots'
import { frame, useStore } from '../store'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null
let anchorY: number[] = []
const sectionRanges = new Map<string, { top: number; len: number }>()

/** Smooth scroll Lenis synchronisé avec ScrollTrigger (skill scroll-3d-scene, approche A). */
export function initScroll() {
  const reduced = useStore.getState().reducedMotion
  lenis = new Lenis({ lerp: reduced ? 1 : 0.085, smoothWheel: !reduced, wheelMultiplier: 0.9 })
  lenis.on('scroll', (e: Lenis) => {
    frame.scrollY = e.scroll
    frame.velocity = e.velocity
    ScrollTrigger.update()
    updateSectionState()
  })
  // utilisé par les tests visuels (scripts/shoot.cjs)
  ;(window as unknown as { __lenisJump: (y: number) => void }).__lenisJump = (y) => lenis?.scrollTo(y, { immediate: true, force: true })
  const raf = (time: number) => lenis?.raf(time * 1000)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)

  const measure = () => {
    measureAnchors()
    updateSectionState()
  }
  ScrollTrigger.addEventListener('refresh', measure)
  window.addEventListener('resize', measure)
  measure()
  return () => {
    gsap.ticker.remove(raf)
    ScrollTrigger.removeEventListener('refresh', measure)
    window.removeEventListener('resize', measure)
    lenis?.destroy()
    lenis = null
  }
}

export const getLenis = () => lenis

export function scrollToSection(id: string, frac = 0, immediate = false) {
  const r = sectionRanges.get(id)
  if (!r || !lenis) return
  lenis.scrollTo(r.top + r.len * frac, { duration: immediate ? 0 : 1.6, immediate })
}

export function lockScroll(lock: boolean) {
  if (!lenis) return
  if (lock) lenis.stop()
  else lenis.start()
}

function measureAnchors() {
  sectionRanges.clear()
  const vh = window.innerHeight
  document.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
    const top = el.getBoundingClientRect().top + window.scrollY
    sectionRanges.set(el.dataset.section!, { top, len: Math.max(1, el.offsetHeight - vh) })
  })
  anchorY = ANCHORS.map((a) => {
    const r = sectionRanges.get(a.section)
    return r ? r.top + a.at * r.len : 0
  })
}

/** Fraction (0..1) de la course de scroll d'une section. */
export function sectionProgress(id: string, y = frame.scrollY) {
  const r = sectionRanges.get(id)
  if (!r) return 0
  return Math.min(1, Math.max(0, (y - r.top) / r.len))
}

function updateSectionState() {
  const y = frame.scrollY + window.innerHeight * 0.5
  let current = 'hero'
  sectionRanges.forEach((r, id) => {
    if (y >= r.top) current = id
  })
  const st = useStore.getState()
  let step = 0
  const steps = STEPS[current]
  if (steps) {
    const p = sectionProgress(current)
    steps.forEach((b, i) => {
      if (p >= b - 0.02) step = i
    })
  }
  if (st.section !== current || st.step !== step) st.set({ section: current, step })
}

const tmp = cloneShot(SHOTS.heroIntro)

/** Plan interpolé pour une position de scroll. */
export function shotAt(y: number): Shot {
  if (!anchorY.length) return mixShots(SHOTS.heroIntro, SHOTS.heroIntro, 0, tmp)
  if (y <= anchorY[0]) return mixShots(SHOTS[ANCHORS[0].shot], SHOTS[ANCHORS[0].shot], 0, tmp)
  for (let i = 0; i < anchorY.length - 1; i++) {
    const a = anchorY[i]
    const b = anchorY[i + 1]
    if (y >= a && y <= b) {
      const t = b - a < 1 ? 1 : (y - a) / (b - a)
      return mixShots(SHOTS[ANCHORS[i].shot], SHOTS[ANCHORS[i + 1].shot], t, tmp)
    }
  }
  const last = SHOTS[ANCHORS[ANCHORS.length - 1].shot]
  return mixShots(last, last, 0, tmp)
}
