import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Vector3 } from 'three'
import { DESIGN } from '../data/specs'
import { useStore, type FocusId } from '../store'

/** Points d'intérêt (espace voiture) + normale de la surface : un repère n'est
 *  affiché que si sa face est tournée vers la caméra (pas de repère « à travers » la caisse). */
export const DETAIL_POINTS: { id: Exclude<FocusId, null>; label: string; pos: [number, number, number]; n: [number, number, number] }[] = [
  { id: 'wing', label: 'Aileron', pos: [-0.5, 1.34, -2.0], n: [0, 1, -0.4] },
  { id: 'nostrils', label: 'Naseaux', pos: [0.1, 0.86, 1.6], n: [0, 1, 0.3] },
  { id: 'louvres', label: 'Louvres', pos: [-0.84, 0.78, 1.0], n: [-1, 0.6, 0] },
  { id: 'wheel', label: 'Roue & freins', pos: [-0.95, 0.34, 1.22], n: [-1, 0, 0] },
  { id: 'diffuser', label: 'Diffuseur', pos: [0, 0.3, -2.26], n: [0, -0.2, -1] },
  { id: 'cockpit', label: 'Habitacle', pos: [-0.35, 1.0, 0.05], n: [-0.6, 1, 0] },
]

const tmp = new Vector3()
const nrm = new Vector3()

function DetailMarkers() {
  const focus = useStore((s) => s.focus)
  const set = useStore((s) => s.set)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  useFrame(({ camera }) => {
    DETAIL_POINTS.forEach((p, i) => {
      const el = refs.current[i]
      if (!el) return
      tmp.set(...p.pos).sub(camera.position).normalize()
      nrm.set(...p.n).normalize()
      el.classList.toggle('is-back', tmp.dot(nrm) > 0.05)
    })
  })
  return (
    <>
      {DETAIL_POINTS.map((p, i) => (
        <Html key={p.id} position={p.pos} center zIndexRange={[20, 0]}>
          <button
            ref={(el) => {
              refs.current[i] = el
            }}
            className={`hs hs--btn ${focus === p.id ? 'is-active' : ''}`}
            onClick={() => set({ focus: focus === p.id ? null : p.id })}
            aria-label={`Rapprocher la caméra : ${p.label}`}
          >
            <span className="hs__ring" />
            <span className="hs__label">{p.label}</span>
          </button>
        </Html>
      ))}
    </>
  )
}

/** Repères 3D (HTML projeté) : un seul repère par étape en Design, cliquables en Détails. */
export function Hotspots() {
  const section = useStore((s) => s.section)
  const step = useStore((s) => s.step)

  if (section === 'design') {
    const item = DESIGN[step]
    if (!item) return null
    return (
      <Html position={item.anchor} center zIndexRange={[20, 0]} key={item.id}>
        <div className="hs hs--pulse" aria-hidden>
          <span className="hs__ring" />
          <span className="hs__label">{item.index}</span>
        </div>
      </Html>
    )
  }
  if (section === 'details') return <DetailMarkers />
  return null
}
