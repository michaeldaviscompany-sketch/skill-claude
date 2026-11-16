import { create } from 'zustand'
import { DEFAULT_PAINT } from './data/paints'

export type AeroMode = 'low' | 'high' | 'drs' | 'airbrake'
export type FocusId = 'wing' | 'nostrils' | 'louvres' | 'wheel' | 'diffuser' | 'cockpit' | null

type State = {
  ready: boolean
  /** section DOM active (id) */
  section: string
  /** index du sujet actif dans les sections à étapes */
  step: number
  paint: string
  prevPaint: string
  weissach: boolean
  aero: AeroMode
  airflow: boolean
  focus: FocusId
  quality: 'high' | 'low'
  reducedMotion: boolean
  set: (p: Partial<State>) => void
  setPaint: (id: string) => void
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  section: 'hero',
  step: 0,
  paint: DEFAULT_PAINT,
  prevPaint: DEFAULT_PAINT,
  weissach: true,
  aero: 'low',
  airflow: true,
  focus: null,
  // ?lite force la qualité basse (tests headless sans GPU) ; mobiles : qualité basse d'emblée
  quality:
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).has('lite') || window.matchMedia('(pointer: coarse)').matches)
      ? 'low'
      : 'high',
  reducedMotion:
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  set: (p) => set(p),
  setPaint: (id) => {
    const cur = get().paint
    if (id === cur) return
    set({ prevPaint: cur, paint: id })
  },
}))

/** Valeurs mutables lues à chaque frame (jamais via setState — cf. skill react-three-fiber). */
export const frame = {
  scrollY: 0,
  velocity: 0,
  pointer: { x: 0, y: 0 },
  /** progression de l'intro (0 → 1), pilotée par GSAP */
  intro: 0,
  /** l'utilisateur manipule la caméra (OrbitControls) */
  userControl: false,
}
