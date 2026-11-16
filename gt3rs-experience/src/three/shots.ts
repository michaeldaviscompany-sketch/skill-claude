// Chorégraphie caméra : chaque « plan » décrit la caméra ET l'état de la scène.
// Le scroll interpole entre des ancres posées dans les sections DOM
// (approche A du skill scroll-3d-scene : Lenis + ScrollTrigger = source unique du scroll).

export type Shot = {
  pos: [number, number, number]
  target: [number, number, number]
  fov: number
  /** intensité du studio (0 = noir total) */
  studio: number
  /** lumières de contour / balayage */
  rim: number
  /** accent rouge */
  red: number
  /** vitesse simulée : roues, sol, flou de vitesse */
  speed: number
  /** visibilité de la visualisation des flux d'air (artistique) */
  air: number
  /** opacité de la typographie monumentale 3D */
  type: number
  /** lacet de la voiture (rad) */
  yaw: number
  /** décalage de cadrage (fraction de largeur) : >0 pousse le sujet à droite */
  sx: number
  /** décalage vertical : >0 remonte le sujet dans le cadre */
  sy: number
}

const base: Shot = {
  pos: [5, 1.2, 6],
  target: [0, 0.6, 0],
  fov: 30,
  studio: 1,
  rim: 0.6,
  red: 0.2,
  speed: 0,
  air: 0,
  type: 0,
  yaw: 0,
  sx: 0,
  sy: 0,
}

const s = (p: Partial<Shot>): Shot => ({ ...base, ...p })

export const SHOTS = {
  heroIntro: s({ pos: [0.0, 0.75, 9.8], target: [0, 0.62, 0], fov: 24, type: 1, rim: 1, red: 0.25, studio: 0.85, sy: 0.1 }),
  heroSide: s({ pos: [6.2, 1.15, 4.6], target: [0, 0.55, 0.1], fov: 28, type: 0.35, rim: 0.8, sy: 0.1 }),
  wing: s({ pos: [-3.3, 2.35, -5.4], target: [0, 1.12, -1.65], fov: 26, rim: 0.9, red: 0.45 , sx: 0.13}),
  nostrils: s({ pos: [1.4, 3.7, 4.3], target: [0, 0.75, 1.15], fov: 24 , sx: 0.13}),
  louvres: s({ pos: [3.9, 1.05, 3.1], target: [0.7, 0.68, 1.05], fov: 22 , sx: 0.13}),
  fins: s({ pos: [3.4, 3.1, -2.1], target: [0.2, 1.05, -0.45], fov: 24 , sx: 0.13}),
  diffuser: s({ pos: [-2.2, 0.85, -6.9], target: [0, 0.55, -1.9], fov: 26, red: 0.45, rim: 1, sx: 0.13 }),
  aero: s({ pos: [-6.4, 1.9, 1.8], target: [0, 0.75, -0.35], fov: 30, air: 1, studio: 0.55, rim: 0.5 , sx: 0.1}),
  chassis: s({ pos: [3.3, 0.48, 3.6], target: [0.75, 0.42, 1.2], fov: 24, studio: 0.9 , sx: 0.13}),
  engine: s({ pos: [0.4, 2.6, -6.4], target: [0, 0.95, -1.5], fov: 26, red: 0.7, rim: 1 , sx: 0.13}),
  brakes: s({ pos: [2.75, 0.5, 2.15], target: [0.82, 0.36, 1.22], fov: 20 , sx: 0.13}),
  perf: s({ pos: [6.8, 0.42, -0.6], target: [0, 0.55, 0.35], fov: 22, speed: 1, studio: 0.6, rim: 1, red: 0.5 , sx: 0.06}),
  perfEnd: s({ pos: [3.2, 0.32, 6.6], target: [0, 0.55, 0], fov: 22, speed: 1, studio: 0.6, rim: 1, red: 0.6 , sx: 0.06}),
  config: s({ pos: [5.4, 1.8, 5.4], target: [0, 0.55, 0], fov: 28, studio: 1.05, rim: 0.5, red: 0.15 , sx: -0.13}),
  details: s({ pos: [-5.2, 1.7, 5.2], target: [0, 0.55, 0], fov: 28, studio: 1, rim: 0.6 }),
  finale: s({ pos: [0, 0.82, 9.6], target: [0, 0.58, 0], fov: 21, studio: 0.06, rim: 1.2, red: 0.0, type: 0 }),
  finaleEnd: s({ pos: [0, 0.6, 7.6], target: [0, 0.62, 0], fov: 21, studio: 0.0, rim: 1.4, red: 0.0, type: 1 }),
} satisfies Record<string, Shot>

export type ShotId = keyof typeof SHOTS

/** Ancre = un plan posé à une fraction (0..1) de la course de scroll d'une section. */
export type Anchor = { shot: ShotId; section: string; at: number }

export const ANCHORS: Anchor[] = [
  { shot: 'heroIntro', section: 'hero', at: 0 },
  { shot: 'heroSide', section: 'hero', at: 1 },
  { shot: 'wing', section: 'design', at: 0.06 },
  { shot: 'wing', section: 'design', at: 0.16 },
  { shot: 'nostrils', section: 'design', at: 0.3 },
  { shot: 'nostrils', section: 'design', at: 0.38 },
  { shot: 'louvres', section: 'design', at: 0.52 },
  { shot: 'louvres', section: 'design', at: 0.6 },
  { shot: 'fins', section: 'design', at: 0.74 },
  { shot: 'fins', section: 'design', at: 0.8 },
  { shot: 'diffuser', section: 'design', at: 0.94 },
  { shot: 'diffuser', section: 'design', at: 1 },
  { shot: 'aero', section: 'engineering', at: 0.04 },
  { shot: 'aero', section: 'engineering', at: 0.2 },
  { shot: 'chassis', section: 'engineering', at: 0.32 },
  { shot: 'chassis', section: 'engineering', at: 0.46 },
  { shot: 'engine', section: 'engineering', at: 0.58 },
  { shot: 'engine', section: 'engineering', at: 0.72 },
  { shot: 'brakes', section: 'engineering', at: 0.84 },
  { shot: 'brakes', section: 'engineering', at: 1 },
  { shot: 'perf', section: 'performance', at: 0.05 },
  { shot: 'perfEnd', section: 'performance', at: 1 },
  { shot: 'config', section: 'configurator', at: 0.15 },
  { shot: 'config', section: 'configurator', at: 1 },
  { shot: 'details', section: 'details', at: 0.15 },
  { shot: 'details', section: 'details', at: 1 },
  { shot: 'finale', section: 'finale', at: 0.0 },
  { shot: 'finaleEnd', section: 'finale', at: 0.75 },
]

/** Étapes (sous-sujets) des sections pinnées : bornes en fraction de section. */
export const STEPS: Record<string, number[]> = {
  design: [0, 0.23, 0.45, 0.67, 0.87],
  engineering: [0, 0.26, 0.52, 0.78],
}

const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function mixShots(a: Shot, b: Shot, t: number, out: Shot): Shot {
  const k = smooth(Math.min(1, Math.max(0, t)))
  for (let i = 0; i < 3; i++) {
    out.pos[i] = lerp(a.pos[i], b.pos[i], k)
    out.target[i] = lerp(a.target[i], b.target[i], k)
  }
  out.fov = lerp(a.fov, b.fov, k)
  out.studio = lerp(a.studio, b.studio, k)
  out.rim = lerp(a.rim, b.rim, k)
  out.red = lerp(a.red, b.red, k)
  out.speed = lerp(a.speed, b.speed, k)
  out.air = lerp(a.air, b.air, k)
  out.type = lerp(a.type, b.type, k)
  out.yaw = lerp(a.yaw, b.yaw, k)
  out.sx = lerp(a.sx, b.sx, k)
  out.sy = lerp(a.sy, b.sy, k)
  return out
}

export const cloneShot = (sh: Shot): Shot => ({ ...sh, pos: [...sh.pos], target: [...sh.target] })
