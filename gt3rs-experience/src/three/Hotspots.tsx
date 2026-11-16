import { Html } from '@react-three/drei'
import { DESIGN } from '../data/specs'
import { useStore, type FocusId } from '../store'

export const DETAIL_POINTS: { id: Exclude<FocusId, null>; label: string; pos: [number, number, number] }[] = [
  { id: 'wing', label: 'Aileron', pos: [0.55, 1.36, -1.95] },
  { id: 'nostrils', label: 'Naseaux', pos: [0.18, 0.93, 1.45] },
  { id: 'louvres', label: 'Louvres', pos: [0.88, 0.8, 1.2] },
  { id: 'wheel', label: 'Roue & freins', pos: [0.95, 0.36, 1.22] },
  { id: 'diffuser', label: 'Diffuseur', pos: [0.45, 0.3, -2.18] },
  { id: 'cockpit', label: 'Habitacle', pos: [-0.35, 1.08, 0.1] },
]

/** Repères 3D (HTML projeté) : un seul repère par étape en Design, cliquables en Détails. */
export function Hotspots() {
  const section = useStore((s) => s.section)
  const step = useStore((s) => s.step)
  const focus = useStore((s) => s.focus)
  const set = useStore((s) => s.set)

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
  if (section === 'details') {
    return (
      <>
        {DETAIL_POINTS.map((p) => (
          <Html key={p.id} position={p.pos} center zIndexRange={[20, 0]}>
            <button
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
  return null
}
