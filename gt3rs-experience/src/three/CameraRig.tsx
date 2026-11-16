import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PerspectiveCamera, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { damp, damp3 } from 'maath/easing'
import { shotAt } from '../scroll/scroll'
import { frame, useStore, type FocusId } from '../store'

// Plans rapprochés de la section Détails (espace voiture, m)
export const FOCUS: Record<Exclude<FocusId, null>, { pos: [number, number, number]; target: [number, number, number]; fov: number }> = {
  wing: { pos: [-2.2, 2.2, -4.3], target: [0, 1.2, -1.9], fov: 24 },
  nostrils: { pos: [-0.9, 2.6, 3.4], target: [0, 0.8, 1.35], fov: 24 },
  louvres: { pos: [-2.7, 1.3, 2.3], target: [-0.8, 0.72, 1.05], fov: 22 },
  wheel: { pos: [-2.6, 0.55, 2.1], target: [-0.88, 0.36, 1.22], fov: 20 },
  diffuser: { pos: [-1.4, 0.75, -5.6], target: [0, 0.45, -2.0], fov: 26 },
  cockpit: { pos: [-0.12, 1.06, -0.42], target: [0.36, 0.8, 0.45], fov: 58 },
}

const ORBIT_SECTIONS = new Set(['configurator', 'details'])

export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useRef<OrbitControlsImpl>(null)
  const target = useMemo(() => new Vector3(0, 0.6, 0), [])
  const goal = useMemo(() => ({ pos: new Vector3(), target: new Vector3(), fov: 30 }), [])
  const section = useStore((s) => s.section)
  const focus = useStore((s) => s.focus)
  const orbit = ORBIT_SECTIONS.has(section)

  // Quitter une section orbitale rend la main à la chorégraphie
  useEffect(() => {
    if (!orbit) frame.userControl = false
  }, [orbit])
  useEffect(() => {
    if (focus) frame.userControl = false
  }, [focus])

  const rel = useMemo(() => new Vector3(), [])
  const offset = useRef({ x: 0, y: 0 })
  const right = useMemo(() => new Vector3(), [])

  useFrame((_, dt) => {
    const st = useStore.getState()
    const shot = shotAt(frame.scrollY)
    const f = st.section === 'details' && st.focus ? FOCUS[st.focus] : null
    goal.pos.set(...(f ? f.pos : shot.pos))
    goal.target.set(...(f ? f.target : shot.target))
    goal.fov = f ? f.fov : shot.fov

    // Portrait : on recule pour garder la voiture entière dans le cadre
    const aspect = size.width / size.height
    if (aspect < 1.2 && !f) {
      const k = Math.min(2.3, 1.35 / aspect)
      rel.subVectors(goal.pos, goal.target).multiplyScalar(k)
      goal.pos.copy(goal.target).add(rel)
    }
    // Léger « caméra épaule » piloté par le pointeur (hors manipulation)
    if (!frame.userControl && !st.reducedMotion) {
      right.subVectors(goal.target, goal.pos).cross(camera.up).normalize()
      goal.pos.addScaledVector(right, frame.pointer.x * 0.12)
      goal.pos.y += frame.pointer.y * 0.06
    }

    // Cadrage décentré : le sujet laisse la place aux panneaux de texte
    const portrait = aspect < 1.2
    const wantX = f || portrait ? 0 : shot.sx
    const wantY = f ? 0 : portrait ? (st.section === 'finale' ? 0 : 0.17) : shot.sy
    damp(offset.current, 'x', wantX, 0.35, dt)
    damp(offset.current, 'y', wantY, 0.35, dt)
    if (Math.abs(offset.current.x) > 1e-4 || Math.abs(offset.current.y) > 1e-4)
      camera.setViewOffset(size.width, size.height, -offset.current.x * size.width, offset.current.y * size.height, size.width, size.height)
    else camera.clearViewOffset()

    // L'utilisateur manipule : OrbitControls (mis à jour par drei) a la main
    if (frame.userControl && controls.current) return
    const lambda = st.reducedMotion ? 0.01 : f ? 0.45 : 0.28
    damp3(camera.position, goal.pos, lambda, dt)
    damp3(target, goal.target, lambda, dt)
    damp(camera, 'fov', goal.fov, lambda, dt)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    if (controls.current) controls.current.target.copy(target)
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault={false}
      enabled={orbit}
      enableZoom={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI / 2 - 0.04}
      onStart={() => {
        frame.userControl = true
        if (useStore.getState().focus) useStore.getState().set({ focus: null })
      }}
    />
  )
}
