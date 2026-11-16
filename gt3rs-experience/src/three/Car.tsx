import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Color, Group, Mesh, Object3D, Vector3, type Material } from 'three'
import { damp } from 'maath/easing'
import { PAINTS } from '../data/paints'
import { shotAt } from '../scroll/scroll'
import { frame, useStore } from '../store'
import { Airflow, buildHeightField, type HeightField } from './Airflow'
import { Hotspots } from './Hotspots'
import {
  carUniforms,
  createBlackTrim,
  createBrushedAlu,
  createCaliper,
  createCarbonMaterial,
  createDisc,
  createGlass,
  createGlossBlack,
  createInterior,
  createLensGlass,
  createLightEmissive,
  createPaintMaterial,
  createRim,
  createTyre,
} from './materials'
import { MODEL_URL, classify, WEISSACH_BOXES, type Role } from './modelConfig'

export const CAR_LENGTH = 4.572 // longueur, m — sert uniquement à mettre le modèle à l'échelle

type Rig = {
  wheels: Object3D[]
  wingFlap: Object3D | null
  wingZ: number
  wingY: number
  field: HeightField
  headlights: Mesh[]
  taillights: Mesh[]
}

export function Car() {
  const gltf = useGLTF(MODEL_URL)
  const root = useRef<Group>(null!)
  const paint = useMemo(() => createPaintMaterial(), [])
  const mats = useMemo(
    () => ({
      carbon: createCarbonMaterial(),
      carbonSatin: createCarbonMaterial({ satin: true }),
      glass: createGlass(),
      lens: createLensGlass(),
      tyre: createTyre(),
      rim: createRim(),
      alu: createBrushedAlu(),
      trim: createBlackTrim(),
      gloss: createGlossBlack(),
      disc: createDisc(),
      caliper: createCaliper(),
      interior: createInterior(),
      head: createLightEmissive('#eef3ff', 0),
      tail: createLightEmissive('#ff1010', 0),
    }),
    [],
  )

  // Préparation du modèle : orientation, échelle, matériaux, pivots.
  const { scene, rig } = useMemo(() => {
    const scene = gltf.scene.clone(true)
    scene.updateMatrixWorld(true)
    const box = new Box3().setFromObject(scene)
    const size = box.getSize(new Vector3())
    // axe longitudinal = plus grande dimension horizontale
    const holder = new Group()
    holder.add(scene)
    if (size.x > size.z) scene.rotation.y = Math.PI / 2
    holder.updateMatrixWorld(true)
    let b = new Box3().setFromObject(holder)
    const len = Math.max(b.max.z - b.min.z, 0.001)
    const k = CAR_LENGTH / len
    scene.scale.multiplyScalar(k)
    holder.updateMatrixWorld(true)
    b = new Box3().setFromObject(holder)
    // l'arrière est l'extrémité qui porte les points les plus hauts (l'aileron dépasse le toit — S1)
    const pts: number[] = []
    holder.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const pos = m.geometry.getAttribute('position')
      const v = new Vector3()
      const step = Math.max(1, Math.floor(pos.count / 4000))
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
        pts.push(v.x, v.y, v.z)
      }
    })
    let topZ = 0, topY = -Infinity
    for (let i = 0; i < pts.length; i += 3) if (pts[i + 1] > topY) { topY = pts[i + 1]; topZ = pts[i + 2] }
    const cz = (b.min.z + b.max.z) / 2
    if (topZ > cz) scene.rotation.y += Math.PI
    holder.updateMatrixWorld(true)
    b = new Box3().setFromObject(holder)
    const c = b.getCenter(new Vector3())
    scene.position.x -= c.x
    scene.position.z -= c.z
    scene.position.y -= b.min.y
    holder.updateMatrixWorld(true)

    // Matériaux
    const headlights: Mesh[] = []
    const taillights: Mesh[] = []
    const wheelMeshes: Mesh[] = []
    let wingFlap: Mesh | null = null
    const roleMat: Record<Role, Material | null> = {
      paint: paint.mat,
      carbon: mats.carbon,
      carbonSatin: mats.carbonSatin,
      glass: mats.glass,
      lens: mats.lens,
      tyre: mats.tyre,
      rim: mats.rim,
      alu: mats.alu,
      trim: mats.trim,
      gloss: mats.gloss,
      disc: mats.disc,
      caliper: mats.caliper,
      interior: mats.interior,
      head: mats.head,
      tail: mats.tail,
      keep: null,
    }
    holder.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      const matName = (Array.isArray(m.material) ? m.material[0]?.name : m.material?.name) ?? ''
      const r = classify(m.name, matName)
      const nm = roleMat[r.role]
      if (nm) m.material = nm
      if (r.wheel) wheelMeshes.push(m)
      if (r.role === 'head') headlights.push(m)
      if (r.role === 'tail') taillights.push(m)
      if (r.wingFlap) wingFlap = m
    })

    // Pivots de roue : regroupement par quart (avant/arrière, gauche/droite)
    const wheels: Object3D[] = []
    const quads = new Map<string, Mesh[]>()
    for (const m of wheelMeshes) {
      const bb = new Box3().setFromObject(m)
      const cc = bb.getCenter(new Vector3())
      const key = `${cc.x > 0 ? 'R' : 'L'}${cc.z > 0 ? 'F' : 'B'}`
      if (!quads.has(key)) quads.set(key, [])
      quads.get(key)!.push(m)
    }
    quads.forEach((list) => {
      const bb = new Box3()
      list.forEach((m) => bb.expandByObject(m))
      const center = bb.getCenter(new Vector3())
      const pivot = new Group()
      pivot.position.copy(center)
      holder.add(pivot)
      pivot.updateMatrixWorld(true)
      list.forEach((m) => pivot.attach(m))
      wheels.push(pivot)
    })

    // Volet supérieur de l'aileron : pivot sur son bord d'attaque
    let flapPivot: Object3D | null = null
    let wingZ = b.min.z + 0.35
    let wingY = b.max.y - 0.05
    if (wingFlap) {
      const fm = wingFlap as Mesh
      const bb = new Box3().setFromObject(fm)
      const pivot = new Group()
      pivot.position.set(0, (bb.min.y + bb.max.y) / 2, bb.max.z)
      holder.add(pivot)
      pivot.updateMatrixWorld(true)
      pivot.attach(fm)
      flapPivot = pivot
      wingZ = (bb.min.z + bb.max.z) / 2
      wingY = (bb.min.y + bb.max.y) / 2
    }

    // Carte de hauteurs pour les flux d'air (à partir de la géométrie réelle)
    holder.updateMatrixWorld(true)
    const all: number[] = []
    holder.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const pos = m.geometry.getAttribute('position')
      const v = new Vector3()
      const step = Math.max(1, Math.floor(pos.count / 20000))
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
        all.push(v.x, v.y, v.z)
      }
    })
    const field = buildHeightField(new Float32Array(all))

    const rig: Rig = { wheels, wingFlap: flapPivot, wingZ, wingY, field, headlights, taillights }
    return { scene: holder, rig }
  }, [gltf, paint, mats])

  // Masques Weissach
  useLayoutEffect(() => {
    WEISSACH_BOXES.forEach((bx, i) => {
      paint.u.uBoxMin.value[i].set(...bx.min)
      paint.u.uBoxMax.value[i].set(...bx.max)
    })
    paint.u.uBoxCount.value = WEISSACH_BOXES.length
  }, [paint])

  // Changement de teinte → balayage GLSL
  const wipe = useRef(1)
  useEffect(() => {
    const apply = (s: ReturnType<typeof useStore.getState>) => {
      const a = PAINTS.find((p) => p.id === s.prevPaint) ?? PAINTS[0]
      const bb = PAINTS.find((p) => p.id === s.paint) ?? PAINTS[0]
      paint.u.uColorA.value.set(a.hex).convertSRGBToLinear()
      paint.u.uColorB.value.set(bb.hex).convertSRGBToLinear()
      paint.u.uMetalA.value = a.metallic ? 1 : 0
      paint.u.uMetalB.value = bb.metallic ? 1 : 0
    }
    apply(useStore.getState())
    paint.u.uColorA.value.copy(paint.u.uColorB.value)
    return useStore.subscribe((s, prev) => {
      if (s.paint !== prev.paint) {
        // la teinte précédente devient la base, la nouvelle balaie la carrosserie
        const cur = paint.u.uWipe.value
        if (cur < 1) {
          const prevB = PAINTS.find((p) => p.id === prev.paint)
          if (prevB) paint.u.uColorA.value.set(prevB.hex).convertSRGBToLinear()
        }
        apply(s)
        wipe.current = 0
        paint.u.uWipe.value = 0
      }
    })
  }, [paint])

  const tmpColor = useMemo(() => new Color(), [])
  const spin = useRef(0)
  const yaw = useRef(0)
  const pitch = useRef(0)
  const prevZ = useRef(-12)

  useFrame((state, dt) => {
    const st = useStore.getState()
    const shot = shotAt(frame.scrollY)
    carUniforms.uTime.value = state.clock.elapsedTime

    // Transition de teinte
    if (wipe.current < 1) {
      wipe.current = Math.min(1, wipe.current + dt / (st.reducedMotion ? 0.2 : 1.35))
      paint.u.uWipe.value = wipe.current
    }
    damp(paint.u.uWeissach, 'value', st.weissach ? 1 : 0, 0.35, dt)

    // Arrivée (intro) : la voiture roule depuis l'obscurité et freine
    const t = frame.intro
    const e = 1 - Math.pow(1 - Math.min(1, t / 0.82), 3)
    const z = -13 * (1 - e)
    const v = (z - prevZ.current) / Math.max(dt, 1e-3)
    prevZ.current = z
    root.current.position.z = z
    // plongée au freinage puis rebond (amortie)
    const decel = t > 0.55 && t < 0.95 ? Math.sin(((t - 0.55) / 0.4) * Math.PI) : 0
    damp(pitch, 'current', decel * 0.012, 0.08, dt)
    root.current.rotation.x = pitch.current

    damp(yaw, 'current', shot.yaw, 0.4, dt)
    root.current.rotation.y = yaw.current
    root.current.updateMatrixWorld()
    carUniforms.uCarInv.value.copy(root.current.matrixWorld).invert()

    // Roues : rotation de l'intro + vitesse simulée (rayon ≈ 0,35 m)
    const sim = shot.speed * 38
    const w = (Math.abs(v) + sim) / 0.35
    spin.current += w * dt
    rig.wheels.forEach((p) => (p.rotation.x = spin.current))

    // Aileron : DRS (plat) / niveau d'appui / airbrake
    if (rig.wingFlap) {
      const target = st.aero === 'drs' ? -0.16 : st.aero === 'airbrake' ? 0.42 : st.aero === 'high' ? 0.2 : 0
      damp(rig.wingFlap.rotation, 'x', target, st.aero === 'airbrake' ? 0.12 : 0.3, dt)
    }

    // Feux : allumage pendant l'intro, extinction partielle hors scène
    const head = Math.min(1, Math.max(0, (t - 0.35) * 3)) * (0.6 + shot.rim * 0.4)
    mats.head.emissiveIntensity = head * 6
    mats.tail.emissiveIntensity = Math.min(1, t * 2) * 3.5
    tmpColor.set('#ff1010')
  })

  return (
    <group ref={root}>
      <primitive object={scene} />
      <Airflow field={rig.field} wingZ={rig.wingZ} wingY={rig.wingY} />
      <Hotspots />
    </group>
  )
}
